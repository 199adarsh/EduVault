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

import java.util.List;
import java.util.Map;
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

    private static final Logger logger = LoggerFactory.getLogger(AiController.class);
    private final ObjectMapper mapper = new ObjectMapper();

    @PostMapping("/chat")
    public ResponseEntity<?> chat(@RequestBody Map<String, String> request) {
        try {
            String question = request.get("question");
            if (question == null || question.trim().isEmpty()) {
                question = request.get("message");
            }
            if (question == null || question.trim().isEmpty()) {
                question = request.get("prompt");
            }
            String noteId = request.get("noteId"); // Optional context
            String prn = request.get("prn");

            if (question == null || question.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Question or message is required"));
            }

            String jsonResponse;
            if (noteId != null && !noteId.isEmpty()) {
                jsonResponse = ragService.askChapter(question, noteId);
            } else {
                // Compile full academic context across all sections of EduVault
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

                List<Note> recentNotes = database.getAllNotes();
                String notesContext = recentNotes.stream()
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

                jsonResponse = geminiService.askTutor(question, fullContext);
            }

            if (jsonResponse == null || jsonResponse.trim().isEmpty()) {
                return ResponseEntity.ok(Map.of("answer", "I encountered an error and couldn't generate an answer.", "confidence", 0.0));
            }

            try {
                return ResponseEntity.ok(mapper.readValue(jsonResponse, Map.class));
            } catch (JsonProcessingException e) {
                logger.error("Failed to parse AI response as JSON: {}", jsonResponse);
                return ResponseEntity.ok(Map.of(
                        "answer", jsonResponse,
                        "confidence", 0.75
                ));
            }
        } catch (Exception e) {
            logger.error("Controller error in /api/ai/chat", e);
            return ResponseEntity.status(500).body(Map.of("error", "Internal AI Logic failure", "message", e.getMessage()));
        }
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
