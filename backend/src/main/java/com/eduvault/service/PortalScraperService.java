package com.eduvault.service;

import com.eduvault.model.DashboardSubject;
import com.eduvault.model.PortalDashboardResponse;
import com.eduvault.model.StudentProfile;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;

import java.io.IOException;
import java.net.*;
import java.net.http.*;
import java.net.http.HttpClient.Redirect;
import java.time.Duration;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.util.regex.*;

import org.springframework.stereotype.Service;

@Service
public class PortalScraperService {

    private static final Logger log = LoggerFactory.getLogger(PortalScraperService.class);

    // URLs
    private static final String BASE_URL      = "https://online.dkte.contineo.in:8081/parents/";
    private static final String LOGIN_URL     = BASE_URL + "index.php";
    private static final String DASHBOARD_URL = BASE_URL
            + "index.php?option=com_studentdashboard"
            + "&controller=studentdashboard&task=dashboard";

    // Timeout constants
    private static final Duration CONNECT_TIMEOUT = Duration.ofSeconds(30);
    private static final Duration REQUEST_TIMEOUT = Duration.ofSeconds(30);

    // Regex patterns
    private static final Pattern DATA_PAIR_PATTERN =
            Pattern.compile("\\[\\s*[\"']([^\"']+)[\"']\\s*,\\s*([0-9]+(?:\\.[0-9]+)?)\\s*\\]");
    private static final Pattern CSRF_PATTERN =
            Pattern.compile(
                "<input[^>]+name=\"([a-f0-9]{32})\"[^>]+value=\"1\"",
                Pattern.CASE_INSENSITIVE);

    // In-memory bounded LRU cache to reduce portal & server load (15-minute TTL, max 200 entries)
    private static final int MAX_CACHE_ENTRIES = 200;
    private static final long CACHE_TTL_MS = 15 * 60 * 1000L;
    private final Map<String, CachedResponse> responseCache = Collections.synchronizedMap(
            new LinkedHashMap<String, CachedResponse>(MAX_CACHE_ENTRIES, 0.75f, true) {
                @Override
                protected boolean removeEldestEntry(Map.Entry<String, CachedResponse> eldest) {
                    return size() > MAX_CACHE_ENTRIES || eldest.getValue().isExpired();
                }
            }
    );

    private static class CachedResponse {
        final PortalDashboardResponse response;
        final long timestamp;

        CachedResponse(PortalDashboardResponse response) {
            this.response = response;
            this.timestamp = System.currentTimeMillis();
        }

        boolean isValid() {
            return (System.currentTimeMillis() - timestamp) < CACHE_TTL_MS;
        }

        boolean isExpired() {
            return !isValid();
        }
    }

    public PortalDashboardResponse fetchDashboard(String prn, String dob) throws Exception {
        String cacheKey = (prn != null ? prn.trim().toLowerCase() : "");
        CachedResponse cached = responseCache.get(cacheKey);
        if (cached != null && cached.isValid()) {
            log.info("Returning cached portal dashboard for PRN: {}", prn);
            return cached.response;
        }

        log.info("Starting student portal synchronization for PRN: {}", prn);
        ScraperService service = new ScraperService();
        ScrapeResult result = service.scrape(prn, dob);
        
        // Convert to DashboardSubject objects
        List<DashboardSubject> dashboardSubjects = new ArrayList<>();
        for (SubjectData data : result.getSubjects()) {
            dashboardSubjects.add(DashboardSubject.builder()
                .code(data.getCode())
                .name(data.getName())
                .attendance(data.getAttendance())
                .cie(data.getCie())
                .totalConducted(data.getTotalConducted())
                .totalAttended(data.getTotalAttended())
                .totalScheduled(data.getTotalScheduled())
                .stillToGo(data.getStillToGo())
                .credit(data.getCredit() > 0 ? data.getCredit() : 1)
                .lecturesPerWeek(data.getLecturesPerWeek())
                .detailedAttendance(data.getDetailedAttendance())
                .build());
        }
        
        PortalDashboardResponse response = PortalDashboardResponse.builder()
            .profile(result.getProfile())
            .subjects(dashboardSubjects)
            .build();

        responseCache.put(cacheKey, new CachedResponse(response));
        return response;
    }
    
        
    private boolean testConnectivity() {
        try {
            String userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
            HttpRequest testReq = HttpRequest.newBuilder()
                    .uri(URI.create(LOGIN_URL))
                    .timeout(Duration.ofSeconds(15))
                    .header("User-Agent", userAgent)
                    .method("HEAD", HttpRequest.BodyPublishers.noBody())
                    .build();
                    
            HttpResponse<String> response = HttpClient.newHttpClient()
                    .send(testReq, HttpResponse.BodyHandlers.ofString());
                    
            log.info("Portal connectivity test - Status: " + response.statusCode());
            return response.statusCode() == 200;
        } catch (Exception e) {
            log.warn("Portal connectivity test failed: {}", e.getMessage());
            return false;
        }
    }

