package com.eduvault.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

@Service
public class GitHubStorageService {

    private static final Logger log = LoggerFactory.getLogger(GitHubStorageService.class);
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    @Value("${app.github.enabled:true}")
    private boolean enabled;

    @Value("${app.github.token:${GITHUB_TOKEN:}}")
    private String token;

    @Value("${app.github.repo:${GITHUB_REPO:199adarsh/CampusAxis}}")
    private String repo;

    @Value("${app.github.branch:${GITHUB_BRANCH:main}}")
    private String branch;

    @Value("${app.github.okf-path:${GITHUB_OKF_PATH:backend/data/okf}}")
    private String okfBasePath;

    public GitHubStorageService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
    }

    public boolean isConfigured() {
        return enabled && token != null && !token.isBlank() && repo != null && !repo.isBlank();
    }

    /**
     * Asynchronously uploads or updates an OKF file in the GitHub repository.
     */
    public CompletableFuture<Boolean> syncOkfFileAsync(String subjectId, String fileName, String content) {
        if (!isConfigured()) {
            return CompletableFuture.completedFuture(false);
        }

        return CompletableFuture.supplyAsync(() -> {
            try {
                String fullPath = okfBasePath + "/" + subjectId + "/" + fileName;
                String apiUrl = "https://api.github.com/repos/" + repo + "/contents/" + fullPath;

                // 1. Check if file already exists to get its SHA
                String existingSha = getExistingFileSha(apiUrl);

                // 2. Prepare PUT payload
                Map<String, Object> payload = new HashMap<>();
                payload.put("message", "okf: sync " + subjectId + "/" + fileName + " [Render persistence]");
                payload.put("content", Base64.getEncoder().encodeToString(content.getBytes(StandardCharsets.UTF_8)));
                payload.put("branch", branch);
                if (existingSha != null && !existingSha.isBlank()) {
                    payload.put("sha", existingSha);
                }

                String jsonPayload = objectMapper.writeValueAsString(payload);

                HttpRequest request = HttpRequest.newBuilder()
                        .uri(URI.create(apiUrl))
                        .timeout(Duration.ofSeconds(15))
                        .header("Authorization", "Bearer " + token.trim())
                        .header("Accept", "application/vnd.github+json")
                        .header("X-GitHub-Api-Version", "2022-11-28")
                        .header("Content-Type", "application/json")
                        .PUT(HttpRequest.BodyPublishers.ofString(jsonPayload))
                        .build();

                HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

                if (response.statusCode() == 200 || response.statusCode() == 201) {
                    log.info("Successfully synced OKF file to GitHub: {}/{}", subjectId, fileName);
                    return true;
                } else {
                    log.warn("GitHub OKF sync returned status {}: {}", response.statusCode(), response.body());
                    return false;
                }
            } catch (Exception e) {
                log.error("Failed to sync OKF file to GitHub for {}/{}: {}", subjectId, fileName, e.getMessage());
                return false;
            }
        });
    }

    /**
     * Fetches raw OKF file content from GitHub repository.
     */
    public String fetchRawFile(String subjectId, String fileName) {
        try {
            String rawUrl = "https://raw.githubusercontent.com/" + repo + "/" + branch + "/" + okfBasePath + "/" + subjectId + "/" + fileName;
            HttpRequest.Builder reqBuilder = HttpRequest.newBuilder()
                    .uri(URI.create(rawUrl))
                    .timeout(Duration.ofSeconds(10))
                    .GET();

            if (token != null && !token.isBlank()) {
                reqBuilder.header("Authorization", "Bearer " + token.trim());
            }

            HttpResponse<String> response = httpClient.send(reqBuilder.build(), HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 200) {
                return response.body();
            }
        } catch (Exception e) {
            log.debug("Could not fetch remote OKF from GitHub: {}/{}", subjectId, fileName);
        }
        return null;
    }

    private String getExistingFileSha(String apiUrl) {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(apiUrl + "?ref=" + branch))
                    .timeout(Duration.ofSeconds(10))
                    .header("Authorization", "Bearer " + token.trim())
                    .header("Accept", "application/vnd.github+json")
                    .header("X-GitHub-Api-Version", "2022-11-28")
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 200) {
                JsonNode root = objectMapper.readTree(response.body());
                if (root.has("sha")) {
                    return root.get("sha").asText();
                }
            }
        } catch (Exception ignored) {
        }
        return null;
    }
}
