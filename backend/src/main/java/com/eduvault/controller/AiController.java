package com.eduvault.controller;

import com.eduvault.model.Note;
import com.eduvault.repository.LocalJsonDatabase;
import com.eduvault.service.GeminiService;
import com.eduvault.service.RAGService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/ai")
@CrossOrigin(origins = "*")
public class AiController {

    @Autowired
    private GeminiService geminiService;

    @Autowired
    private RAGService ragService;

    @Autowired
    private LocalJsonDatabase database;

    @Autowired(required = false)
    private com.eduvault.service.OkfKnowledgeService okfKnowledgeService;

    @Autowired(required = false)
    private com.eduvault.service.OkfBatchService okfBatchService;

    private static final Logger logger = LoggerFactory.getLogger(AiController.class);
    private final ObjectMapper mapper = new ObjectMapper();

    @PostMapping("/chat")
    public ResponseEntity<?> chat(
            @RequestHeader(value = "X-Gemini-Api-Key", required = false) String apiKeyHeader,
            @RequestBody Map<String, String> request) {
        try {
            String question = request.get("question");
            if (question == null || question.trim().isEmpty()) {
                question = request.get("message");
            }
            if (question == null || question.trim().isEmpty()) {
                question = request.get("prompt");
            }
            String noteId = request.get("noteId"); // Optional context
            String subjectId = request.get("subjectId");
            String unit = request.get("unit");
            String prn = request.get("prn");
            String customApiKey = apiKeyHeader;
            if (customApiKey == null || customApiKey.isBlank()) {
                customApiKey = request.get("apiKey");
            }
            if (customApiKey == null || customApiKey.isBlank()) {
                customApiKey = request.get("customApiKey");
            }

            if (question == null || question.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Question or message is required"));
            }

            String jsonResponse;
            String source = "GENERAL_TUTOR";
            String contextSnippet = null;

            // Route 1: Subject-Aware OKF Knowledge Serving
            if (subjectId != null && !subjectId.trim().isEmpty() && okfKnowledgeService != null) {
                Optional<String> okfContext = okfKnowledgeService.buildSubjectKnowledgeContext(subjectId.trim(), question, unit);
                
                // JIT On-Demand Compilation: if not compiled yet, compile immediately so user never waits for overnight cron
                if (okfContext.isEmpty() && okfBatchService != null) {
                    logger.info("OKF not pre-compiled for subjectId={}. Executing instant JIT compilation.", subjectId);
                    try {
                        okfBatchService.executeBatchSync(subjectId.trim(), "JIT_ON_DEMAND");
                        okfKnowledgeService.preloadSubject(subjectId.trim());
                        okfContext = okfKnowledgeService.buildSubjectKnowledgeContext(subjectId.trim(), question, unit);
                    } catch (Exception ex) {
                        logger.warn("Instant JIT OKF compilation encountered an issue: {}", ex.getMessage());
                    }
                }

                if (okfContext.isPresent()) {
                    contextSnippet = okfContext.get();
                    jsonResponse = geminiService.askTutor(question, contextSnippet, customApiKey);
                    source = "OKF_KNOWLEDGE";
                } else {
                    logger.info("OKF knowledge context still empty for subjectId={}, falling back with strict subject isolation", subjectId);
                    if (noteId != null && !noteId.trim().isEmpty()) {
                        jsonResponse = ragService.askChapter(question, noteId, customApiKey);
                        source = "CHAPTER_RAG";
                    } else {
                        jsonResponse = executeGeneralTutor(question, prn, customApiKey, subjectId.trim());
                        source = "GENERAL_TUTOR";
                    }
                }
            } else if (noteId != null && !noteId.trim().isEmpty()) {
                // Route 2: Note-specific Chapter RAG
                jsonResponse = ragService.askChapter(question, noteId, customApiKey);
                source = "CHAPTER_RAG";
            } else {
                // Route 3: General Academic Assistant Context
                jsonResponse = executeGeneralTutor(question, prn, customApiKey, null);
                source = "GENERAL_TUTOR";
            }

            Map<String, Object> responseMap = new HashMap<>();
            if (jsonResponse != null && !jsonResponse.trim().isEmpty()) {
                try {
                    Map<?, ?> parsed = mapper.readValue(jsonResponse, Map.class);
                    for (Map.Entry<?, ?> entry : parsed.entrySet()) {
                        if (entry.getKey() != null) {
                            responseMap.put(String.valueOf(entry.getKey()), entry.getValue());
                        }
                    }
                } catch (JsonProcessingException e) {
                    logger.warn("Failed to parse AI response as JSON: {}", jsonResponse);
                    responseMap.put("answer", jsonResponse);
                    responseMap.put("confidence", 0.75);
                }
            } else {
                responseMap.put("answer", "I encountered an error and couldn't generate an answer.");
                responseMap.put("confidence", 0.0);
            }

            responseMap.put("source", source);
            if ("OKF_KNOWLEDGE".equals(source)) {
                responseMap.put("subjectId", subjectId.trim());
                if (unit != null && !unit.isBlank()) {
                    responseMap.put("unit", unit.trim());
                }
                if (contextSnippet != null) {
                    responseMap.put("contextSnippet", contextSnippet);
                }
            } else if ("CHAPTER_RAG".equals(source)) {
                responseMap.put("noteId", noteId);
            }

            return ResponseEntity.ok(responseMap);
        } catch (Exception e) {
            logger.error("Controller error in /api/ai/chat", e);
            return ResponseEntity.status(500).body(Map.of("error", "Internal AI Logic failure", "message", e.getMessage()));
        }
    }

