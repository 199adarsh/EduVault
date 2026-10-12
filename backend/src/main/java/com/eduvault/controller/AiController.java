package com.eduvault.controller;

import com.eduvault.model.Note;
import com.eduvault.repository.LocalJsonDatabase;
import com.eduvault.service.GroqService;
import com.eduvault.service.RAGService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/ai")
@CrossOrigin(origins = "*")
public class AiController {

    @Autowired
    private GroqService groqService;

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
            String noteId = request.get("noteId"); // Optional context

            if (question == null || question.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Question is required"));
            }

            String jsonResponse;
            if (noteId != null && !noteId.isEmpty()) {
                jsonResponse = ragService.askChapter(question, noteId);
            } else {
                // Advanced MVP logic: Compile recent notes context for general questions
                List<Note> recentNotes = database.getAllNotes();
                // Sort by createdAt descending (ISO date strings sort correctly lexicographically)
                // Cap each note at 1000 chars so all 3 notes fit within askTutor()'s 3000-char total limit
                String context = recentNotes.stream()
                        .filter(n -> n.getExtractedText() != null && n.getExtractedText().length() > 100)
                        .sorted((a, b) -> {
                            String da = a.getCreatedAt() != null ? a.getCreatedAt() : "";
                            String db = b.getCreatedAt() != null ? b.getCreatedAt() : "";
                            return db.compareTo(da); // descending: newest first
                        })
                        .limit(3)
                        .map(n -> "Source (" + n.getTitle() + "):\n" + n.getExtractedText().substring(0, Math.min(n.getExtractedText().length(), 1000)))
                        .collect(Collectors.joining("\n\n---\n\n"));
                
                if(context.isEmpty()) {
                    context = "No uploaded study materials available for context.";
                }

                jsonResponse = groqService.askTutor(question, context);
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
                    "confidence", 0.5
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
                return ResponseEntity.badRequest().body(Map.of("error", "Provide at least one of Question Bank or PYQ text"));
            }

            String jsonResponse = groqService.generateStudyGuide(pyqText, qbText);
            
            try {
                return ResponseEntity.ok(mapper.readValue(jsonResponse, Map.class));
            } catch (Exception e) {
                return ResponseEntity.status(500).body(Map.of("error", "Failed to parse study guide", "raw", jsonResponse));
            }
        } catch (Exception e) {
            logger.error("Controller error in /api/ai/study-guide", e);
            return ResponseEntity.status(500).body(Map.of("error", "Study Guide generation failed"));
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

            String jsonResponse = groqService.generateRoadmap(subjectsCount, pyqText, qbText, examDate, currentDate, daysRemaining);
            
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
}
