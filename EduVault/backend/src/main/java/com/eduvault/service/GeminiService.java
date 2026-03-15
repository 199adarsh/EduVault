package com.eduvault.service;

import com.eduvault.model.Note;
import com.eduvault.repository.LocalJsonDatabase;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@EnableAsync
public class GeminiService {

    private static final Logger logger = LoggerFactory.getLogger(GeminiService.class);
    
    @Value("${app.gemini.api-key:}")
    private String apiKey;
    
    // Hardcoded fallback if environment variables and application.yml fail to inject properly
    private final String HARDCODED_API_KEY = "AIzaSyA9Fvf6Ezazy3tAW8wx25kXvjZSWzx8QXM";

    private String getEffectiveApiKey() {
        if (apiKey != null && !apiKey.trim().isEmpty() && !apiKey.equals("${GEMINI_API_KEY:}")) {
            return apiKey;
        }
        return HARDCODED_API_KEY;
    }
    
    @Autowired
    private LocalJsonDatabase database;
    
    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper mapper = new ObjectMapper();

    private static final String GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=";

    @Async
    public void processNoteAsync(String noteId) {
        String effectiveApiKey = getEffectiveApiKey();
        if (effectiveApiKey == null || effectiveApiKey.trim().isEmpty()) {
            logger.warn("Skipping AI processing: GEMINI_API_KEY is not set.");
            markNoteAsFailed(noteId, "No API key configured");
            return;
        }

        Optional<Note> optionalNote = database.getNoteById(noteId);
        if (optionalNote.isEmpty()) return;
        Note note = optionalNote.get();

        String text = note.getExtractedText();
        if (text == null || text.trim().isEmpty() || "Failed to extract text.".equals(text) || "Text extraction only supported for PDFs in MVP.".equals(text)) {
             markNoteAsFailed(noteId, "Skipped: " + text);
             return;
        }

        try {
            // 1. Extract Topics
            List<String> topics = extractTopics(text);
            note.setAiImportantTopics(topics);

            // 2. Generate Questions
            List<Note.Question> questions = generateQuestions(text);
            note.setAiGeneratedQuestions(questions);

            // 3. Mark Done
            note.setStatus("ready");
            database.updateNote(note);

        } catch (Exception e) {
            logger.error("Failed to process note with Gemini", e);
            markNoteAsFailed(noteId, "AI Processing failed: " + e.getMessage());
        }
    }

    private void markNoteAsFailed(String noteId, String reason) {
        database.getNoteById(noteId).ifPresent(note -> {
            note.setStatus("processed_no_ai"); // Non-error state to allow viewing UI without AI
            database.updateNote(note);
            logger.info("Note {} marked as {}. Reason: {}", noteId, note.getStatus(), reason);
        });
    }

    private List<String> extractTopics(String text) throws Exception {
        String systemInstruction = "You are an academic assistant that extracts exam-relevant topics. Return EXACTLY a JSON array of strings representing the top 8 important topics. Do not use markdown tags like ```json.";
        String prompt = "Extract the top 8 exam-relevant topics from the following study material. Return ONLY a valid JSON array of strings.\n\nText:\n" + text;
        
        String responseText = callGemini(systemInstruction, prompt, 0.0);
        
        // Clean markdown if Gemini still returned it
        if (responseText.startsWith("```json")) {
            responseText = responseText.substring(7);
        }
        if (responseText.endsWith("```")) {
            responseText = responseText.substring(0, responseText.length() - 3);
        }
        
        return mapper.readValue(responseText.trim(), new TypeReference<List<String>>() {});
    }

    private List<Note.Question> generateQuestions(String text) throws Exception {
        String systemInstruction = "You are an exam question generator. Return EXACTLY a JSON array of objects. Do not use markdown tags like ```json.";
        String prompt = "Generate 5 exam-style questions from the following study material.\nReturn EXACTLY this JSON format:\n[{\"q\": \"...\", \"type\": \"short|long|mcq\", \"difficulty\": \"easy|medium|hard\"}]\n\nText:\n" + text;
        
        String responseText = callGemini(systemInstruction, prompt, 0.2);
        
        if (responseText.startsWith("```json")) {
            responseText = responseText.substring(7);
        }
        if (responseText.endsWith("```")) {
            responseText = responseText.substring(0, responseText.length() - 3);
        }

        return mapper.readValue(responseText.trim(), new TypeReference<List<Note.Question>>() {});
    }

    public String askTutor(String question, String contextTexts) {
        String effectiveApiKey = getEffectiveApiKey();
        if (effectiveApiKey == null || effectiveApiKey.trim().isEmpty()) {
            return "{\"answer\": \"I cannot answer right now because the GEMINI_API_KEY environment variable is not configured.\", \"confidence\": 0.0}";
        }

        try {
            String systemInstruction = "You are an AI tutor helping students understand academic concepts. Use the provided context to answer the question. Return EXACTLY a JSON object. No markdown tags.";
            String prompt = "Use the provided notes to answer the question.\nContext:\n" + contextTexts + "\n\nQuestion: " + question + "\n\nReturn EXACTLY:\n{\"answer\": \"...\", \"confidence\": 0.95}";
            
            String responseText = callGemini(systemInstruction, prompt, 0.2);
            
            if (responseText.startsWith("```json")) {
                responseText = responseText.substring(7);
            }
            if (responseText.endsWith("```")) {
                responseText = responseText.substring(0, responseText.length() - 3);
            }
            
            return responseText.trim();
        } catch (Exception e) {
            logger.error("Failed to query tutor", e);
            return "{\"answer\": \"Sorry, I encountered an error while trying to answer your question.\", \"confidence\": 0.0}";
        }
    }

