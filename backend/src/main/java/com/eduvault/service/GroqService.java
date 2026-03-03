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
public class GroqService {

    private static final Logger logger = LoggerFactory.getLogger(GroqService.class);
    
    @Value("${app.groq.api-key:}")
    private String apiKey;
    
    private String getEffectiveApiKey() {
        if (apiKey != null && !apiKey.trim().isEmpty() && !apiKey.equals("${GROQ_API_KEY:}")) {
            return apiKey;
        }
        throw new IllegalStateException("GROQ_API_KEY is not configured. Please set the environment variable or update application.yml");
    }
    
    @Autowired
    private LocalJsonDatabase database;
    
    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper mapper = new ObjectMapper();

    private static final String GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

    @Async("groqTaskExecutor")
    public void processNoteAsync(String noteId) {
        try {
            String effectiveApiKey = getEffectiveApiKey();
            if (effectiveApiKey == null || effectiveApiKey.trim().isEmpty()) {
                logger.warn("Skipping AI processing: GROQ_API_KEY is not set.");
                markNoteAsFailed(noteId, "No API key configured");
                return;
            }
        } catch (IllegalStateException e) {
            logger.warn("Skipping AI processing for note {}: {}", noteId, e.getMessage());
            markNoteAsFailed(noteId, "API key not configured");
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
            logger.error("Failed to process note with Groq", e);
            markNoteAsFailed(noteId, "AI Processing failed: " + e.getMessage());
        }
    }

    private void markNoteAsFailed(String noteId, String reason) {
        database.getNoteById(noteId).ifPresent(note -> {
            note.setStatus("processed_no_ai");
            database.updateNote(note);
            logger.info("Note {} marked as {}. Reason: {}", noteId, note.getStatus(), reason);
        });
    }

    private List<String> extractTopics(String text) throws Exception {
        String systemInstruction = "You are an academic assistant that extracts exam-relevant topics. Return EXACTLY a JSON array of strings representing the top 8 important topics. Do not use markdown tags like ```json.";
        String prompt = "Extract the top 8 exam-relevant topics from the following study material. Return ONLY a valid JSON array of strings.\n\nText:\n" + text;
        
        String responseText = callGroq(systemInstruction, prompt, 0.0);
        
        if (responseText.startsWith("```json")) responseText = responseText.substring(7);
        if (responseText.endsWith("```")) responseText = responseText.substring(0, responseText.length() - 3);
        
        return mapper.readValue(responseText.trim(), new TypeReference<List<String>>() {});
    }

    private List<Note.Question> generateQuestions(String text) throws Exception {
        String systemInstruction = "You are an exam question generator. Return EXACTLY a JSON array of objects. Do not use markdown tags like ```json.";
        String prompt = "Generate 5 exam-style questions from the following study material.\nReturn EXACTLY this JSON format:\n[{\"q\": \"...\", \"type\": \"short|long|mcq\", \"difficulty\": \"easy|medium|hard\"}]\n\nText:\n" + text;
        
        String responseText = callGroq(systemInstruction, prompt, 0.2);
        
        if (responseText.startsWith("```json")) responseText = responseText.substring(7);
        if (responseText.endsWith("```")) responseText = responseText.substring(0, responseText.length() - 3);

        return mapper.readValue(responseText.trim(), new TypeReference<List<Note.Question>>() {});
    }

    public String askTutor(String question, String contextTexts) {
        try {
            String effectiveApiKey = getEffectiveApiKey();
            if (effectiveApiKey == null || effectiveApiKey.trim().isEmpty()) {
                return "{\"answer\": \"I cannot answer right now because the GROQ_API_KEY environment variable is not configured.\", \"confidence\": 0.0}";
            }
        } catch (IllegalStateException e) {
            return "{\"answer\": \"I cannot answer right now because the GROQ_API_KEY environment variable is not configured.\", \"confidence\": 0.0}";
        }

        try {
            // Truncate context to fit within token limits (3000 chars ≈ ~750 tokens)
            String truncatedContext = contextTexts;
            if (truncatedContext != null && truncatedContext.length() > 3000) {
                truncatedContext = truncatedContext.substring(0, 3000) + "\n...[truncated]";
            }

            String systemInstruction = "You are a knowledgeable AI tutor. Provide well-structured, detailed *structured* answers in 350-400 words. Synthesize information from context into a clear explanation — NEVER copy-paste raw text. Use markdown formatting (bold, bullet points, headers) for readability. Return ONLY a JSON object with 'answer' and 'confidence' keys. No markdown code blocks around the JSON.";
            String prompt = "Context:\n" + truncatedContext + "\n\nQuestion: " + question + "\n\nProvide a detailed, well-structured answer (350-400 words) using markdown formatting. Return: {\"answer\": \"your detailed answer here\", \"confidence\": 0.95}";
            
            logger.info("askTutor prompt length: {} chars", prompt.length());
            String responseText = callGroq(systemInstruction, prompt, 0.2);
            
            if (responseText.startsWith("```json")) responseText = responseText.substring(7);
            if (responseText.endsWith("```")) responseText = responseText.substring(0, responseText.length() - 3);
            
            return responseText.trim();
        } catch (Exception e) {
            logger.error("Failed to query tutor: {}", e.getMessage());
            return "{\"answer\": \"Sorry, I encountered an error while trying to answer your question.\", \"confidence\": 0.0}";
        }
    }