    private String executeGeneralTutor(String question, String prn, String customApiKey) {
        return executeGeneralTutor(question, prn, customApiKey, null);
    }

    private String executeGeneralTutor(String question, String prn, String customApiKey, String targetSubjectId) {
        StringBuilder contextBuilder = new StringBuilder();

        com.eduvault.model.StudentProfile profile = (prn != null && !prn.isBlank()) ? database.getProfile(prn.trim()) : null;
        if (profile != null && profile.getName() != null) {
            contextBuilder.append("=== STUDENT PROFILE ===\n")
                    .append("Name: ").append(profile.getName()).append("\n")
                    .append("PRN: ").append(profile.getPrn()).append("\n")
                    .append("Department: ").append(profile.getDepartment()).append("\n")
                    .append("Semester: ").append(profile.getSemester()).append("\n\n");
        }

        List<com.eduvault.model.Subject> subjects = database.getAllSubjects();
        if (subjects != null && !subjects.isEmpty()) {
            contextBuilder.append("=== ENROLLED SUBJECTS & ATTENDANCE ===\n");
            for (com.eduvault.model.Subject s : subjects) {
                contextBuilder.append("- ").append(s.getName())
                        .append(" (Code: ").append(s.getCode() != null ? s.getCode() : "N/A").append("): ")
                        .append("Attendance ").append(s.getAttendance() != null ? s.getAttendance() : "0").append("%")
                        .append(" (").append(s.getTotalAttended()).append("/").append(s.getTotalConducted()).append(" sessions attended)\n");
            }
            contextBuilder.append("\n");
        }

        List<com.eduvault.model.Announcement> announcements = database.getAllAnnouncements();
        if (announcements != null && !announcements.isEmpty()) {
            contextBuilder.append("=== ANNOUNCEMENTS & NOTICES ===\n");
            for (com.eduvault.model.Announcement a : announcements.stream().limit(5).toList()) {
                contextBuilder.append("• ").append(a.getTitle()).append(": ").append(a.getDescription()).append("\n");
            }
            contextBuilder.append("\n");
        }

        List<Note> allNotes = database.getAllNotes();
        List<Note> eligibleNotes = (allNotes != null) ? allNotes : Collections.emptyList();

        if (targetSubjectId != null && !targetSubjectId.isBlank()) {
            // Strictly scope to target subject to prevent cross-subject contamination
            eligibleNotes = eligibleNotes.stream()
                    .filter(n -> targetSubjectId.equalsIgnoreCase(n.getSubjectId()))
                    .collect(Collectors.toList());
        } else {
            // Filter strictly: only include notes whose title or subject matches keywords in question
            String qLower = question.toLowerCase();
            eligibleNotes = eligibleNotes.stream()
                    .filter(n -> {
                        String title = (n.getTitle() != null) ? n.getTitle().toLowerCase() : "";
                        String sId = (n.getSubjectId() != null) ? n.getSubjectId().toLowerCase() : "";
                        return (title.length() > 3 && qLower.contains(title)) ||
                               (!sId.isEmpty() && qLower.contains(sId));
                    })
                    .collect(Collectors.toList());
        }

        String notesContext = eligibleNotes.stream()
                .filter(n -> n.getExtractedText() != null && n.getExtractedText().length() > 50)
                .sorted((a, b) -> {
                    String da = a.getCreatedAt() != null ? a.getCreatedAt() : "";
                    String db = b.getCreatedAt() != null ? b.getCreatedAt() : "";
                    return db.compareTo(da);
                })
                .limit(3)
                .map(n -> "Material (" + n.getTitle() + "):\n" + n.getExtractedText().substring(0, Math.min(n.getExtractedText().length(), 1000)))
                .collect(Collectors.joining("\n\n---\n\n"));

        if (!notesContext.isEmpty()) {
            contextBuilder.append("=== RECENT STUDY MATERIALS ===\n").append(notesContext);
        }

        String fullContext = contextBuilder.toString().trim();
        if (fullContext.isEmpty()) {
            fullContext = "EduVault Academic Vault ready to assist.";
        }

        return geminiService.askTutor(question, fullContext, customApiKey);
    }