    // Inner classes from the original scraper
    private static class ScraperService {
        private static final Logger log = LoggerFactory.getLogger(ScraperService.class);
        private final CookieManager cookieManager;
        private final HttpClient httpClient;

        public ScraperService() {
            this.cookieManager = new CookieManager();
            this.cookieManager.setCookiePolicy(CookiePolicy.ACCEPT_ALL);
            this.httpClient = HttpClient.newBuilder()
                    .cookieHandler(cookieManager)
                    .followRedirects(Redirect.NORMAL)
                    .connectTimeout(CONNECT_TIMEOUT)
                    .build();
        }

        public ScrapeResult scrape(String prn, String dob) throws Exception {
            login(prn, dob);
            try {
                return fetchAndParse();
            } catch (SessionExpiredException e) {
                log.warn("Session expired - clearing cookies and retrying login...");
                cookieManager.getCookieStore().removeAll();
                login(prn, dob);
                return fetchAndParse();
            }
        }

        private void login(String prn, String dob) throws Exception {
            log.debug("Fetching login page to acquire CSRF token...");
            HttpRequest getReq = HttpRequest.newBuilder()
                    .uri(URI.create(LOGIN_URL))
                    .timeout(REQUEST_TIMEOUT)
                    .header("User-Agent", userAgent())
                    .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8")
                    .header("Accept-Language", "en-US,en;q=0.5")
                    .GET()
                    .build();

            HttpResponse<String> loginPage =
                    withRetry(() -> httpClient.send(getReq,
                            HttpResponse.BodyHandlers.ofString()));

            String csrfToken = extractCsrfToken(loginPage.body());
            if (csrfToken == null) {
                log.warn("CSRF token not found in login page - using fallback token.");
                csrfToken = "52a9b9c958340fd545e2e5b2a7f935ef";
            } else {
                log.debug("CSRF token acquired successfully");
            }

            // Normalize delimiters to dashes
            String cleanDob = dob.replace("/", "-").replace(".", "-").replace(" ", "-");
            String[] parts = cleanDob.split("-");
            
            if (parts.length != 3) {
                throw new IllegalArgumentException("DOB must be in YYYY-MM-DD or DD-MM-YYYY format.");
            }

            String p1 = parts[0];
            String p2 = parts[1];
            String p3 = parts[2];
            
            List<String> passwdFormats = new ArrayList<>();
            if (p1.length() == 4) {
                // Input is YYYY-MM-DD
                passwdFormats.add(p1 + "-" + p2 + "-" + p3);
                passwdFormats.add(p3 + "-" + p2 + "-" + p1);
            } else if (p3.length() == 4) {
                // Input is DD-MM-YYYY
                passwdFormats.add(p3 + "-" + p2 + "-" + p1);
                passwdFormats.add(p1 + "-" + p2 + "-" + p3);
            } else {
                // Ambiguous or invalid year
                passwdFormats.add(cleanDob);
            }

            for (String passwd : passwdFormats) {
                log.debug("Attempting portal login attempt with date variation...");
                boolean result = attemptLogin(prn, passwd, csrfToken);
                if (result) {
                    log.info("Portal login succeeded");
                    return;
                }
                log.debug("Portal login variation unsuccessful, trying fallback format...");
            }
            throw new LoginFailedException("Authentication failed for student portal. Please check your credentials.");
        }