    public String generateStudyGuide(String pyqText, String qbText) {
        try {
            String effectiveApiKey = getEffectiveApiKey();
            if (effectiveApiKey == null || effectiveApiKey.trim().isEmpty()) {
                return "{\"error\": \"GROQ_API_KEY is not configured\"}";
            }
        } catch (IllegalStateException e) {
            return "{\"error\": \"GROQ_API_KEY is not configured\"}";
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
            
            String responseText = callGroq(systemInstruction, prompt, 0.2);
            
            if (responseText.startsWith("```json")) responseText = responseText.substring(7);
            if (responseText.endsWith("```")) responseText = responseText.substring(0, responseText.length() - 3);
            
            return responseText.trim();
        } catch (Exception e) {
            logger.error("Failed to generate study guide", e);
            return "{\"error\": \"Failed to generate study guide\"}";
        }
    }

    public String generateRoadmap(int subjectsCount, String pyqText, String qbText, String examDate, String currentDate, int daysRemaining) {
        try {
            String effectiveApiKey = getEffectiveApiKey();
            if (effectiveApiKey == null || effectiveApiKey.trim().isEmpty()) {
                return "{\"error\": \"GROQ_API_KEY is not configured\"}";
            }
        } catch (IllegalStateException e) {
            return "{\"error\": \"GROQ_API_KEY is not configured\"}";
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
            
            String responseText = callGroq(systemInstruction, prompt, 0.2);
            
            if (responseText.startsWith("```json")) responseText = responseText.substring(7);
            if (responseText.endsWith("```")) responseText = responseText.substring(0, responseText.length() - 3);
            
            return responseText.trim();
        } catch (Exception e) {
            logger.error("Failed to generate roadmap", e);
            return "{\"error\": \"Failed to generate roadmap\"}";
        }
    }

    private String callGroq(String systemInstruction, String prompt, double temperature) throws Exception {
        String effectiveApiKey = getEffectiveApiKey();

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(effectiveApiKey);

        Map<String, Object> requestBody = Map.of(
            "model", "llama-3.1-8b-instant",
            "messages", List.of(
                Map.of("role", "system", "content", systemInstruction),
                Map.of("role", "user", "content", prompt)
            ),
            "temperature", temperature,
            "response_format", Map.of("type", "json_object")
        );

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        int maxRetries = 3;
        int retryDelay = 1000;
        
        for (int attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                Map<String, Object> response = restTemplate.postForObject(GROQ_URL, entity, Map.class);
                
                if (response == null) {
                    throw new Exception("Groq API returned null response");
                }

                List<Map<String, Object>> choices = (List<Map<String, Object>>) response.get("choices");
                if (choices == null || choices.isEmpty()) {
                    logger.error("No choices in Groq response: {}", response);
                    throw new Exception("Groq returned no choices");
                }

                Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
                if (message == null) throw new Exception("No message in first choice");

                String text = (String) message.get("content");
                if (text == null) throw new Exception("Empty text part in response");

                return text;
            } catch (org.springframework.web.client.HttpStatusCodeException e) {
                int statusCode = e.getStatusCode().value();
                String responseBody = e.getResponseBodyAsString();
                
                logger.error("Groq API HTTP Error {} (attempt {}/{}): {}", statusCode, attempt, maxRetries, responseBody);
                
                if (statusCode == 401 || statusCode == 403) {
                    throw new Exception("CRITICAL: API key is invalid or unauthorized. Please verify your GROQ_API_KEY.");
                }
                
                if (statusCode == 429 || (statusCode >= 500 && statusCode < 600)) {
                    if (attempt == maxRetries) {
                        throw new Exception("Groq API Error after " + maxRetries + " attempts: " + e.getStatusText());
                    }
                    
                    logger.warn("Retrying in {} ms...", retryDelay);
                    Thread.sleep(retryDelay);
                    retryDelay *= 2;
                    continue;
                }
                
                throw new Exception("Groq API Error: " + e.getStatusText());
            } catch (InterruptedException ie) {
                Thread.currentThread().interrupt();
                throw new Exception("Interrupted during retry delay");
            } catch (Exception e) {
                logger.error("Failed to communicate with Groq or parse response (attempt {}/{}): {}", attempt, maxRetries, e.getMessage());
                if (attempt == maxRetries) {
                    throw new Exception("Internal AI Engine error: " + e.getMessage());
                }
                
                logger.warn("Retrying in {} ms...", retryDelay);
                Thread.sleep(retryDelay);
                retryDelay *= 2;
            }
        }
        
        throw new Exception("Failed after " + maxRetries + " attempts");
    }
}
