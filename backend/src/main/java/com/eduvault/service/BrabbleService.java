package com.eduvault.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class BrabbleService {

    private static final Logger logger = LoggerFactory.getLogger(BrabbleService.class);

    @Value("${app.brabble.api-key:brbl_647d9b74cdfee2bfec25641315f5b9e3c3bb39edd13e65058a1d9105b40a1fa3}")
    private String apiKey;

    @Value("${app.brabble.base-url:https://brabble.ai/api}")
    private String baseUrl;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    private final ObjectMapper objectMapper = new ObjectMapper();

    // Cache structure: Key -> CachedResponse with 15-minute TTL to respect 1,000 req/day limit
    private static class CachedEntry {
        final String json;
        final Instant expiresAt;

        CachedEntry(String json, Duration ttl) {
            this.json = json;
            this.expiresAt = Instant.now().plus(ttl);
        }

        boolean isExpired() {
            return Instant.now().isAfter(expiresAt);
        }
    }

    private final Map<String, CachedEntry> cache = new ConcurrentHashMap<>();
    private static final Duration CACHE_TTL = Duration.ofMinutes(15);

    public String getHackathons(String hub, String city, String platform, String type,
                                String mode, Boolean free, String search,
                                Integer limit, Integer offset) {

        String effectiveHub = (hub != null && !hub.isBlank()) ? hub : "hackathons";
        int effectiveLimit = (limit != null && limit > 0 && limit <= 50) ? limit : 12;
        int effectiveOffset = (offset != null && offset >= 0) ? offset : 0;

        String cacheKey = String.format("%s|%s|%s|%s|%s|%s|%s|%d|%d",
                effectiveHub,
                city != null ? city.toLowerCase().trim() : "default",
                platform != null ? platform : "",
                type != null ? type : "",
                mode != null ? mode : "",
                free != null ? free.toString() : "",
                search != null ? search : "",
                effectiveLimit,
                effectiveOffset);

        CachedEntry cached = cache.get(cacheKey);
        if (cached != null && !cached.isExpired()) {
            return cached.json;
        }

        try {
            // Build query params
            StringBuilder qb = new StringBuilder();
            qb.append("hub=").append(URLEncoder.encode(effectiveHub, StandardCharsets.UTF_8));
            qb.append("&limit=").append(effectiveLimit);
            qb.append("&offset=").append(effectiveOffset);

            if (city != null && !city.isBlank() && !city.equalsIgnoreCase("all")) {
                qb.append("&city=").append(URLEncoder.encode(city.trim(), StandardCharsets.UTF_8));
            }
            if (platform != null && !platform.isBlank()) {
                qb.append("&platform=").append(URLEncoder.encode(platform.trim(), StandardCharsets.UTF_8));
            }
            if (type != null && !type.isBlank()) {
                qb.append("&type=").append(URLEncoder.encode(type.trim(), StandardCharsets.UTF_8));
            }
            if (mode != null && !mode.isBlank()) {
                qb.append("&mode=").append(URLEncoder.encode(mode.trim(), StandardCharsets.UTF_8));
            }
            if (free != null) {
                qb.append("&free=").append(free);
            }
            if (search != null && !search.isBlank()) {
                qb.append("&search=").append(URLEncoder.encode(search.trim(), StandardCharsets.UTF_8));
            }

            URI uri = URI.create(baseUrl + "/listings?" + qb.toString());

            HttpRequest.Builder reqBuilder = HttpRequest.newBuilder()
                    .uri(uri)
                    .header("Accept", "application/json")
                    .header("User-Agent", "Campusaxis/1.0")
                    .timeout(Duration.ofSeconds(12))
                    .GET();

            if (apiKey != null && !apiKey.isBlank()) {
                reqBuilder.header("Authorization", "Bearer " + apiKey)
                          .header("x-api-key", apiKey);
            }

            HttpRequest request = reqBuilder.build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() == 200) {
                String responseBody = response.body();
                cache.put(cacheKey, new CachedEntry(responseBody, CACHE_TTL));
                return responseBody;
            } else {
                logger.warn("Brabble API responded with status {}: {}", response.statusCode(), response.body());
                if (cached != null) {
                    return cached.json; // Serve stale on error
                }
                return response.body();
            }

        } catch (Exception e) {
            logger.error("Error calling Brabble.ai API: {}", e.getMessage(), e);
            if (cached != null) {
                return cached.json;
            }
            return "{\"total\":0,\"count\":0,\"listings\":[],\"error\":\"" + e.getMessage() + "\"}";
        }
    }
}