        private String extractCsrfToken(String html) {
            Matcher m = CSRF_PATTERN.matcher(html);
            return m.find() ? m.group(1) : null;
        }

        private boolean attemptLogin(String prn, String passwd, String csrfToken) throws Exception {
            String formBody = "username=" + URLEncoder.encode(prn, "UTF-8")
                    + "&passwd="   + URLEncoder.encode(passwd, "UTF-8")
                    + "&option=com_user"
                    + "&task=login"
                    + "&remember=No"
                    + "&" + csrfToken + "=1";

            HttpRequest postReq = HttpRequest.newBuilder()
                    .uri(URI.create(LOGIN_URL))
                    .timeout(REQUEST_TIMEOUT)
                    .header("Content-Type", "application/x-www-form-urlencoded")
                    .header("User-Agent",   userAgent())
                    .header("Referer",      BASE_URL)
                    .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8")
                    .header("Accept-Language", "en-US,en;q=0.5")
                    .POST(HttpRequest.BodyPublishers.ofString(formBody))
                    .build();

            HttpResponse<String> resp =
                    withRetry(() -> httpClient.send(postReq,
                            HttpResponse.BodyHandlers.ofString()));

            String body = resp.body();
            log.debug("Login response status: {}", resp.statusCode());

            boolean hasDashboard = body.contains("bb.generate") 
            || body.contains("COURSE CODE")
            || body.contains("studentdashboard");

            boolean stillLoginPage = body.contains("name=\"username\"") 
            && body.contains("name=\"passwd\"");

            return hasDashboard && !stillLoginPage; 
        }

        private String fetchDashboard() throws Exception {
            log.debug("Fetching student dashboard HTML...");
            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(DASHBOARD_URL))
                    .timeout(REQUEST_TIMEOUT)
                    .header("User-Agent", userAgent())
                    .header("Referer",    BASE_URL)
                    .GET()
                    .build();

            HttpResponse<String> resp =
                    withRetry(() -> httpClient.send(req,
                            HttpResponse.BodyHandlers.ofString()));

            String html = resp.body();

            if (!html.contains("bb.generate") && !html.contains("studentdashboard")) {
                throw new SessionExpiredException(
                        "Dashboard content missing - session may have expired.");
            }
            log.debug("Dashboard HTML fetched successfully ({} bytes)", html.length());
            return html;
        }

        private ScrapeResult fetchAndParse() throws Exception {
            String   html = fetchDashboard();
            Document doc  = Jsoup.parse(html);

            StudentProfile profile = extractProfile(doc);
            Map<String, SubjectLink>  subjectLinks    = extractSubjectLinks(doc);
            Map<String, Integer> cieMap        = extractChartData(doc, "bar");
            Map<String, Integer> attendanceMap = extractChartData(doc, "gauge");

            log.info("Parse complete - subjects: {}, CIE records: {}, attendance records: {}",
                    subjectLinks.size(), cieMap.size(), attendanceMap.size());
            log.info("CIE Map contents: {}", cieMap);

            if (subjectLinks.isEmpty())
                log.warn("Subject table is empty - check table/thead selectors.");
            if (cieMap.isEmpty())
                log.warn("CIE (bar) data not found - check script block content.");
            if (attendanceMap.isEmpty())
                log.warn("Attendance (gauge) data not found - check script block content.");

            List<SubjectData> subjects = mergeDataWithDetails(subjectLinks, cieMap, attendanceMap);
            return new ScrapeResult(profile, subjects);
        }

