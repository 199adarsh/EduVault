package com.eduvault.service;

import com.eduvault.model.*;
import com.eduvault.repository.LocalJsonDatabase;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.*;
import java.net.http.*;
import java.net.http.HttpClient.Redirect;
import java.net.http.HttpClient.Version;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class LmsScraperService {

    private static final Logger logger = LoggerFactory.getLogger(LmsScraperService.class);

    private static final String BASE_URL = "http://150.129.156.169";
    private static final String LOGIN_URL = BASE_URL + "/login/index.php";
    private static final String COURSES_URL = BASE_URL + "/my/courses.php";
    private static final String AJAX_SERVICE_URL = BASE_URL + "/lib/ajax/service.php";

    private static final Duration TIMEOUT = Duration.ofSeconds(30);
    private static final Pattern COURSE_CODE_PATTERN = Pattern.compile("(?i)\\b([0-9]{2}[A-Z]{2,6}[0-9]{3,4}[A-Z]?)\\b");
    private static final Pattern SESSKEY_PATTERN = Pattern.compile("\"sesskey\":\"([^\"]+)\"");
    private static final Pattern ID_PARAM_PATTERN = Pattern.compile("id=(\\d+)");

    @Autowired
    private LocalJsonDatabase database;

    @Autowired
    private FileStorageService fileStorageService;

    @Autowired
    private BackblazeStorageService backblazeStorageService;

    @Autowired
    private ObjectMapper objectMapper;

    private final Map<String, LmsProgress> progressMap = new java.util.concurrent.ConcurrentHashMap<>();

    public LmsProgress getProgress(String username) {
        if (username == null) return null;
        return progressMap.getOrDefault(username.trim().toLowerCase(),
                LmsProgress.builder().status("IDLE").currentStage("Ready to sync").percent(0).logs(List.of()).build());
    }

    private void updateProgress(String username, String status, String stage, String course, int courseIdx, int totalCourses,
                                String material, int found, int imported, int skipped, int failed, int percent, String logLine) {
        if (username == null) return;
        String key = username.trim().toLowerCase();
        LmsProgress prev = progressMap.get(key);
        List<String> logs = (prev != null && prev.getLogs() != null) ? new ArrayList<>(prev.getLogs()) : new ArrayList<>();
        if (logLine != null && !logLine.isBlank()) {
            logs.add("[" + java.time.LocalTime.now().format(DateTimeFormatter.ofPattern("HH:mm:ss")) + "] " + logLine);
            if (logs.size() > 40) logs.remove(0);
        }
        LmsProgress p = LmsProgress.builder()
                .status(status)
                .currentStage(stage)
                .currentCourse(course)
                .currentCourseIndex(courseIdx)
                .totalCourses(totalCourses)
                .currentMaterial(material)
                .materialsFound(found)
                .importedCount(imported)
                .skippedCount(skipped)
                .failureCount(failed)
                .percent(Math.min(100, Math.max(0, percent)))
                .logs(logs)
                .build();
        progressMap.put(key, p);
    }

    /**
     * Session wrapper holding client and cookie manager
     */
    private static class LmsSession {
        HttpClient client;
        CookieManager cookieManager;
        String sesskey;
        String username;
    }

    /**
     * Authenticates with Moodle and returns an active session
     */
    private LmsSession login(String username, String password) throws Exception {
        CookieManager cookieManager = new CookieManager(null, CookiePolicy.ACCEPT_ALL);
        HttpClient client = HttpClient.newBuilder()
                .version(Version.HTTP_1_1)
                .followRedirects(Redirect.NORMAL)
                .connectTimeout(TIMEOUT)
                .cookieHandler(cookieManager)
                .build();

        // 1. Fetch login page for CSRF logintoken
        HttpRequest getLoginReq = HttpRequest.newBuilder()
                .uri(URI.create(LOGIN_URL))
                .timeout(TIMEOUT)
                .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
                .GET()
                .build();

        HttpResponse<String> loginPageResp = client.send(getLoginReq, HttpResponse.BodyHandlers.ofString());
        Document doc = Jsoup.parse(loginPageResp.body());
        Element tokenEl = doc.selectFirst("input[name=logintoken]");
        if (tokenEl == null) {
            throw new RuntimeException("Could not extract logintoken from LMS login page.");
        }
        String logintoken = tokenEl.val();

        // 2. Submit credentials
        String postData = "anchor="
                + "&logintoken=" + URLEncoder.encode(logintoken, StandardCharsets.UTF_8)
                + "&username=" + URLEncoder.encode(username, StandardCharsets.UTF_8)
                + "&password=" + URLEncoder.encode(password, StandardCharsets.UTF_8);

        HttpRequest postLoginReq = HttpRequest.newBuilder()
                .uri(URI.create(LOGIN_URL))
                .timeout(TIMEOUT)
                .header("Content-Type", "application/x-www-form-urlencoded")
                .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
                .header("Referer", LOGIN_URL)
                .POST(HttpRequest.BodyPublishers.ofString(postData))
                .build();

        HttpResponse<String> postResp = client.send(postLoginReq, HttpResponse.BodyHandlers.ofString());
        String postBody = postResp.body();
        if (postBody.contains("Invalid login") || postBody.contains("invalid login") || postBody.contains("login/index.php?errorcode=")) {
            throw new RuntimeException("Invalid LMS credentials. Please verify username and password.");
        }

        // 3. Fetch courses page to retrieve sesskey
        HttpRequest getCoursesReq = HttpRequest.newBuilder()
                .uri(URI.create(COURSES_URL))
                .timeout(TIMEOUT)
                .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
                .GET()
                .build();

        HttpResponse<String> coursesResp = client.send(getCoursesReq, HttpResponse.BodyHandlers.ofString());
        Matcher m = SESSKEY_PATTERN.matcher(coursesResp.body());
        String sesskey = "";
        if (m.find()) {
            sesskey = m.group(1);
        } else {
            // Fallback search
            Matcher m2 = Pattern.compile("sesskey=([a-zA-Z0-9]+)").matcher(coursesResp.body());
            if (m2.find()) {
                sesskey = m2.group(1);
            }
        }

        if (sesskey.isEmpty()) {
            throw new RuntimeException("Failed to extract Moodle sesskey after login.");
        }

        LmsSession session = new LmsSession();
        session.client = client;
        session.cookieManager = cookieManager;
        session.sesskey = sesskey;
        session.username = username;
        return session;
    }

    /**
     * Discovers all courses available to the authorized LMS account
     */
    public List<LmsSyncResponse.DiscoveredCourseInfo> discoverCourses(String username, String password) throws Exception {
        LmsSession session = login(username, password);
        return fetchDiscoveredCourses(session);
    }

    private List<LmsSyncResponse.DiscoveredCourseInfo> fetchDiscoveredCourses(LmsSession session) throws Exception {
        String ajaxUrl = AJAX_SERVICE_URL + "?sesskey=" + session.sesskey + "&info=core_course_get_enrolled_courses_by_timeline_classification";
        String payload = "[{\"index\":0,\"methodname\":\"core_course_get_enrolled_courses_by_timeline_classification\",\"args\":{\"offset\":0,\"limit\":0,\"classification\":\"all\",\"sort\":\"fullname\"}}]";

        HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(ajaxUrl))
                .timeout(TIMEOUT)
                .header("Content-Type", "application/json")
                .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
                .POST(HttpRequest.BodyPublishers.ofString(payload))
                .build();

        HttpResponse<String> resp = session.client.send(req, HttpResponse.BodyHandlers.ofString());
        JsonNode root = objectMapper.readTree(resp.body());

        List<LmsSyncResponse.DiscoveredCourseInfo> result = new ArrayList<>();
        if (!root.isArray() || root.isEmpty()) {
            return result;
        }

        JsonNode coursesNode = root.get(0).path("data").path("courses");
        if (!coursesNode.isArray()) {
            return result;
        }

        List<Subject> existingSubjects = database.getAllSubjects();

        for (JsonNode cNode : coursesNode) {
            String id = cNode.path("id").asText();
            String fullname = cNode.path("fullname").asText();
            String shortname = cNode.path("shortname").asText();
            String viewurl = cNode.path("viewurl").asText(BASE_URL + "/course/view.php?id=" + id);

            String courseCode = extractCourseCode(fullname, shortname);
            Subject matchedSubject = matchSubject(courseCode, fullname, existingSubjects);

            result.add(LmsSyncResponse.DiscoveredCourseInfo.builder()
                    .id(id)
                    .code(courseCode)
                    .fullname(fullname)
                    .shortname(shortname)
                    .viewurl(viewurl)
                    .matched(matchedSubject != null)
                    .matchedSubjectName(matchedSubject != null ? matchedSubject.getName() : null)
                    .matchedSubjectId(matchedSubject != null ? matchedSubject.getId() : null)
                    .build());
        }

        return result;
    }

    /**
     * Executes the complete LMS sync pipeline
     */
    public LmsSyncResponse syncNotes(LmsCredentials credentials) throws Exception {
        String username = credentials.getUsername() != null ? credentials.getUsername().trim() : "anonymous";
        logger.info("Starting LMS notes synchronization for user: {}", username);
        updateProgress(username, "AUTHENTICATING", "Connecting to Moodle LMS portal...", null, 0, 0, null, 0, 0, 0, 0, 5, "Connecting to portal at " + BASE_URL);

        LmsSession session;
        try {
            session = login(credentials.getUsername(), credentials.getPassword());
            updateProgress(username, "AUTHENTICATED", "Logged in as " + session.username + ". Fetching courses...", null, 0, 0, null, 0, 0, 0, 0, 15, "Session established for user: " + session.username);
        } catch (Exception e) {
            updateProgress(username, "FAILED", "Login failed: " + e.getMessage(), null, 0, 0, null, 0, 0, 0, 0, 100, "Authentication error: " + e.getMessage());
            throw e;
        }

        List<LmsSyncResponse.DiscoveredCourseInfo> discovered = fetchDiscoveredCourses(session);
        List<Subject> allSubjects = database.getAllSubjects();

        List<LmsSyncResponse.CourseSyncSummary> courseSummaries = new ArrayList<>();
        List<String> unmatchedCourses = new ArrayList<>();
        List<String> errors = new ArrayList<>();

        int totalMaterialsFound = 0;
        int totalImported = 0;
        int totalSkipped = 0;
        int totalFailed = 0;

        String batchId = "batch-" + UUID.randomUUID().toString().substring(0, 8);
        int maxImportLimit = credentials.isTestImport() ? 15 : Integer.MAX_VALUE;

        // Filter courses if testImport or specific courseIds requested
        List<LmsSyncResponse.DiscoveredCourseInfo> coursesToProcess = new ArrayList<>();
        if (credentials.getCourseIds() != null && !credentials.getCourseIds().isEmpty()) {
            for (LmsSyncResponse.DiscoveredCourseInfo c : discovered) {
                if (credentials.getCourseIds().contains(c.getId())) {
                    coursesToProcess.add(c);
                }
            }
        } else if (credentials.isTestImport()) {
            int addedMatched = 0;
            for (LmsSyncResponse.DiscoveredCourseInfo c : discovered) {
                if (c.isMatched()) {
                    coursesToProcess.add(c);
                    addedMatched++;
                    if (addedMatched >= 2) break;
                }
            }
            for (LmsSyncResponse.DiscoveredCourseInfo c : discovered) {
                if (!c.isMatched()) {
                    coursesToProcess.add(c);
                    break;
                }
            }
            if (coursesToProcess.isEmpty() && !discovered.isEmpty()) {
                coursesToProcess.add(discovered.get(0));
            }
        } else {
            coursesToProcess = discovered;
        }

        int totalToProcess = coursesToProcess.size();
        int matchedCount = 0;
        int unmatchedCount = 0;
        int courseIdx = 0;

        updateProgress(username, "DISCOVERED", "Discovered " + discovered.size() + " courses (" + totalToProcess + " selected for ingestion)", null, 0, totalToProcess, null, 0, 0, 0, 0, 20, "Identified " + discovered.size() + " courses. Beginning course processing...");

        for (LmsSyncResponse.DiscoveredCourseInfo courseInfo : coursesToProcess) {
            courseIdx++;
            int basePct = 20 + (int) (((double) (courseIdx - 1) / Math.max(1, totalToProcess)) * 75);

            Subject matchedSubject = matchSubject(courseInfo.getCode(), courseInfo.getFullname(), allSubjects);

            if (matchedSubject == null) {
                unmatchedCount++;
                unmatchedCourses.add(courseInfo.getFullname() + " (" + courseInfo.getCode() + ")");
                updateProgress(username, "SYNCING", "Skipping unmatched course: " + courseInfo.getFullname(),
                        courseInfo.getFullname(), courseIdx, totalToProcess, null,
                        totalMaterialsFound, totalImported, totalSkipped, totalFailed, basePct,
                        "Skipping course (no curriculum match): " + courseInfo.getFullname());

                courseSummaries.add(LmsSyncResponse.CourseSyncSummary.builder()
                        .courseId(courseInfo.getId())
                        .courseCode(courseInfo.getCode())
                        .courseName(courseInfo.getFullname())
                        .matched(false)
                        .status("UNMATCHED")
                        .message("No matching subject in current EduVault subjects")
                        .build());
                continue;
            }

            matchedCount++;
            if (matchedSubject.getCode() == null || matchedSubject.getCode().isEmpty()) {
                matchedSubject.setCode(courseInfo.getCode());
                database.updateSubject(matchedSubject);
            }

            updateProgress(username, "SYNCING", "Processing course " + courseIdx + "/" + totalToProcess + ": " + courseInfo.getFullname(),
                    courseInfo.getFullname(), courseIdx, totalToProcess, null,
                    totalMaterialsFound, totalImported, totalSkipped, totalFailed, basePct,
                    "Course matched -> " + matchedSubject.getName() + " (" + courseInfo.getCode() + ")");

            try {
                int remainingCap = maxImportLimit - totalImported;
                if (remainingCap <= 0 && credentials.isTestImport()) {
                    logger.info("Test import limit reached ({} notes). Skipping further courses.", totalImported);
                    updateProgress(username, "SYNCING", "Test import limit reached (" + totalImported + " notes)",
                            courseInfo.getFullname(), courseIdx, totalToProcess, null,
                            totalMaterialsFound, totalImported, totalSkipped, totalFailed, 95,
                            "Test import cap reached. Finalizing...");
                    break;
                }

                CourseScrapeResult scrapeResult = scrapeAndImportCourse(session, courseInfo, matchedSubject, batchId,
                        remainingCap, username, courseIdx, totalToProcess, totalMaterialsFound, totalImported, totalSkipped, totalFailed);
                totalMaterialsFound += scrapeResult.materialsFound;
                totalImported += scrapeResult.importedCount;
                totalSkipped += scrapeResult.skippedCount;
                totalFailed += scrapeResult.failureCount;

                courseSummaries.add(LmsSyncResponse.CourseSyncSummary.builder()
                        .courseId(courseInfo.getId())
                        .courseCode(courseInfo.getCode())
                        .courseName(courseInfo.getFullname())
                        .subjectId(matchedSubject.getId())
                        .subjectName(matchedSubject.getName())
                        .matched(true)
                        .materialsFound(scrapeResult.materialsFound)
                        .importedCount(scrapeResult.importedCount)
                        .skippedCount(scrapeResult.skippedCount)
                        .failureCount(scrapeResult.failureCount)
                        .status("SUCCESS")
                        .message("Imported: " + scrapeResult.importedCount + ", Skipped: " + scrapeResult.skippedCount)
                        .build());

            } catch (Exception ex) {
                logger.error("Error scraping course {}: {}", courseInfo.getFullname(), ex.getMessage(), ex);
                errors.add("Course " + courseInfo.getFullname() + ": " + ex.getMessage());
                totalFailed++;
                updateProgress(username, "SYNCING", "Error in " + courseInfo.getFullname() + ": " + ex.getMessage(),
                        courseInfo.getFullname(), courseIdx, totalToProcess, null,
                        totalMaterialsFound, totalImported, totalSkipped, totalFailed, basePct,
                        "Error processing " + courseInfo.getFullname() + ": " + ex.getMessage());

                courseSummaries.add(LmsSyncResponse.CourseSyncSummary.builder()
                        .courseId(courseInfo.getId())
                        .courseCode(courseInfo.getCode())
                        .courseName(courseInfo.getFullname())
                        .subjectId(matchedSubject.getId())
                        .subjectName(matchedSubject.getName())
                        .matched(true)
                        .status("FAILED")
                        .message(ex.getMessage())
                        .build());
            }

            sleep(300);
        }

        updateProgress(username, "COMPLETED", "Synchronization Complete!", null, totalToProcess, totalToProcess, null,
                totalMaterialsFound, totalImported, totalSkipped, totalFailed, 100,
                "Ingestion complete: " + totalImported + " imported, " + totalSkipped + " duplicates skipped.");

        return LmsSyncResponse.builder()
                .totalDiscoveredCourses(discovered.size())
                .matchedCoursesCount(matchedCount)
                .unmatchedCoursesCount(unmatchedCount)
                .totalMaterialsFound(totalMaterialsFound)
                .importedCount(totalImported)
                .skippedDuplicatesCount(totalSkipped)
                .failureCount(totalFailed)
                .courses(courseSummaries)
                .allDiscoveredCourses(discovered)
                .unmatchedCourses(unmatchedCourses)
                .errors(errors)
                .build();
    }

    private static class CourseScrapeResult {
        int materialsFound = 0;
        int importedCount = 0;
        int skippedCount = 0;
        int failureCount = 0;
    }

    /**
     * Scrapes all sections and materials of a specific course and imports them
     */
    private CourseScrapeResult scrapeAndImportCourse(LmsSession session,
                                                    LmsSyncResponse.DiscoveredCourseInfo courseInfo,
                                                    Subject subject,
                                                    String batchId,
                                                    int remainingLimit,
                                                    String username,
                                                    int courseIdx,
                                                    int totalCourses,
                                                    int initialFound,
                                                    int initialImported,
                                                    int initialSkipped,
                                                    int initialFailed) throws Exception {
        CourseScrapeResult result = new CourseScrapeResult();
        String courseUrl = BASE_URL + "/course/view.php?id=" + courseInfo.getId();

        HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(courseUrl))
                .timeout(TIMEOUT)
                .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
                .GET()
                .build();

        HttpResponse<String> resp = session.client.send(req, HttpResponse.BodyHandlers.ofString());
        Document doc = Jsoup.parse(resp.body());

        Elements sectionEls = doc.select("li.section");
        if (sectionEls.isEmpty()) {
            sectionEls = doc.select(".section");
        }

        int totalActivities = doc.select("li.activity").size();
        int activityCounter = 0;

        for (Element secEl : sectionEls) {
            Element nameEl = secEl.selectFirst("h3.sectionname, .section-title, .sectionname");
            String sectionTitle = nameEl != null ? nameEl.text().trim() : "General";

            String category = determineCategory(sectionTitle);
            String unit = determineUnit(sectionTitle);

            Elements activities = secEl.select("li.activity");
            for (Element actEl : activities) {
                activityCounter++;
                if (result.importedCount >= remainingLimit) {
                    return result;
                }

                Element linkEl = actEl.selectFirst("a[href]");
                if (linkEl == null) continue;

                String href = linkEl.attr("href");
                String moodleId = extractMoodleId(href);

                // Clean activity title
                Element instanceEl = actEl.selectFirst(".instancename");
                String rawTitle = instanceEl != null ? instanceEl.text() : linkEl.text();
                String title = cleanActivityTitle(rawTitle);

                result.materialsFound++;

                String targetUrl = href.startsWith("/") ? BASE_URL + href : href;

                int currentPct = 20 + (int) (((double) (courseIdx - 1) / Math.max(1, totalCourses)) * 75)
                        + (int) (((double) activityCounter / Math.max(1, totalActivities)) * (75.0 / Math.max(1, totalCourses)));

                // Prevent duplicate import (idempotent / resumable)
                if (moodleId != null && database.existsNoteByMoodleId(moodleId)) {
                    result.skippedCount++;
                    updateProgress(username, "SYNCING", "Duplicate skipped: " + title,
                            courseInfo.getFullname(), courseIdx, totalCourses, title,
                            initialFound + result.materialsFound, initialImported + result.importedCount,
                            initialSkipped + result.skippedCount, initialFailed + result.failureCount,
                            currentPct, "Skipped duplicate: " + title);
                    continue;
                }
                if (database.existsNoteBySourceUrl(targetUrl)) {
                    result.skippedCount++;
                    updateProgress(username, "SYNCING", "Duplicate skipped: " + title,
                            courseInfo.getFullname(), courseIdx, totalCourses, title,
                            initialFound + result.materialsFound, initialImported + result.importedCount,
                            initialSkipped + result.skippedCount, initialFailed + result.failureCount,
                            currentPct, "Skipped duplicate: " + title);
                    continue;
                }

                updateProgress(username, "SYNCING", "Ingesting: " + title,
                        courseInfo.getFullname(), courseIdx, totalCourses, title,
                        initialFound + result.materialsFound, initialImported + result.importedCount,
                        initialSkipped + result.skippedCount, initialFailed + result.failureCount,
                        currentPct, "Downloading material: " + title);

                try {
                    boolean imported = importActivity(session, href, moodleId, title, category, unit, subject, courseInfo.getCode(), batchId);
                    if (imported) {
                        result.importedCount++;
                        updateProgress(username, "SYNCING", "Saved to B2: " + title,
                                courseInfo.getFullname(), courseIdx, totalCourses, title,
                                initialFound + result.materialsFound, initialImported + result.importedCount,
                                initialSkipped + result.skippedCount, initialFailed + result.failureCount,
                                currentPct, "Saved to B2 & DB: " + title);
                    } else {
                        result.skippedCount++;
                    }
                } catch (Exception e) {
                    logger.warn("Failed importing activity '{}' ({}): {}", title, href, e.getMessage());
                    result.failureCount++;
                    updateProgress(username, "SYNCING", "Failed to ingest: " + title,
                            courseInfo.getFullname(), courseIdx, totalCourses, title,
                            initialFound + result.materialsFound, initialImported + result.importedCount,
                            initialSkipped + result.skippedCount, initialFailed + result.failureCount,
                            currentPct, "Failed: " + title + " (" + e.getMessage() + ")");
                }

                sleep(200);
            }
        }

        return result;
    }

    /**
     * Downloads resource / file or extracts external URL, stores it, and creates Note record
     */
    private boolean importActivity(LmsSession session,
                                    String href,
                                    String moodleId,
                                    String title,
                                    String category,
                                    String unit,
                                    Subject subject,
                                    String courseCode,
                                    String batchId) throws Exception {

        String targetUrl = href.startsWith("/") ? BASE_URL + href : href;

        if (targetUrl.contains("/mod/resource/view.php") || targetUrl.contains("/pluginfile.php")) {
            // Download the file
            HttpRequest fileReq = HttpRequest.newBuilder()
                    .uri(URI.create(targetUrl))
                    .timeout(TIMEOUT)
                    .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
                    .GET()
                    .build();

            HttpResponse<byte[]> fileResp = session.client.send(fileReq, HttpResponse.BodyHandlers.ofByteArray());
            if (fileResp.statusCode() != 200) {
                logger.warn("Non-200 status code {} when downloading resource {}", fileResp.statusCode(), targetUrl);
                return false;
            }

            byte[] bytes = fileResp.body();
            if (bytes == null || bytes.length == 0) {
                return false;
            }

            // Handle Moodle HTML wrapper pages that embed the actual file
            String respContentType = fileResp.headers().firstValue("Content-Type").orElse("");
            if (respContentType.toLowerCase().contains("text/html")) {
                String html = new String(bytes, StandardCharsets.UTF_8);
                Document doc = Jsoup.parse(html);
                Element link = doc.selectFirst(".resourceworkaround a, .resourcecontent a, object[data], iframe[src], a[href*='pluginfile.php']");
                String realFileUrl = null;
                if (link != null) {
                    realFileUrl = link.hasAttr("href") ? link.attr("href") : (link.hasAttr("data") ? link.attr("data") : link.attr("src"));
                }
                if (realFileUrl != null && !realFileUrl.isBlank()) {
                    if (realFileUrl.startsWith("/")) realFileUrl = BASE_URL + realFileUrl;
                    HttpRequest realReq = HttpRequest.newBuilder()
                            .uri(URI.create(realFileUrl))
                            .timeout(TIMEOUT)
                            .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
                            .GET()
                            .build();
                    HttpResponse<byte[]> realResp = session.client.send(realReq, HttpResponse.BodyHandlers.ofByteArray());
                    if (realResp.statusCode() == 200 && realResp.body() != null && realResp.body().length > 0) {
                        bytes = realResp.body();
                        fileResp = realResp;
                        targetUrl = realFileUrl;
                    }
                }
            }

            // Determine original filename
            String filename = extractFilenameFromResponse(fileResp, targetUrl, title);

            // Store file locally and upload to B2
            String savedFileName = fileStorageService.storeFile(bytes, filename);
            String b2Key = backblazeStorageService.uploadBytes(bytes, savedFileName);
            if (b2Key == null) {
                b2Key = savedFileName;
            }

            // Extract text for AI
            String extractedText = fileStorageService.extractTextFromBytes(bytes, filename);

            List<String> tags = new ArrayList<>();
            tags.add("LMS");
            if (courseCode != null && !courseCode.isBlank()) tags.add(courseCode);
            if (category != null && !category.isBlank()) tags.add(category);
            if (unit != null && !unit.isBlank()) tags.add(unit);

            // Create Note with full metadata
            Note note = Note.builder()
                    .id(UUID.randomUUID().toString())
                    .title(title)
                    .originalFilename(filename)
                    .subjectId(subject.getId())
                    .department(subject.getDepartment() != null ? subject.getDepartment() : "General")
                    .semester(subject.getSemester() != null ? subject.getSemester() : "Current")
                    .unit(unit)
                    .category(category)
                    .examType(category.equalsIgnoreCase("Question Papers") ? "end-sem" : "mid-sem")
                    .fileUrl(savedFileName)
                    .b2ObjectKey(b2Key)
                    .uploadedBy("LMS Sync (" + session.username + ")")
                    .createdAt(LocalDate.now().format(DateTimeFormatter.ISO_DATE))
                    .status("ready")
                    .moodleId(moodleId)
                    .sourceUrl(targetUrl)
                    .importBatchId(batchId)
                    .extractedText(extractedText)
                    .tags(tags)
                    .build();

            database.addNote(note);

            // If Question Papers, also insert into PYQ table
            if (category.equalsIgnoreCase("Question Papers")) {
                try {
                    PYQ pyq = PYQ.builder()
                            .id(UUID.randomUUID().toString())
                            .subjectId(subject.getId())
                            .subjectName(subject.getName())
                            .year(String.valueOf(LocalDate.now().getYear()))
                            .examType("ESE")
                            .tags("LMS, Question Paper, " + title)
                            .fileUrl(savedFileName)
                            .uploadedBy("LMS Sync (" + session.username + ")")
                            .createdAt(LocalDate.now().format(DateTimeFormatter.ISO_DATE))
                            .build();
                    database.addPyq(pyq);
                } catch (Exception ex) {
                    logger.warn("Could not mirror PYQ: {}", ex.getMessage());
                }
            }

            logger.info("Successfully imported note: {} [{}] (originalFilename: {}) for subject: {}", title, unit, filename, subject.getName());
            return true;

        } else if (targetUrl.contains("/mod/url/view.php")) {
            // External resource link
            HttpRequest pageReq = HttpRequest.newBuilder()
                    .uri(URI.create(targetUrl))
                    .timeout(TIMEOUT)
                    .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
                    .GET()
                    .build();

            HttpResponse<String> pageResp = session.client.send(pageReq, HttpResponse.BodyHandlers.ofString());
            Document pageDoc = Jsoup.parse(pageResp.body());

            String externalLink = null;
            Element linkWorkaround = pageDoc.selectFirst(".urlworkaround a");
            if (linkWorkaround != null) {
                externalLink = linkWorkaround.attr("href");
            } else {
                for (Element a : pageDoc.select("a[href]")) {
                    String h = a.attr("href");
                    if (h.startsWith("http") && !h.contains("150.129.156.169") && !h.contains("moodle")) {
                        externalLink = h;
                        break;
                    }
                }
            }

            if (externalLink != null && !externalLink.isEmpty()) {
                List<String> tags = new ArrayList<>();
                tags.add("LMS");
                tags.add("Web Resource");
                if (courseCode != null && !courseCode.isBlank()) tags.add(courseCode);
                if (category != null && !category.isBlank()) tags.add(category);
                if (unit != null && !unit.isBlank()) tags.add(unit);

                Note note = Note.builder()
                        .id(UUID.randomUUID().toString())
                        .title(title)
                        .originalFilename(title)
                        .subjectId(subject.getId())
                        .department(subject.getDepartment() != null ? subject.getDepartment() : "General")
                        .semester(subject.getSemester() != null ? subject.getSemester() : "Current")
                        .unit(unit)
                        .category(category)
                        .examType("mid-sem")
                        .fileUrl(externalLink)
                        .b2ObjectKey(null)
                        .uploadedBy("LMS Sync (" + session.username + ")")
                        .createdAt(LocalDate.now().format(DateTimeFormatter.ISO_DATE))
                        .status("ready")
                        .moodleId(moodleId)
                        .sourceUrl(externalLink)
                        .importBatchId(batchId)
                        .extractedText("Web Resource Link: " + externalLink)
                        .tags(tags)
                        .build();

                database.addNote(note);
                logger.info("Successfully imported web link note: {} -> {}", title, externalLink);
                return true;
            }
        }

        return false;
    }

    private String extractFilenameFromResponse(HttpResponse<byte[]> response, String fallbackUrl, String title) {
        Optional<String> contentDisp = response.headers().firstValue("Content-Disposition");
        if (contentDisp.isPresent()) {
            String val = contentDisp.get();
            Matcher m = Pattern.compile("filename=[\"']?([^\"';]+)[\"']?").matcher(val);
            if (m.find()) {
                return URLDecoder.decode(m.group(1).trim(), StandardCharsets.UTF_8);
            }
        }

        // Try final URL path
        URI uri = response.uri();
        if (uri != null) {
            String path = uri.getPath();
            if (path != null && path.contains("/")) {
                String segment = path.substring(path.lastIndexOf('/') + 1);
                if (segment.contains(".")) {
                    return URLDecoder.decode(segment, StandardCharsets.UTF_8);
                }
            }
        }

        // Fallback from title
        String clean = title.replaceAll("[^a-zA-Z0-9._-]", "_");
        return clean.endsWith(".pdf") ? clean : clean + ".pdf";
    }

    private String extractCourseCode(String fullname, String shortname) {
        String combined = (shortname != null ? shortname : "") + " " + (fullname != null ? fullname : "");
        Matcher m = COURSE_CODE_PATTERN.matcher(combined);
        if (m.find()) {
            return m.group(1).toUpperCase();
        }
        return shortname != null ? shortname.trim().toUpperCase() : "";
    }

    /**
     * Matches course code / name against existing EduVault subjects
     * Strictly follows:
     * 1. Match verified course codes first.
     * 2. Use exact names (respecting lab/lecture consistency).
     * 3. Prioritize longer names when needed (respecting lab/lecture consistency).
     * 4. Never force incorrect mappings.
     */
    Subject matchSubject(String courseCode, String courseFullname, List<Subject> subjects) {
        if (subjects == null || subjects.isEmpty()) return null;

        // 1. Match verified course codes first
        if (courseCode != null && !courseCode.isBlank()) {
            String cleanCode = courseCode.trim().toUpperCase();
            for (Subject s : subjects) {
                if (s.getCode() != null && s.getCode().trim().equalsIgnoreCase(cleanCode)) {
                    return s;
                }
            }
        }

        if (courseFullname == null || courseFullname.isBlank()) return null;

        String cleanCourse = courseFullname.replaceAll("(?i)\\([0-9A-Z]+\\)|[0-9]{2}[A-Z]{2,6}[0-9]{3,4}[A-Z]?|[0-9]{2}-[0-9]{2}|[-_:]", " ")
                .replaceAll("\\s+", " ").trim().toLowerCase();

        boolean courseIsLab = cleanCourse.contains("lab") || (courseCode != null && courseCode.toUpperCase().contains("P"));

        // 2. Exact match
        for (Subject s : subjects) {
            if (s.getName() == null) continue;
            String cleanSubject = s.getName().trim().toLowerCase();
            boolean subIsLab = cleanSubject.contains("lab") || (s.getCode() != null && s.getCode().toUpperCase().contains("P"));
            if (subIsLab != courseIsLab) continue;

            if (cleanCourse.equals(cleanSubject)) {
                return s;
            }
        }

        // 3. Substring match prioritizing longer names
        List<Subject> sortedByLength = subjects.stream()
                .filter(s -> s.getName() != null && !s.getName().isBlank())
                .sorted((a, b) -> Integer.compare(b.getName().trim().length(), a.getName().trim().length()))
                .toList();

        for (Subject s : sortedByLength) {
            String cleanSubject = s.getName().trim().toLowerCase();
            boolean subIsLab = cleanSubject.contains("lab") || (s.getCode() != null && s.getCode().toUpperCase().contains("P"));
            if (subIsLab != courseIsLab) continue;

            if (cleanCourse.contains(cleanSubject) || cleanSubject.contains(cleanCourse)) {
                return s;
            }
        }

        // Never force incorrect mappings
        return null;
    }

    private String extractMoodleId(String href) {
        if (href == null) return null;
        Matcher m = ID_PARAM_PATTERN.matcher(href);
        return m.find() ? m.group(1) : null;
    }

    private String cleanActivityTitle(String raw) {
        if (raw == null) return "Material";
        String s = raw.trim();
        // Remove trailing "File", "Virtual programming lab", "URL"
        if (s.endsWith("File")) s = s.substring(0, s.length() - 4).trim();
        if (s.endsWith("Virtual programming lab")) s = s.substring(0, s.length() - 24).trim();
        if (s.endsWith("URL")) s = s.substring(0, s.length() - 3).trim();
        if (s.endsWith("Forum")) s = s.substring(0, s.length() - 5).trim();
        return s.isEmpty() ? "Material" : s;
    }

    private String determineCategory(String sectionTitle) {
        String lower = sectionTitle.toLowerCase();
        if (lower.contains("syllabus")) return "Syllabus";
        if (lower.contains("lecture plan")) return "Lecture Plan";
        if (lower.contains("question paper") || lower.contains("see") || lower.contains("se-1") || lower.contains("se-2")) {
            return "Question Papers";
        }
        if (lower.contains("lab") || lower.contains("experiment")) return "Lab Manual";
        if (lower.contains("test") || lower.contains("evaluation") || lower.contains("quiz")) return "Tests & Quizzes";
        if (lower.contains("additional resources") || lower.contains("resource")) return "Additional Resources";
        return "Notes";
    }

    private String determineUnit(String sectionTitle) {
        String lower = sectionTitle.toLowerCase();
        if (lower.contains("unit 1") || lower.contains("unit-1") || lower.contains("unit 01")) return "UNIT 01";
        if (lower.contains("unit 2") || lower.contains("unit-2") || lower.contains("unit 02")) return "UNIT 02";
        if (lower.contains("unit 3") || lower.contains("unit-3") || lower.contains("unit 03")) return "UNIT 03";
        if (lower.contains("unit 4") || lower.contains("unit-4") || lower.contains("unit 04")) return "UNIT 04";
        if (lower.contains("unit 5") || lower.contains("unit-5") || lower.contains("unit 05")) return "UNIT 05";
        if (lower.contains("unit 6") || lower.contains("unit-6") || lower.contains("unit 06")) return "UNIT 06";
        if (lower.contains("syllabus") || lower.contains("lecture plan")) return "General";
        if (lower.contains("lab") || lower.contains("experiment")) return "Lab";
        if (lower.contains("question paper") || lower.contains("see") || lower.contains("se-1") || lower.contains("se-2")) return "PYQ";
        return "UNIT 01";
    }

    private void sleep(long ms) {
        try {
            Thread.sleep(ms);
        } catch (InterruptedException ignored) {}
    }
}
