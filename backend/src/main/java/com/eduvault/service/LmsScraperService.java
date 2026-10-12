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
    private static final Pattern COURSE_CODE_PATTERN = Pattern.compile("(?i)\\b([0-9]{2}[A-Z]{2,4}[0-9]{3}[A-Z]?)\\b");
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
        logger.info("Starting LMS Sync for user: {}", credentials.getUsername());
        LmsSession session = login(credentials.getUsername(), credentials.getPassword());

        List<LmsSyncResponse.DiscoveredCourseInfo> discovered = fetchDiscoveredCourses(session);
        List<Subject> allSubjects = database.getAllSubjects();

        List<LmsSyncResponse.CourseSyncSummary> courseSummaries = new ArrayList<>();
        List<String> unmatchedCourses = new ArrayList<>();
        List<String> errors = new ArrayList<>();

        int totalMaterialsFound = 0;
        int totalImported = 0;
        int totalSkipped = 0;
        int totalFailed = 0;

        // Filter courses if testImport or specific courseIds requested
        List<LmsSyncResponse.DiscoveredCourseInfo> coursesToProcess = new ArrayList<>();
        if (credentials.getCourseIds() != null && !credentials.getCourseIds().isEmpty()) {
            for (LmsSyncResponse.DiscoveredCourseInfo c : discovered) {
                if (credentials.getCourseIds().contains(c.getId())) {
                    coursesToProcess.add(c);
                }
            }
        } else if (credentials.isTestImport()) {
            // Pick first matched course, or first course
            LmsSyncResponse.DiscoveredCourseInfo candidate = null;
            for (LmsSyncResponse.DiscoveredCourseInfo c : discovered) {
                if (c.isMatched()) {
                    candidate = c;
                    break;
                }
            }
            if (candidate == null && !discovered.isEmpty()) {
                candidate = discovered.get(0);
            }
            if (candidate != null) {
                coursesToProcess.add(candidate);
            }
        } else {
            coursesToProcess = discovered;
        }

        int matchedCount = 0;
        int unmatchedCount = 0;

        for (LmsSyncResponse.DiscoveredCourseInfo courseInfo : coursesToProcess) {
            Subject matchedSubject = matchSubject(courseInfo.getCode(), courseInfo.getFullname(), allSubjects);

            if (matchedSubject == null) {
                unmatchedCount++;
                unmatchedCourses.add(courseInfo.getFullname() + " (" + courseInfo.getCode() + ")");
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
            // If subject has no code, update it with course code
            if (matchedSubject.getCode() == null || matchedSubject.getCode().isEmpty()) {
                matchedSubject.setCode(courseInfo.getCode());
                database.updateSubject(matchedSubject);
            }

            try {
                // Scrape course materials
                CourseScrapeResult scrapeResult = scrapeAndImportCourse(session, courseInfo, matchedSubject);
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

            // Polite sleep between courses
            sleep(300);
        }

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
                                                    Subject subject) throws Exception {
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

        for (Element secEl : sectionEls) {
            Element nameEl = secEl.selectFirst("h3.sectionname, .section-title, .sectionname");
            String sectionTitle = nameEl != null ? nameEl.text().trim() : "General";

            String category = determineCategory(sectionTitle);
            String unit = determineUnit(sectionTitle);

            Elements activities = secEl.select("li.activity");
            for (Element actEl : activities) {
                Element linkEl = actEl.selectFirst("a[href]");
                if (linkEl == null) continue;

                String href = linkEl.attr("href");
                String moodleId = extractMoodleId(href);

                // Clean activity title
                Element instanceEl = actEl.selectFirst(".instancename");
                String rawTitle = instanceEl != null ? instanceEl.text() : linkEl.text();
                String title = cleanActivityTitle(rawTitle);

                result.materialsFound++;

                // Prevent duplicate import
                if (moodleId != null && database.existsNoteByMoodleId(moodleId)) {
                    result.skippedCount++;
                    continue;
                }

                try {
                    boolean imported = importActivity(session, href, moodleId, title, category, unit, subject, courseInfo.getCode());
                    if (imported) {
                        result.importedCount++;
                    } else {
                        result.skippedCount++;
                    }
                } catch (Exception e) {
                    logger.warn("Failed importing activity '{}' ({}): {}", title, href, e.getMessage());
                    result.failureCount++;
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
                                    String courseCode) throws Exception {

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

            // Determine original filename
            String filename = extractFilenameFromResponse(fileResp, targetUrl, title);

            // Store file locally and upload to B2
            String savedFileName = fileStorageService.storeFile(bytes, filename);
            backblazeStorageService.uploadBytes(bytes, savedFileName);

            // Extract text for AI
            String extractedText = fileStorageService.extractTextFromBytes(bytes, filename);

            // Create Note
            Note note = Note.builder()
                    .id(UUID.randomUUID().toString())
                    .title(title)
                    .subjectId(subject.getId())
                    .department(subject.getDepartment() != null ? subject.getDepartment() : "General")
                    .semester(subject.getSemester() != null ? subject.getSemester() : "Current")
                    .unit(unit)
                    .category(category)
                    .examType(category.equalsIgnoreCase("Question Papers") ? "end-sem" : "mid-sem")
                    .fileUrl(savedFileName)
                    .uploadedBy("LMS Sync (" + session.username + ")")
                    .createdAt(LocalDate.now().format(DateTimeFormatter.ISO_DATE))
                    .status("ready")
                    .moodleId(moodleId)
                    .sourceUrl(targetUrl)
                    .extractedText(extractedText)
                    .tags(List.of("LMS", courseCode, category, unit))
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

            logger.info("Successfully imported note: {} [{}] for subject: {}", title, unit, subject.getName());
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
                Note note = Note.builder()
                        .id(UUID.randomUUID().toString())
                        .title(title)
                        .subjectId(subject.getId())
                        .department(subject.getDepartment() != null ? subject.getDepartment() : "General")
                        .semester(subject.getSemester() != null ? subject.getSemester() : "Current")
                        .unit(unit)
                        .category(category)
                        .examType("mid-sem")
                        .fileUrl(externalLink)
                        .uploadedBy("LMS Sync (" + session.username + ")")
                        .createdAt(LocalDate.now().format(DateTimeFormatter.ISO_DATE))
                        .status("ready")
                        .moodleId(moodleId)
                        .sourceUrl(externalLink)
                        .extractedText("Web Resource Link: " + externalLink)
                        .tags(List.of("LMS", "Web Resource", courseCode, category, unit))
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
     */
    private Subject matchSubject(String courseCode, String courseFullname, List<Subject> subjects) {
        if (subjects == null || subjects.isEmpty()) return null;

        // 1. Exact code match
        if (courseCode != null && !courseCode.isEmpty()) {
            for (Subject s : subjects) {
                if (s.getCode() != null && s.getCode().equalsIgnoreCase(courseCode)) {
                    return s;
                }
                if (s.getName() != null && s.getName().toUpperCase().contains(courseCode)) {
                    return s;
                }
            }
        }

        // 2. Name matching
        String cleanCourse = courseFullname.replaceAll("(?i)\\([0-9A-Z]+\\)|[0-9]{2}[A-Z]{2,4}[0-9]{3}[A-Z]?|[-_:]", " ")
                .replaceAll("\\s+", " ").trim().toLowerCase();

        // Exact match
        for (Subject s : subjects) {
            if (s.getName() == null) continue;
            String cleanSubject = s.getName().trim().toLowerCase();
            if (cleanCourse.equals(cleanSubject)) {
                return s;
            }
        }

        // Substring / keyword match
        for (Subject s : subjects) {
            if (s.getName() == null) continue;
            String cleanSubject = s.getName().trim().toLowerCase();
            // Don't match "Lab" subjects with lecture courses unless course also has "lab"
            boolean subIsLab = cleanSubject.contains("lab");
            boolean courseIsLab = cleanCourse.contains("lab");
            if (subIsLab != courseIsLab) {
                continue;
            }

            if (cleanCourse.contains(cleanSubject) || cleanSubject.contains(cleanCourse)) {
                return s;
            }
        }

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