        private StudentProfile extractProfile(Document doc) {
            try {
                String name = "";
                Element nameEl = doc.selectFirst("h3");
                if (nameEl != null) {
                    name = nameEl.text().trim();
                }

                String image = "";
                // Try to find the specific profile image by class or path pattern
                Element imgEl = doc.selectFirst("img.uk-preserve-width");
                if (imgEl == null) {
                    imgEl = doc.selectFirst("img[src*=comprofiler]");
                }
                if (imgEl == null) {
                    imgEl = doc.selectFirst("img[src*=/]");
                }
                
                if (imgEl != null) {
                    String src = imgEl.attr("src");
                    if (src.startsWith("/")) {
                        image = BASE_URL.substring(0, BASE_URL.indexOf("/", 8)) + src;
                    } else if (!src.startsWith("http")) {
                        // If it's a relative path, prefix with BASE_URL
                        image = BASE_URL + src;
                    } else {
                        image = src;
                    }
                }

                String rollNo = "";
                String abcId = "";
                Elements h2s = doc.select("h2");
                for (Element h2 : h2s) {
                    String text = h2.text().trim();
                    if (text.contains("ABC ID:")) {
                        abcId = text.replace("ABC ID:", "").trim();
                    } else if (text.matches(".*\\d{2}[A-Z]{3}\\d{3}.*")) { // Basic heuristic for USN pattern like 24UAD022
                        rollNo = text;
                    }
                }

                String dept = "";
                String sem = "";
                String sec = "";
                Element pEl = doc.selectFirst("p:contains(SEM)");
                if (pEl != null) {
                    String text = pEl.text().trim();
                    // format like "B.Tech-UAD, SEM 04, SEC A"
                    String[] parts = text.split(",");
                    if (parts.length >= 1) dept = parts[0].trim();
                    if (parts.length >= 2) sem = parts[1].trim();
                    if (parts.length >= 3) sec = parts[2].trim();
                }

                return StudentProfile.builder()
                        .name(name)
                        .image(image)
                        .rollNo(rollNo)
                        .abcId(abcId)
                        .department(dept)
                        .semester(sem)
                        .section(sec)
                        .build();
            } catch (Exception e) {
                log.warn("Error extracting student profile: {}", e.getMessage());
                return StudentProfile.builder().name("Unknown User").build();
            }
        }

        private Map<String, SubjectLink> extractSubjectLinks(Document doc) {
            Map<String, SubjectLink> subjectMap = new LinkedHashMap<>();

            for (Element table : doc.select("table")) {
                Elements headers = table.select("thead tr th");
                if (headers.isEmpty()) continue;

                int codeIdx = -1, nameIdx = -1;
                for (int i = 0; i < headers.size(); i++) {
                    String h = headers.get(i).text().trim().toUpperCase();
                    if (h.contains("COURSE CODE") || h.equals("CODE"))      codeIdx = i;
                    if (h.contains("COURSE NAME") || h.contains("SUBJECT")) nameIdx = i;
                }
                if (codeIdx == -1 || nameIdx == -1) continue;

                for (Element row : table.select("tbody tr")) {
                    Elements cells = row.select("td");
                    if (cells.size() <= Math.max(codeIdx, nameIdx)) continue;

                    String code = cells.get(codeIdx).text().trim();
                    String name = cells.get(nameIdx).text().trim();
                    
                    // Look for attendance detail link
                    String detailUrl = null;
                    Element link = row.selectFirst("a");
                    if (link != null) {
                        String onclick = link.attr("onclick");
                        String href = link.attr("href");
                        String targetPath = null;
                        
                        if (onclick != null && onclick.contains("window.location.href")) {
                            java.util.regex.Matcher m = java.util.regex.Pattern.compile("window\\.location\\.href\\s*=\\s*['\"]([^'\"]+)['\"]").matcher(onclick);
                            if (m.find()) {
                                targetPath = m.group(1);
                            }
                        }
                        
                        if (targetPath == null && href != null && !href.equals("#") && !href.isEmpty()) {
                            targetPath = href;
                        }
                        
                        if (targetPath != null) {
                            if (targetPath.startsWith("http")) {
                                detailUrl = targetPath;
                            } else if (targetPath.startsWith("/")) {
                                String host = BASE_URL.substring(0, BASE_URL.indexOf("/", 8));
                                detailUrl = host + targetPath;
                            } else {
                                detailUrl = BASE_URL + targetPath;
                            }
                        }
                    }

                    if (!code.isEmpty() && !name.isEmpty()) {
                        subjectMap.put(code, new SubjectLink(name, detailUrl));
                    }
                }
                if (!subjectMap.isEmpty()) break;
            }
            return subjectMap;
        }

