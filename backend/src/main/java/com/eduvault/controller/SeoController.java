package com.eduvault.controller;

import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;

@RestController
public class SeoController {

    private static final String SITEMAP_CONTENT = """
            <?xml version="1.0" encoding="UTF-8"?>
            <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
              <url>
                <loc>https://campusaxis.onrender.com/</loc>
                <lastmod>2026-11-04</lastmod>
                <changefreq>daily</changefreq>
                <priority>1.0</priority>
              </url>
              <url>
                <loc>https://campusaxis.onrender.com/notes</loc>
                <lastmod>2026-11-04</lastmod>
                <changefreq>daily</changefreq>
                <priority>0.9</priority>
              </url>
              <url>
                <loc>https://campusaxis.onrender.com/ai-assistant</loc>
                <lastmod>2026-11-04</lastmod>
                <changefreq>weekly</changefreq>
                <priority>0.8</priority>
              </url>
              <url>
                <loc>https://campusaxis.onrender.com/attendance</loc>
                <lastmod>2026-11-04</lastmod>
                <changefreq>daily</changefreq>
                <priority>0.8</priority>
              </url>
              <url>
                <loc>https://campusaxis.onrender.com/roadmaps</loc>
                <lastmod>2026-11-04</lastmod>
                <changefreq>weekly</changefreq>
                <priority>0.8</priority>
              </url>
              <url>
                <loc>https://campusaxis.onrender.com/announcements</loc>
                <lastmod>2026-11-04</lastmod>
                <changefreq>daily</changefreq>
                <priority>0.7</priority>
              </url>
            </urlset>
            """.stripIndent();

    private static final String ROBOTS_CONTENT = """
            # Robots.txt for CampusAxis (https://campusaxis.onrender.com)
            User-agent: *
            Allow: /

            # Search Engine Crawlers
            User-agent: Googlebot
            Allow: /

            User-agent: Bingbot
            Allow: /

            User-agent: Applebot
            Allow: /

            User-agent: DuckDuckBot
            Allow: /

            User-agent: Yandex
            Allow: /

            User-agent: Baiduspider
            Allow: /

            # AI Crawlers & Search Assistants
            User-agent: GPTBot
            Allow: /

            User-agent: ChatGPT-User
            Allow: /

            User-agent: ClaudeBot
            Allow: /

            User-agent: anthropic-ai
            Allow: /

            User-agent: PerplexityBot
            Allow: /

            User-agent: CCBot
            Allow: /

            User-agent: Google-Extended
            Allow: /

            # Sitemap Index
            Sitemap: https://campusaxis.onrender.com/sitemap.xml
            """.stripIndent();

    @GetMapping(value = "/sitemap.xml", produces = "application/xml;charset=UTF-8")
    public ResponseEntity<String> getSitemap() {
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_TYPE, "application/xml;charset=UTF-8")
                .header(HttpHeaders.CACHE_CONTROL, "public, max-age=3600")
                .body(SITEMAP_CONTENT);
    }

    @GetMapping(value = "/robots.txt", produces = "text/plain;charset=UTF-8")
    public ResponseEntity<String> getRobots() {
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_TYPE, "text/plain;charset=UTF-8")
                .header(HttpHeaders.CACHE_CONTROL, "public, max-age=3600")
                .body(ROBOTS_CONTENT);
    }
}