    public String generateStudyGuide(String pyqText, String qbText) {
        String effectiveApiKey = getEffectiveApiKey();
        if (effectiveApiKey == null || effectiveApiKey.trim().isEmpty()) {
            return "{\"error\": \"GEMINI_API_KEY is not configured\"}";
        }

        try {
            String systemInstruction = "You are an expert academic planner. You will receive Previous Year Questions (PYQ) and Question Bank (QB) text. Generate a comprehensive Study Guide identifying important topics and classifying EVERY question from the texts into High, Medium, and Low priorities based on repetition and importance. CRITICAL: The total number of questions in your output MUST be equal to or less than the sum of the questions provided in the input materials. Do not invent new questions. Return EXACTLY a well-structured JSON format. DO NOT include markdown ticks like ```json";
            
            String prompt = "Generate a prioritized study guide from these materials:\n\n=== PYQ ===\n" 
                + (pyqText != null ? pyqText : "None") 
                + "\n\n=== Question Bank ===\n" 
                + (qbText != null ? qbText : "None")
                + "\n\nReturn EXACTLY this JSON structure:\n"
                + "{\n"
                + "  \"guide\": [\n"
                + "    {\n"
                + "      \"topic\": \"Topic Name\",\n"
                + "      \"priority\": \"High|Medium|Low\",\n"
                + "      \"questions\": [\"q1\", \"q2\"]\n"
                + "    }\n"
                + "  ]\n"
                + "}";
            
            String responseText = callGemini(systemInstruction, prompt, 0.2);
            
            if (responseText.startsWith("```json")) responseText = responseText.substring(7);
            if (responseText.endsWith("```")) responseText = responseText.substring(0, responseText.length() - 3);
            
            return responseText.trim();
        } catch (Exception e) {
            logger.error("Failed to generate study guide", e);
            return "{\"error\": \"Failed to generate study guide\"}";
        }
    }

    public String generateRoadmap(int subjectsCount, String pyqText, String qbText, String examDate, String currentDate, int daysRemaining) {
        String effectiveApiKey = getEffectiveApiKey();
        if (effectiveApiKey == null || effectiveApiKey.trim().isEmpty()) {
            return "{\"error\": \"GEMINI_API_KEY is not configured\"}";
        }

        try {
            String systemInstruction = "You are an expert exam scheduler. Generate a day-by-day checklist based on the total preparation time available. Return EXACTLY a well-structured JSON format. DO NOT include markdown ticks like ```json";
            
            String prompt = "Create a day-by-day study roadmap checklist.\n"
                + "- Exam Date: " + examDate + "\n"
                + "- Current Date: " + currentDate + "\n"
                + "- Days Remaining: " + daysRemaining + " days\n"
                + "- Number of Subjects: " + subjectsCount + "\n\n"
                + "Analyze these materials for relevance:\n"
                + "=== PYQ ===\n" + (pyqText != null ? pyqText : "None") + "\n\n"
                + "=== Question Bank ===\n" + (qbText != null ? qbText : "None") + "\n\n"
                + "Return EXACTLY this JSON structure:\n"
                + "{\n"
                + "  \"roadmap\": [\n"
                + "    {\n"
                + "      \"day\": \"Day 1\",\n"
                + "      \"date\": \"YYYY-MM-DD\",\n"
                + "      \"tasks\": [\n"
                + "        { \"task\": \"Study Topic X\", \"completed\": false },\n"
                + "        { \"task\": \"Practice Questions for Y\", \"completed\": false }\n"
                + "      ],\n"
                + "      \"milestone\": \"Optional revision checkpoint summary\"\n"
                + "    }\n"
                + "  ]\n"
                + "}";
            
            String responseText = callGemini(systemInstruction, prompt, 0.2);
            
            if (responseText.startsWith("```json")) responseText = responseText.substring(7);
            if (responseText.endsWith("```")) responseText = responseText.substring(0, responseText.length() - 3);
            
            return responseText.trim();
        } catch (Exception e) {
            logger.error("Failed to generate roadmap", e);
            return "{\"error\": \"Failed to generate roadmap\"}";
        }
    }

    private String callGemini(String systemInstruction, String prompt, double temperature) throws Exception {
        String effectiveApiKey = getEffectiveApiKey();
        String url = GEMINI_URL + effectiveApiKey;

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        // Required Gemini API v1beta /generateContent structure
        Map<String, Object> requestBody = Map.of(
            "systemInstruction", Map.of(
                "parts", List.of(Map.of("text", systemInstruction))
            ),
            "contents", List.of(
                Map.of(
                    "role", "user",
                    "parts", List.of(Map.of("text", prompt))
                )
            ),
            "generationConfig", Map.of(
                "temperature", temperature,
                "responseMimeType", "application/json"
            )
        );

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, HttpHeaders.EMPTY);
        
        // Use RestTemplate
        Map<String, Object> response = restTemplate.postForObject(url, requestBody, Map.class);

        // Parse response
        try {
             List<Map<String, Object>> candidates = (List<Map<String, Object>>) response.get("candidates");
             Map<String, Object> content = (Map<String, Object>) candidates.get(0).get("content");
             List<Map<String, Object>> parts = (List<Map<String, Object>>) content.get("parts");
             return (String) parts.get(0).get("text");
        } catch (Exception e) {
             logger.error("Failed to parse Gemini response: {}", response);
             throw new Exception("Unexpected API response format");
        }
    }
}