        private static class AttendanceDetailsBundle {
            List<DashboardSubject.AttendanceRecord> records;
            int conducted;
            int attended;
            int total;
            int stillToGo;
            AttendanceDetailsBundle(List<DashboardSubject.AttendanceRecord> r, int c, int a, int t, int s) {
                this.records = r; this.conducted = c; this.attended = a; this.total = t; this.stillToGo = s;
            }
        }

        private AttendanceDetailsBundle fetchSubjectAttendanceDetails(String url) {
            if (url == null || url.isEmpty()) return new AttendanceDetailsBundle(new ArrayList<>(), 0, 0, 0, 0);
            List<DashboardSubject.AttendanceRecord> records = new ArrayList<>();
            try {
                log.debug("Deep scraping attendance records");
                HttpRequest req = HttpRequest.newBuilder()
                        .uri(URI.create(url))
                        .timeout(REQUEST_TIMEOUT)
                        .header("User-Agent", userAgent())
                        .header("Referer", DASHBOARD_URL)
                        .GET()
                        .build();

                HttpResponse<String> resp = withRetry(() -> httpClient.send(req, HttpResponse.BodyHandlers.ofString()));
                Document doc = Jsoup.parse(resp.body());
                
                // 1. Try to find summary headers (often in <strong> or tables above the log)
                // Pattern: "Conducted: 24 Attended: 20" or "STILL TO GO [5]" or "TOTAL [31]"
                String text = doc.text();
                int totalConducted = 0;
                int totalAttended = 0;
                int stillToGo = 0;
                int totalScheduled = 0;

                Matcher mConducted = Pattern.compile("Conducted\\s*:\\s*(\\d+)").matcher(text);
                Matcher mAttended = Pattern.compile("Attended\\s*:\\s*(\\d+)").matcher(text);
                Matcher mStill = Pattern.compile("STILL TO GO\\s*\\[(\\d+)\\]", Pattern.CASE_INSENSITIVE).matcher(text);
                Matcher mTotal = Pattern.compile("TOTAL\\s*\\[(\\d+)\\]", Pattern.CASE_INSENSITIVE).matcher(text);

                if (mConducted.find()) totalConducted = Integer.parseInt(mConducted.group(1));
                if (mAttended.find()) totalAttended = Integer.parseInt(mAttended.group(1));
                if (mStill.find()) stillToGo = Integer.parseInt(mStill.group(1));
                if (mTotal.find()) totalScheduled = Integer.parseInt(mTotal.group(1));

                // Also support "Present[6] Absent[1] Still to go[260]" format
                Matcher mPresent = Pattern.compile("Present\\s*\\[(\\d*)\\]", Pattern.CASE_INSENSITIVE).matcher(text);
                Matcher mAbsent = Pattern.compile("Absent\\s*\\[(\\d*)\\]", Pattern.CASE_INSENSITIVE).matcher(text);
                Matcher mStill2 = Pattern.compile("Still\\s*to\\s*go\\s*\\[(\\d*)\\]", Pattern.CASE_INSENSITIVE).matcher(text);

                int parsedPresent = -1;
                int parsedAbsent = -1;
                int parsedStill = -1;

                if (mPresent.find() && !mPresent.group(1).isEmpty()) {
                    parsedPresent = Integer.parseInt(mPresent.group(1));
                }
                if (mAbsent.find() && !mAbsent.group(1).isEmpty()) {
                    parsedAbsent = Integer.parseInt(mAbsent.group(1));
                }
                if (mStill2.find() && !mStill2.group(1).isEmpty()) {
                    parsedStill = Integer.parseInt(mStill2.group(1));
                }

                if (parsedPresent != -1) {
                    totalAttended = parsedPresent;
                    if (parsedAbsent != -1) {
                        totalConducted = parsedPresent + parsedAbsent;
                    } else {
                        totalConducted = parsedPresent;
                    }
                }
                if (parsedStill != -1) {
                    stillToGo = parsedStill;
                }

                // 2. Parse the table log
                Elements rows = doc.select("table tr:has(td)");
                for (Element row : rows) {
                    Elements tds = row.select("td");
                    if (tds.size() >= 3) {
                        // Find indexes for Date, Time, Status dynamically if possible, or use fallback
                        String date = "", slot = "", status = "";
                        if (tds.size() >= 4) {
                            date = tds.get(1).text().trim();
                            slot = tds.get(2).text().trim();
                            status = tds.get(3).text().trim();
                        } else {
                            date = tds.get(0).text().trim();
                            slot = tds.get(1).text().trim();
                            status = tds.get(2).text().trim();
                        }

                        if (date.matches(".*\\d{2}.*") && (status.equalsIgnoreCase("Present") || status.equalsIgnoreCase("Absent") || status.equals("P") || status.equals("A"))) {
                            String normalizedStatus = status.startsWith("P") ? "Present" : "Absent";
                            records.add(DashboardSubject.AttendanceRecord.builder()
                                .date(date).slot(slot).status(normalizedStatus).build());
                        }
                    }
                }

                // fallback: if summary not found, use count of records
                if (totalConducted == 0) totalConducted = records.size();
                if (totalAttended == 0) totalAttended = (int) records.stream().filter(r -> r.getStatus().equals("Present")).count();
                if (totalScheduled == 0) totalScheduled = totalConducted + stillToGo;

                // Validation: detect suspicious data
                if (records.size() == 0) {
                    log.debug("No detailed attendance records found for URL: {}", url);
                }
                
                if (totalAttended > totalConducted) {
                    log.warn("Suspicious attendance data: attended ({}) > conducted ({}) for URL: {}", totalAttended, totalConducted, url);
                    // Correct the data by using actual counts
                    totalAttended = Math.min(totalAttended, totalConducted);
                }
                
                if (totalScheduled < totalConducted) {
                    log.warn("Suspicious attendance data: total scheduled ({}) < conducted ({}) for URL: {}", totalScheduled, totalConducted, url);
                    totalScheduled = Math.max(totalScheduled, totalConducted);
                }
                
                if (stillToGo < 0) {
                    log.warn("Suspicious attendance data: still to go ({}) is negative for URL: {}", stillToGo, url);
                    stillToGo = Math.max(0, stillToGo);
                }

                log.info("Parsed " + records.size() + " records (C:" + totalConducted + "/A:" + totalAttended + "/S:" + stillToGo + "/T:" + totalScheduled + ")");
                return new AttendanceDetailsBundle(records, totalConducted, totalAttended, totalScheduled, stillToGo);
            } catch (Exception e) {
                log.warn("Failed to fetch attendance details: {}", e.getMessage());
                return new AttendanceDetailsBundle(new ArrayList<>(), 0, 0, 0, 0);
            }
        }

