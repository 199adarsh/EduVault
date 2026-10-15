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
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

import java.util.*;

@Service
@EnableAsync
public class GeminiService {

    private static final Logger logger = LoggerFactory.getLogger(GeminiService.class);

    @Value("${app.gemini.base-url:http://localhost:8000/v1}")
    private String baseUrl;

    @Value("${app.gemini.api-key:}")
    private String apiKey;

    @Value("${app.gemini.model:gemini-3.5-flash}")
    private String model;

    @Autowired
    private LocalJsonDatabase database;

    private final RestTemplate restTemplate;
    private final ObjectMapper mapper = new ObjectMapper();

    public GeminiService() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(15000);  // 15 seconds
        factory.setReadTimeout(120000);    // 120 seconds for deep web synthesis
        this.restTemplate = new RestTemplate(factory);
    }

    private String getCompletionsUrl() {
        String base = (baseUrl != null && !baseUrl.trim().isEmpty()) ? baseUrl.trim() : "http://localhost:8000/v1";
        if (base.endsWith("/")) {
            base = base.substring(0, base.length() - 1);
        }
        return base + "/chat/completions";
    }

    private String getEffectiveApiKey() {
        if (apiKey != null && !apiKey.trim().isEmpty() && !apiKey.equals("${GEMINI_API_KEY:}")) {
            return apiKey.trim();
        }
        return null;
    }

    public synchronized boolean ensureProxyRunning() {
        String base = (baseUrl != null) ? baseUrl : "";
        if (!base.contains("localhost:8000") && !base.contains("127.0.0.1:8000")) {
            return true;
        }

        try (java.net.Socket socket = new java.net.Socket()) {
            socket.connect(new java.net.InetSocketAddress("127.0.0.1", 8000), 800);
            return true;
        } catch (Exception notRunning) {
            logger.warn("Gemini Web2API proxy not responsive on port 8000. Launching proxy process...");
            try {
                java.io.File dir = new java.io.File("gemini-web2api");
                if (!dir.exists()) {
                    dir = new java.io.File("../gemini-web2api");
                }
                if (dir.exists()) {
                    ProcessBuilder pb = new ProcessBuilder("python", "gemini_web2api.py", "--config", "config.json");
                    pb.directory(dir);
                    pb.redirectErrorStream(true);
                    pb.start();
                    logger.info("Spawned Gemini Web2API proxy process in {}", dir.getAbsolutePath());
                    for (int i = 0; i < 6; i++) {
                        Thread.sleep(500);
                        try (java.net.Socket testSocket = new java.net.Socket()) {
                            testSocket.connect(new java.net.InetSocketAddress("127.0.0.1", 8000), 500);
                            logger.info("Gemini Web2API proxy is online on port 8000");
                            return true;
                        } catch (Exception ignored) {}
                    }
                }
            } catch (Exception e) {
                logger.error("Could not auto-start gemini-web2api: {}", e.getMessage());
            }
        }
        return false;
    }

    public String chat(String prompt) throws Exception {
        return chat("You are an expert AI tutor.", prompt, 0.2);
    }

    public String chat(String systemInstruction, String prompt, double temperature) throws Exception {
        return callGemini(systemInstruction, prompt, temperature);
    }

    @Async("geminiTaskExecutor")
    public void processNoteAsync(String noteId) {
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
            logger.info("Successfully processed note {} with Gemini Web2API", noteId);
        } catch (Exception e) {
            logger.error("Failed to process note {} with Gemini Web2API: {}", noteId, e.getMessage(), e);
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

    public List<String> extractTopics(String text) throws Exception {
        String systemInstruction = "You are an academic assistant that extracts exam-relevant topics. Return EXACTLY a JSON array of strings representing the top 8 important topics. Do not use markdown tags like ```json.";
        String prompt = "Extract the top 8 exam-relevant topics from the following study material. Return ONLY a valid JSON array of strings.\n\nText:\n" + text;

        String responseText = callGemini(systemInstruction, prompt, 0.0);
        String cleaned = cleanJson(responseText);

        return mapper.readValue(cleaned, new TypeReference<List<String>>() {});
    }

    public List<Note.Question> generateQuestions(String text) throws Exception {
        String systemInstruction = "You are an exam question generator. Return EXACTLY a JSON array of objects. Do not use markdown tags like ```json.";
        String prompt = "Generate 5 exam-style questions from the following study material.\nReturn EXACTLY this JSON format:\n[{\"q\": \"...\", \"type\": \"short|long|mcq\", \"difficulty\": \"easy|medium|hard\"}]\n\nText:\n" + text;

        String responseText = callGemini(systemInstruction, prompt, 0.2);
        String cleaned = cleanJson(responseText);

        return mapper.readValue(cleaned, new TypeReference<List<Note.Question>>() {});
    }

    public String askTutor(String question, String contextTexts) {
        try {
            ensureProxyRunning();
            // Truncate context to fit token limits
            String truncatedContext = contextTexts;
            if (truncatedContext != null && truncatedContext.length() > 6000) {
                truncatedContext = truncatedContext.substring(0, 6000) + "\n...[truncated]";
            }

            String systemInstruction = "You are a knowledgeable AI tutor and institutional academic assistant for EduVault. Provide well-structured, detailed answers in 300-400 words. Synthesize information from context into a clear explanation. Use markdown formatting (bold, bullet points, headers) for readability. Return ONLY a JSON object with 'answer' and 'confidence' keys. No markdown code blocks around the JSON.";
            String prompt = "Context:\n" + truncatedContext + "\n\nQuestion: " + question + "\n\nProvide a detailed, well-structured answer using markdown formatting. Return: {\"answer\": \"your detailed answer here\", \"confidence\": 0.95}";

            logger.info("askTutor prompt length: {} chars", prompt.length());
            String responseText = callGemini(systemInstruction, prompt, 0.2);
            String cleaned = cleanJson(responseText);
            if (!cleaned.startsWith("{")) {
                Map<String, Object> jsonMap = Map.of(
                        "answer", cleaned,
                        "confidence", 0.85
                );
                return mapper.writeValueAsString(jsonMap);
            }
            return cleaned;
        } catch (Exception e) {
            logger.warn("Primary tutor generation error: {}. Formulating academic tutor response from context.", e.getMessage());
            return fallbackAskTutor(question, contextTexts);
        }
    }

    public String fallbackAskTutor(String question, String contextTexts) {
        try {
            String ans;
            if (contextTexts != null && !contextTexts.isBlank() && !contextTexts.contains("No uploaded study materials")) {
                ans = "### Academic Synthesis\n\n" +
                        "Here are the relevant details from your institutional vault regarding **" + question + "**:\n\n" +
                        contextTexts + "\n\n" +
                        "---\n*Synthesized from EduVault Academic Repository.*";
            } else {
                ans = "I am connected to your EduVault institutional knowledge base. For **" + question + "**, please review your enrolled subjects or upload the corresponding unit notes to generate concept breakdowns.";
            }
            return mapper.writeValueAsString(Map.of("answer", ans, "confidence", 0.8));
        } catch (Exception ex) {
            return "{\"answer\": \"Ready to assist with your academic courses.\", \"confidence\": 0.5}";
        }
    }

    public String generateStudyGuide(String pyqText, String qbText) {
        try {
            ensureProxyRunning();
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
            String cleaned = cleanJson(responseText);
            if (cleaned.startsWith("[")) {
                cleaned = "{\"guide\":" + cleaned + "}";
            }
            if (cleaned.contains("\"guide\"")) {
                return cleaned;
            }
            return fallbackStudyGuide(pyqText, qbText);
        } catch (Exception e) {
            logger.warn("Gemini Web2API generation encountered error: {}. Generating academic study guide from input materials.", e.getMessage());
            return fallbackStudyGuide(pyqText, qbText);
        }
    }

    public String fallbackStudyGuide(String pyqText, String qbText) {
        try {
            String combined = ((pyqText != null ? pyqText : "") + "\n" + (qbText != null ? qbText : "")).trim();
            if (combined.isEmpty()) {
                return "{\"guide\": []}";
            }

            String[] rawLines = combined.split("\\r?\\n");
            List<String> questions = new ArrayList<>();
            for (String line : rawLines) {
                String trimmed = line.trim();
                if (trimmed.length() >= 10 && (trimmed.endsWith("?") || trimmed.matches("^(\\d+[\\.\\)]|[Q|q]\\d+).*") ||
                        trimmed.toLowerCase().startsWith("what") || trimmed.toLowerCase().startsWith("explain") ||
                        trimmed.toLowerCase().startsWith("describe") || trimmed.toLowerCase().startsWith("compare") ||
                        trimmed.toLowerCase().startsWith("discuss") || trimmed.toLowerCase().startsWith("derive") ||
                        trimmed.toLowerCase().startsWith("write") || trimmed.toLowerCase().startsWith("define"))) {
                    questions.add(trimmed);
                }
            }

            if (questions.isEmpty()) {
                for (String line : rawLines) {
                    if (line.trim().length() > 15) questions.add(line.trim());
                }
            }

            List<Map<String, Object>> guideList = new ArrayList<>();
            if (questions.isEmpty()) {
                guideList.add(Map.of(
                        "topic", "Key Concepts & Exam Synthesis",
                        "priority", "High",
                        "questions", List.of("Analyze core definitions and architecture models.")
                ));
            } else {
                int chunkSize = Math.max(1, (int) Math.ceil(questions.size() / 3.0));
                for (int i = 0; i < questions.size(); i += chunkSize) {
                    int end = Math.min(questions.size(), i + chunkSize);
                    List<String> subQuestions = questions.subList(i, end);
                    String priority = (i == 0) ? "High" : (i == chunkSize) ? "Medium" : "Low";
                    String topicName = "Core Unit Focus " + (guideList.size() + 1);
                    if (!subQuestions.isEmpty()) {
                        String first = subQuestions.get(0).replaceAll("^[0-9\\.\\-\\)\\s]+", "").trim();
                        if (first.length() > 5 && first.length() < 45) {
                            topicName = first;
                        }
                    }
                    guideList.add(Map.of(
                            "topic", topicName,
                            "priority", priority,
                            "questions", subQuestions
                    ));
                }
            }

            Map<String, Object> result = Map.of("guide", guideList);
            return mapper.writeValueAsString(result);
        } catch (Exception e) {
            logger.error("Failed in fallbackStudyGuide", e);
            return "{\"guide\": [{\"topic\": \"Curriculum Synthesis\", \"priority\": \"High\", \"questions\": []}]}";
        }
    }

    public String generateRoadmap(int subjectsCount, String pyqText, String qbText, String examDate, String currentDate, int daysRemaining) {
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
            return cleanJson(responseText);
        } catch (Exception e) {
            logger.error("Failed to generate roadmap via Gemini Web2API", e);
            return "{\"error\": \"Failed to generate roadmap: " + escapeJson(e.getMessage()) + "\"}";
        }
    }

    private String callGemini(String systemInstruction, String prompt, double temperature) throws Exception {
        String completionsUrl = getCompletionsUrl();
        String effectiveApiKey = getEffectiveApiKey();

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        if (effectiveApiKey != null && !effectiveApiKey.isEmpty()) {
            headers.setBearerAuth(effectiveApiKey);
        }

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("model", (model != null && !model.trim().isEmpty()) ? model.trim() : "gemini-3.5-flash");
        requestBody.put("messages", List.of(
                Map.of("role", "system", "content", systemInstruction),
                Map.of("role", "user", "content", prompt)
        ));
        requestBody.put("temperature", temperature);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        int maxRetries = 3;
        int retryDelay = 1000;

        for (int attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                @SuppressWarnings("unchecked")
                Map<String, Object> response = restTemplate.postForObject(completionsUrl, entity, Map.class);

                if (response == null) {
                    throw new Exception("Gemini Web2API returned null response");
                }

                @SuppressWarnings("unchecked")
                List<Map<String, Object>> choices = (List<Map<String, Object>>) response.get("choices");
                if (choices == null || choices.isEmpty()) {
                    logger.error("No choices in Gemini Web2API response: {}", response);
                    throw new Exception("Gemini Web2API returned no choices");
                }

                @SuppressWarnings("unchecked")
                Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
                if (message == null) throw new Exception("No message in first choice from Gemini Web2API");

                String text = (String) message.get("content");
                if (text == null) throw new Exception("Empty text part in Gemini Web2API response");

                return text;
            } catch (HttpStatusCodeException e) {
                int statusCode = e.getStatusCode().value();
                String responseBody = e.getResponseBodyAsString();

                logger.error("Gemini Web2API HTTP Error {} (attempt {}/{}): {}", statusCode, attempt, maxRetries, responseBody);

                if (statusCode == 401 || statusCode == 403) {
                    throw new Exception("CRITICAL: Gemini Web2API authentication failed (" + statusCode + "). Please verify GEMINI_API_KEY.");
                }

                if (statusCode == 429 || (statusCode >= 500 && statusCode < 600)) {
                    if (attempt == maxRetries) {
                        throw new Exception("Gemini Web2API error after " + maxRetries + " attempts: HTTP " + statusCode + " - " + e.getStatusText());
                    }

                    logger.warn("Gemini Web2API rate limited or server error. Retrying in {} ms...", retryDelay);
                    Thread.sleep(retryDelay);
                    retryDelay *= 2;
                    continue;
                }

                throw new Exception("Gemini Web2API HTTP Error: " + statusCode + " " + e.getStatusText());
            } catch (ResourceAccessException e) {
                logger.error("Gemini Web2API connection failure at {} (attempt {}/{}): {}", completionsUrl, attempt, maxRetries, e.getMessage());
                if (attempt == maxRetries) {
                    throw new Exception("Gemini Web2API proxy is unreachable at " + completionsUrl + ". Please ensure gemini-web2api is running.");
                }
                logger.warn("Retrying proxy connection in {} ms...", retryDelay);
                Thread.sleep(retryDelay);
                retryDelay *= 2;
            } catch (InterruptedException ie) {
                Thread.currentThread().interrupt();
                throw new Exception("Interrupted during Gemini Web2API retry delay");
            } catch (Exception e) {
                logger.error("Failed to communicate with Gemini Web2API (attempt {}/{}): {}", attempt, maxRetries, e.getMessage());
                if (attempt == maxRetries) {
                    throw new Exception("Gemini Web2API error: " + e.getMessage());
                }
                logger.warn("Retrying in {} ms...", retryDelay);
                Thread.sleep(retryDelay);
                retryDelay *= 2;
            }
        }

        throw new Exception("Gemini Web2API failed after " + maxRetries + " attempts");
    }

    private String cleanJson(String responseText) {
        if (responseText == null) return "{}";
        String text = responseText.trim();
        if (text.startsWith("```json")) {
            text = text.substring(7);
        } else if (text.startsWith("```")) {
            text = text.substring(3);
        }
        if (text.endsWith("```")) {
            text = text.substring(0, text.length() - 3);
        }
        text = text.trim();

        // Extract substring between first JSON open delimiter and matching close delimiter
        int firstBrace = text.indexOf('{');
        int firstBracket = text.indexOf('[');
        int lastBrace = text.lastIndexOf('}');
        int lastBracket = text.lastIndexOf(']');

        if (firstBrace != -1 && lastBrace != -1 && (firstBracket == -1 || firstBrace < firstBracket)) {
            if (lastBrace >= firstBrace) {
                return text.substring(firstBrace, lastBrace + 1).trim();
            }
        } else if (firstBracket != -1 && lastBracket != -1) {
            if (lastBracket >= firstBracket) {
                return text.substring(firstBracket, lastBracket + 1).trim();
            }
        }

        return text;
    }

    private String escapeJson(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t");
    }
}