    @PostMapping("/study-guide")
    public ResponseEntity<?> generateStudyGuide(@RequestBody Map<String, String> request) {
        try {
            String pyqText = request.get("pyqText");
            String qbText = request.get("qbText");

            if ((pyqText == null || pyqText.trim().isEmpty()) && (qbText == null || qbText.trim().isEmpty())) {
                if (request.containsKey("prompt")) {
                    pyqText = request.get("prompt");
                } else if (request.containsKey("subject") || request.containsKey("topic")) {
                    pyqText = "Subject: " + request.getOrDefault("subject", "General") + 
                              ", Topic: " + request.getOrDefault("topic", "Exam Preparation");
                }
            }

            if ((pyqText == null || pyqText.trim().isEmpty()) && (qbText == null || qbText.trim().isEmpty())) {
                return ResponseEntity.badRequest().body(Map.of("error", "Provide at least one of Question Bank, PYQ text, or subject/topic"));
            }

            String jsonResponse = geminiService.generateStudyGuide(pyqText, qbText);

            try {
                return ResponseEntity.ok(mapper.readValue(jsonResponse, Map.class));
            } catch (Exception e) {
                return ResponseEntity.ok(Map.of("guide", List.of(
                        Map.of("topic", "Key Exam Questions", "priority", "High", "questions", List.of(pyqText != null && !pyqText.isBlank() ? pyqText : "Review key concepts"))
                )));
            }
        } catch (Exception e) {
            logger.error("Controller error in /api/ai/study-guide", e);
            return ResponseEntity.status(502).body(Map.of("error", "Study Guide generation failed: " + e.getMessage()));
        }
    }

    @PostMapping("/roadmap")
    public ResponseEntity<?> generateRoadmap(@RequestBody Map<String, Object> request) {
        try {
            String pyqText = (String) request.get("pyqText");
            String qbText = (String) request.get("qbText");
            String examDate = (String) request.get("examDate");
            String currentDate = (String) request.get("currentDate");

            // Safe Integer extraction
            Integer subjectsCount = request.get("subjectsCount") instanceof Integer
                    ? (Integer) request.get("subjectsCount")
                    : Integer.parseInt(String.valueOf(request.get("subjectsCount")));

            Integer daysRemaining = request.get("daysRemaining") instanceof Integer
                    ? (Integer) request.get("daysRemaining")
                    : Integer.parseInt(String.valueOf(request.get("daysRemaining")));

            if (examDate == null || currentDate == null || subjectsCount == null || daysRemaining == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Missing required roadmap parameters"));
            }

            String jsonResponse = geminiService.generateRoadmap(subjectsCount, pyqText, qbText, examDate, currentDate, daysRemaining);

            try {
                return ResponseEntity.ok(mapper.readValue(jsonResponse, Map.class));
            } catch (Exception e) {
                return ResponseEntity.status(500).body(Map.of("error", "Failed to parse roadmap", "raw", jsonResponse));
            }
        } catch (Exception e) {
            logger.error("Controller error in /api/ai/roadmap", e);
            return ResponseEntity.status(500).body(Map.of("error", "Roadmap generation failed: " + e.getMessage()));
        }
    }

    @PostMapping("/analyze-roadmap-subjects")
    public ResponseEntity<?> analyzeRoadmapSubjects(@RequestBody(required = false) Map<String, Object> request) {
        try {
            String domain = request != null && request.containsKey("domain") ? String.valueOf(request.get("domain")) : "Frontend Development";
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> subjects = request != null && request.containsKey("subjects")
                    ? (List<Map<String, Object>>) request.get("subjects")
                    : null;

            String jsonResponse = geminiService.analyzeRoadmapSubjects(domain, subjects);
            try {
                return ResponseEntity.ok(mapper.readValue(jsonResponse, Map.class));
            } catch (Exception e) {
                return ResponseEntity.ok(Map.of(
                        "domain", domain,
                        "raw", jsonResponse
                ));
            }
        } catch (Exception e) {
            logger.error("Controller error in /api/ai/analyze-roadmap-subjects", e);
            return ResponseEntity.status(500).body(Map.of("error", "Subject analysis failed: " + e.getMessage()));
        }
    }
}