        private Map<String, Integer> extractChartData(Document doc, String chartType) {
            Map<String, Integer> dataMap = new LinkedHashMap<>();

            Pattern typePattern = Pattern.compile(
                    "\\btype\\s*:\\s*[\"']" + Pattern.quote(chartType) + "[\"']", Pattern.CASE_INSENSITIVE);

            for (Element script : doc.select("script")) {
                String js = script.html();
                if (js.isBlank() || !js.contains("bb.generate")) continue;

                String[] blocks = js.split("bb\\.generate\\s*\\(");

                for (int b = 1; b < blocks.length; b++) {
                    String block = blocks[b];

                    boolean matchesType = typePattern.matcher(block).find();
                    if (!matchesType && chartType.equalsIgnoreCase("bar") && block.toLowerCase().contains("cie")) {
                        matchesType = true;
                    }
                    if (!matchesType) {
                        continue;
                    }

                    log.debug("Extracting chart data with type=\"{}\"", chartType);

                    Matcher m = DATA_PAIR_PATTERN.matcher(block);
                    while (m.find()) {
                        String key   = m.group(1).trim();
                        try {
                            int value = (int) Math.round(Double.parseDouble(m.group(2).trim()));
                            if (!key.isBlank()) {
                                dataMap.put(key, value);
                                log.debug("Chart data: {} = {}", key, value);
                            }
                        } catch (Exception ex) {
                            log.debug("Could not parse value for key: {}", key);
                        }
                    }
                }
            }
            return dataMap;
        }

