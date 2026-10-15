package com.eduvault;

import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

public class GeminiTest {
    public static void main(String[] args) {
        try {
            String baseUrl = System.getenv("GEMINI_BASE_URL");
            if (baseUrl == null || baseUrl.trim().isEmpty()) {
                baseUrl = "http://localhost:8000/v1";
            }
            if (baseUrl.endsWith("/")) {
                baseUrl = baseUrl.substring(0, baseUrl.length() - 1);
            }
            String url = baseUrl + "/chat/completions";

            String apiKey = System.getenv("GEMINI_API_KEY");
            String model = System.getenv("GEMINI_MODEL");
            if (model == null || model.trim().isEmpty()) {
                model = "gemini-3.5-flash";
            }

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            if (apiKey != null && !apiKey.trim().isEmpty()) {
                headers.setBearerAuth(apiKey.trim());
            }

            Map<String, Object> body = Map.of(
                    "model", model,
                    "messages", List.of(
                            Map.of("role", "system", "content", "You are an AI tutor."),
                            Map.of("role", "user", "content", "Return EXACTLY a JSON object with 'answer' and 'confidence' keys.")
                    ),
                    "temperature", 0.2
            );

            RestTemplate restTemplate = new RestTemplate();
            Map<?, ?> response = restTemplate.postForObject(url, new HttpEntity<>(body, headers), Map.class);
            System.out.println("Response: " + response);
        } catch (Exception e) {
            System.err.println("Gemini Web2API connection test failed: " + e.getMessage());
        }
    }
}
