package com.eduvault.controller;

import com.eduvault.model.Note;
import com.eduvault.repository.LocalJsonDatabase;
import com.eduvault.service.GeminiService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/ai")
public class AiController {

    @Autowired
    private GeminiService geminiService;

    @Autowired
    private LocalJsonDatabase database;

    private final ObjectMapper mapper = new ObjectMapper();

    @PostMapping("/chat")
    public ResponseEntity<?> chat(@RequestBody Map<String, String> request) {
        String question = request.get("question");
        String noteId = request.get("noteId"); // Optional context

        if (question == null || question.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Question is required"));
        }

        String context = "No specific context provided.";
        
        // If noteId is provided, pull the text for context
        if (noteId != null && !noteId.isEmpty()) {
            Optional<Note> noteOpt = database.getNoteById(noteId);
            if (noteOpt.isPresent()) {
                String text = noteOpt.get().getExtractedText();
                if (text != null && text.length() > 50) {
                     // Limit context size just to be safe
                     context = text.substring(0, Math.min(text.length(), 20000));
                } else {
                     context = "The specified note did not contain extractable text.";
                }
            }
        } else {
             // Advanced MVP logic: Compile recent notes context for general questions
             List<Note> recentNotes = database.getAllNotes();
             context = recentNotes.stream()
                     .filter(n -> n.getExtractedText() != null && n.getExtractedText().length() > 100)
                     .limit(3)
                     .map(n -> "Source (" + n.getTitle() + "):\n" + n.getExtractedText().substring(0, Math.min(n.getExtractedText().length(), 5000)))
                     .collect(Collectors.joining("\n\n---\n\n"));
             
             if(context.isEmpty()) {
                 context = "No uploaded study materials available for context.";
             }
        }

        String jsonResponse = geminiService.askTutor(question, context);
        
        try {
            return ResponseEntity.ok(mapper.readValue(jsonResponse, Map.class));
        } catch (JsonProcessingException e) {
             // Fallback if AI didn't return perfect JSON
            return ResponseEntity.ok(Map.of(
                "answer", jsonResponse,
                "confidence", 0.5
            ));
        }
    }

    @PostMapping("/study-guide")
    public ResponseEntity<?> generateStudyGuide(@RequestBody Map<String, String> request) {
        String pyqText = request.get("pyqText");
        String qbText = request.get("qbText");

        if ((pyqText == null || pyqText.trim().isEmpty()) && (qbText == null || qbText.trim().isEmpty())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Provide at least one of Question Bank or PYQ text"));
        }

        String jsonResponse = geminiService.generateStudyGuide(pyqText, qbText);
        
        try {
            // Parse and return to ensure it's valid JSON
            return ResponseEntity.ok(mapper.readValue(jsonResponse, Map.class));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", "Failed to parse AI response", "raw", jsonResponse));
        }
    }

    @PostMapping("/roadmap")
    public ResponseEntity<?> generateRoadmap(@RequestBody Map<String, Object> request) {
        String pyqText = (String) request.get("pyqText");
        String qbText = (String) request.get("qbText");
        String examDate = (String) request.get("examDate");
        String currentDate = (String) request.get("currentDate");
        Integer subjectsCount = (Integer) request.get("subjectsCount");
        Integer daysRemaining = (Integer) request.get("daysRemaining");

        if (examDate == null || currentDate == null || subjectsCount == null || daysRemaining == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Missing required roadmap parameters"));
        }

        String jsonResponse = geminiService.generateRoadmap(subjectsCount, pyqText, qbText, examDate, currentDate, daysRemaining);
        
        try {
            return ResponseEntity.ok(mapper.readValue(jsonResponse, Map.class));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", "Failed to parse AI response", "raw", jsonResponse));
        }
    }
}