        private List<SubjectData> mergeDataWithDetails(Map<String, SubjectLink> subjectLinks,
                                                    Map<String, Integer> cieMap,
                                                    Map<String, Integer> attendanceMap) {
            Set<String> allCodes = new LinkedHashSet<>();
            allCodes.addAll(subjectLinks.keySet());
            allCodes.addAll(cieMap.keySet());
            allCodes.addAll(attendanceMap.keySet());

            // 1. Pre-fetch all bundles to find global start date
            Map<String, AttendanceDetailsBundle> bundles = new HashMap<>();
            LocalDate globalStart = LocalDate.now();
            boolean foundStart = false;

            for (String code : allCodes) {
                SubjectLink linkData = subjectLinks.get(code);
                if (linkData != null && linkData.url != null) {
                    AttendanceDetailsBundle b = fetchSubjectAttendanceDetails(linkData.url);
                    bundles.put(code, b);
                    for (DashboardSubject.AttendanceRecord rec : b.records) {
                        LocalDate d = parseDate(rec.getDate());
                        if (d != null && (!foundStart || d.isBefore(globalStart))) {
                            globalStart = d;
                            foundStart = true;
                        }
                    }
                }
            }

            long weeksElapsed = Math.max(1, foundStart ? ChronoUnit.WEEKS.between(globalStart, LocalDate.now()) : 1);
            if (weeksElapsed == 0) weeksElapsed = 1;

            List<SubjectData> result = new ArrayList<>();
            for (String code : allCodes) {
                SubjectLink linkData = subjectLinks.get(code);
                String name = linkData != null ? linkData.name : code;
                
                int attendance = getScoreFromMap(attendanceMap, code, name);
                int cie = getScoreFromMap(cieMap, code, name);
                
                AttendanceDetailsBundle bundle = bundles.getOrDefault(code, new AttendanceDetailsBundle(new ArrayList<>(), 0, 0, 0, 0));
                
                int credit = 1; // Default
                int lpw = (int) Math.ceil((double) bundle.conducted / weeksElapsed);
                if (lpw == 0 && bundle.conducted > 0) lpw = 1;

                result.add(new SubjectData(code, name, attendance, cie, bundle.conducted, bundle.attended, bundle.total, bundle.stillToGo, credit, lpw, bundle.records));
                log.debug("Merged subject: {} | LPW={}", code, lpw);
            }
            return result;
        }

        private int getScoreFromMap(Map<String, Integer> map, String code, String name) {
            if (map == null || map.isEmpty()) return 0;
            if (code != null && map.containsKey(code)) return map.get(code);
            if (name != null && map.containsKey(name)) return map.get(name);
            
            String normCode = code != null ? code.replaceAll("[^a-zA-Z0-9]", "").toLowerCase() : "";
            String normName = name != null ? name.replaceAll("[^a-zA-Z0-9]", "").toLowerCase() : "";

            for (Map.Entry<String, Integer> entry : map.entrySet()) {
                String k = entry.getKey();
                String normK = k.replaceAll("[^a-zA-Z0-9]", "").toLowerCase();
                
                if (!normCode.isEmpty() && (normK.equals(normCode) || normCode.contains(normK) || normK.contains(normCode))) {
                    return entry.getValue();
                }
                if (!normName.isEmpty() && (normK.equals(normName) || normName.contains(normK) || normK.contains(normName))) {
                    return entry.getValue();
                }
            }
            return 0;
        }

        private LocalDate parseDate(String dateStr) {
            if (dateStr == null) return null;
            String clean = dateStr.trim().replace("/", "-");
            try {
                return LocalDate.parse(clean, DateTimeFormatter.ofPattern("dd-MM-yyyy"));
            } catch (Exception e) {
                try {
                    return LocalDate.parse(clean, DateTimeFormatter.ofPattern("d-MM-yyyy"));
                } catch (Exception e2) {
                    return null;
                }
            }
        }

        private <T> T withRetry(IOSupplier<T> action) throws Exception {
            try {
                return action.get();
            } catch (IOException e) {
                log.warn("HTTP request failed ({}) - retrying once...", e.getMessage());
                return action.get();
            }
        }

        private String userAgent() {
            return "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                 + "AppleWebKit/537.36 (KHTML, like Gecko) "
                 + "Chrome/120.0.0.0 Safari/537.36";
        }

        @FunctionalInterface
        interface IOSupplier<T> {
            T get() throws Exception;
        }
    }

    // Data classes
    private static class ScrapeResult {
        private final StudentProfile profile;
        private final List<SubjectData> subjects;

        public ScrapeResult(StudentProfile profile, List<SubjectData> subjects) {
            this.profile = profile;
            this.subjects = subjects;
        }

        public StudentProfile getProfile() { return profile; }
        public List<SubjectData> getSubjects() { return subjects; }
    }

    private static class SubjectData {
        private final String code;
        private final String name;
        private final int attendance;
        private final int cie;
        private final int totalConducted;
        private final int totalAttended;
        private final int totalScheduled;
        private final int stillToGo;
        private final int credit;
        private final int lecturesPerWeek;
        private final List<DashboardSubject.AttendanceRecord> detailedAttendance;

        public SubjectData(String code, String name, int attendance, int cie, int totalConducted, int totalAttended, int totalScheduled, int stillToGo, int credit, int lecturesPerWeek, List<DashboardSubject.AttendanceRecord> detailedAttendance) {
            this.code = code;
            this.name = name;
            this.attendance = attendance;
            this.cie = cie;
            this.totalConducted = totalConducted;
            this.totalAttended = totalAttended;
            this.totalScheduled = totalScheduled;
            this.stillToGo = stillToGo;
            this.credit = credit;
            this.lecturesPerWeek = lecturesPerWeek;
            this.detailedAttendance = detailedAttendance;
        }

        public String getCode() { return code; }
        public String getName() { return name; }
        public int getAttendance() { return attendance; }
        public int getCie() { return cie; }
        public int getTotalConducted() { return totalConducted; }
        public int getTotalAttended() { return totalAttended; }
        public int getTotalScheduled() { return totalScheduled; }
        public int getStillToGo() { return stillToGo; }
        public int getCredit() { return credit; }
        public int getLecturesPerWeek() { return lecturesPerWeek; }
        public List<DashboardSubject.AttendanceRecord> getDetailedAttendance() { return detailedAttendance; }
    }

    private static class SubjectLink {
        String name;
        String url;
        SubjectLink(String name, String url) { this.name = name; this.url = url; }
    }

    private static class LoginFailedException extends RuntimeException {
        public LoginFailedException(String m) { super(m); }
    }
    
    private static class SessionExpiredException extends RuntimeException {
        public SessionExpiredException(String m) { super(m); }
    }
}
