package com.eduvault.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.yaml.snakeyaml.Yaml;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * Service for caching, frontmatter filtering, and serving Google OKF (Open Knowledge Format)
 * academic markdown knowledge bundles to accelerate AI chat query response times.
 */
@Service
public class OkfKnowledgeService {

    private static final Logger logger = LoggerFactory.getLogger(OkfKnowledgeService.class);

    @Value("${app.storage.local-dir:./data}")
    private String storageLocalDir = "./data";

    public void setStorageLocalDir(String storageLocalDir) {
        this.storageLocalDir = storageLocalDir != null ? storageLocalDir : "./data";
    }

    @Autowired(required = false)
    private OkfGeneratorService okfGeneratorService;

    @Autowired(required = false)
    private GitHubStorageService gitHubStorageService;

    private final Map<String, CachedSubjectBundle> bundleCache = new ConcurrentHashMap<>();

    // --- Inner Models ---

    public static class OkfDocument {
        private String subjectId;
        private String noteId;
        private String unit;
        private String title;
        private List<String> tags;
        private List<String> syllabusTopics;
        private List<String> sources;
        private String markdownBody;
        private String status;
        private Instant lastCompiled;
        private Map<String, Object> frontmatter;

        public OkfDocument() {
            this.tags = new ArrayList<>();
            this.syllabusTopics = new ArrayList<>();
            this.sources = new ArrayList<>();
            this.lastCompiled = Instant.now();
            this.status = "active";
            this.frontmatter = new HashMap<>();
        }

        public OkfDocument(String subjectId, String noteId, String unit, String title,
                           List<String> tags, List<String> syllabusTopics, String markdownBody) {
            this.subjectId = subjectId;
            this.noteId = noteId;
            this.unit = unit != null ? unit : "General";
            this.title = title != null ? title : (noteId != null ? noteId : "Note");
            this.tags = tags != null ? new ArrayList<>(tags) : new ArrayList<>();
            this.syllabusTopics = syllabusTopics != null ? new ArrayList<>(syllabusTopics) : new ArrayList<>();
            this.sources = new ArrayList<>();
            this.markdownBody = markdownBody != null ? markdownBody : "";
            this.status = "active";
            this.lastCompiled = Instant.now();
            this.frontmatter = new HashMap<>();
        }

        public String getSubjectId() { return subjectId; }
        public void setSubjectId(String subjectId) { this.subjectId = subjectId; }

        public String getNoteId() { return noteId; }
        public void setNoteId(String noteId) { this.noteId = noteId; }

        public String getUnit() { return unit; }
        public void setUnit(String unit) { this.unit = unit; }

        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }

        public List<String> getTags() { return tags; }
        public void setTags(List<String> tags) { this.tags = tags != null ? tags : new ArrayList<>(); }

        public List<String> getSyllabusTopics() { return syllabusTopics; }
        public void setSyllabusTopics(List<String> syllabusTopics) {
            this.syllabusTopics = syllabusTopics != null ? syllabusTopics : new ArrayList<>();
        }

        public List<String> getSources() { return sources; }
        public void setSources(List<String> sources) { this.sources = sources != null ? sources : new ArrayList<>(); }

        public String getMarkdownBody() { return markdownBody; }
        public void setMarkdownBody(String markdownBody) { this.markdownBody = markdownBody != null ? markdownBody : ""; }

        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }

        public Instant getLastCompiled() { return lastCompiled; }
        public void setLastCompiled(Instant lastCompiled) { this.lastCompiled = lastCompiled; }

        public Map<String, Object> getFrontmatter() { return frontmatter; }
        public void setFrontmatter(Map<String, Object> frontmatter) {
            this.frontmatter = frontmatter != null ? frontmatter : new HashMap<>();
        }
    }

    public static class CachedSubjectBundle {
        private final String subjectId;
        private final List<OkfDocument> documents;
        private final String indexMarkdown;
        private final Map<String, Object> indexFrontmatter;
        private final Instant lastLoaded;

        public CachedSubjectBundle(String subjectId, List<OkfDocument> documents,
                                   String indexMarkdown, Map<String, Object> indexFrontmatter) {
            this.subjectId = subjectId;
            this.documents = documents != null ? Collections.unmodifiableList(new ArrayList<>(documents)) : Collections.emptyList();
            this.indexMarkdown = indexMarkdown;
            this.indexFrontmatter = indexFrontmatter != null ? Collections.unmodifiableMap(new HashMap<>(indexFrontmatter)) : Collections.emptyMap();
            this.lastLoaded = Instant.now();
        }

        public String getSubjectId() { return subjectId; }
        public List<OkfDocument> getDocuments() { return documents; }
        public String getIndexMarkdown() { return indexMarkdown; }
        public Map<String, Object> getIndexFrontmatter() { return indexFrontmatter; }
        public Instant getLastLoaded() { return lastLoaded; }
    }

    // --- Cache Management ---

    public void loadBundle(String subjectId, List<OkfDocument> docs) {
        if (subjectId == null) return;
        bundleCache.put(subjectId, new CachedSubjectBundle(subjectId, docs, null, null));
    }

    public boolean isKnowledgeReady(String subjectId) {
        if (subjectId == null || subjectId.isBlank()) return false;
        CachedSubjectBundle bundle = bundleCache.get(subjectId);
        if (bundle != null && !bundle.getDocuments().isEmpty()) {
            return true;
        }
        CachedSubjectBundle loaded = loadSubjectBundleFromDisk(subjectId);
        if (loaded != null && !loaded.getDocuments().isEmpty()) {
            bundleCache.put(subjectId, loaded);
            return true;
        }
        return false;
    }

    public Optional<String> getSubjectIndex(String subjectId) {
        if (subjectId == null || subjectId.isBlank()) return Optional.empty();
        CachedSubjectBundle bundle = bundleCache.get(subjectId);
        if (bundle == null) {
            bundle = loadSubjectBundleFromDisk(subjectId);
            if (bundle != null) {
                bundleCache.put(subjectId, bundle);
            }
        }
        if (bundle != null && bundle.getIndexMarkdown() != null && !bundle.getIndexMarkdown().isBlank()) {
            return Optional.of(bundle.getIndexMarkdown());
        }
        return Optional.empty();
    }

    public void clearCache() {
        bundleCache.clear();
    }

    public boolean preloadSubject(String subjectId) {
        if (subjectId == null || subjectId.isBlank()) return false;
        CachedSubjectBundle bundle = loadSubjectBundleFromDisk(subjectId);
        if (bundle != null && !bundle.getDocuments().isEmpty()) {
            bundleCache.put(subjectId, bundle);
            return true;
        }
        return false;
    }

    public CachedSubjectBundle getCachedBundle(String subjectId) {
        if (subjectId == null) return null;
        CachedSubjectBundle bundle = bundleCache.get(subjectId);
        if (bundle == null) {
            bundle = loadSubjectBundleFromDisk(subjectId);
            if (bundle != null) {
                bundleCache.put(subjectId, bundle);
            }
        }
        return bundle;
    }

    // --- Knowledge Context Construction ---

    public Optional<String> buildSubjectKnowledgeContext(String subjectId, String question) {
        return buildKnowledgeContext(subjectId, question, null);
    }

    public Optional<String> buildSubjectKnowledgeContext(String subjectId, String question, String optionalUnit) {
        return buildKnowledgeContext(subjectId, question, optionalUnit);
    }

    public Optional<String> buildKnowledgeContext(String subjectId, String question) {
        return buildKnowledgeContext(subjectId, question, null);
    }

    public Optional<String> buildKnowledgeContext(String subjectId, String question, String targetUnit) {
        if (subjectId == null || subjectId.isBlank() || question == null) {
            return Optional.empty();
        }

        CachedSubjectBundle bundle = getCachedBundle(subjectId);
        if (bundle == null || bundle.getDocuments().isEmpty()) {
            return Optional.empty();
        }

        List<OkfDocument> docs = bundle.getDocuments();

        // Filter by target unit if specified
        List<OkfDocument> filteredDocs = docs;
        if (targetUnit != null && !targetUnit.isBlank()) {
            List<OkfDocument> unitMatched = docs.stream()
                    .filter(d -> targetUnit.equalsIgnoreCase(d.getUnit()) ||
                            (d.getUnit() != null && d.getUnit().equalsIgnoreCase(targetUnit.trim())))
                    .collect(Collectors.toList());
            if (!unitMatched.isEmpty()) {
                filteredDocs = unitMatched;
            }
        }

        // Rank documents by keyword/topic relevance
        String[] queryTerms = question.toLowerCase().split("\\s+");
        List<OkfDocument> rankedDocs = filteredDocs.stream()
                .sorted((d1, d2) -> Integer.compare(scoreDoc(d2, queryTerms), scoreDoc(d1, queryTerms)))
                .collect(Collectors.toList());

        StringBuilder context = new StringBuilder();
        context.append("### OKF Verified Subject Knowledge (").append(subjectId).append(")\n\n");

        final int maxBudget = 2800; // Strict upper limit to ensure <3000 chars total budget
        boolean addedSection = false;

        for (OkfDocument doc : rankedDocs) {
            if (scoreDoc(doc, queryTerms) > 0) {
                StringBuilder section = new StringBuilder();
                section.append("#### Section: ").append(doc.getTitle()).append(" [").append(doc.getUnit() != null ? doc.getUnit() : "General").append("]\n");
                if (doc.getSyllabusTopics() != null && !doc.getSyllabusTopics().isEmpty()) {
                    section.append("Topics: ").append(String.join(", ", doc.getSyllabusTopics())).append("\n");
                }
                String body = doc.getMarkdownBody() != null ? doc.getMarkdownBody() : "";
                int remainingBudget = maxBudget - context.length() - section.length() - 20;
                if (remainingBudget <= 80) {
                    break;
                }
                if (body.length() > remainingBudget) {
                    section.append(body.substring(0, remainingBudget)).append("\n...[truncated]\n\n---\n\n");
                } else {
                    section.append(body).append("\n\n---\n\n");
                }
                context.append(section);
                addedSection = true;
            }
        }

        if (!addedSection && !rankedDocs.isEmpty()) {
            // If no terms matched, include highest-level summary of top doc
            OkfDocument topDoc = rankedDocs.get(0);
            context.append("#### General Context: ").append(topDoc.getTitle() != null ? topDoc.getTitle() : "Overview").append("\n");
            String body = topDoc.getMarkdownBody() != null ? topDoc.getMarkdownBody() : "";
            context.append(body.substring(0, Math.min(body.length(), 500))).append("\n");
        }

        return Optional.of(context.toString());
    }

    public int scoreDoc(OkfDocument doc, String[] queryTerms) {
        if (doc == null || queryTerms == null) return 0;
        int score = 0;
        for (String rawTerm : queryTerms) {
            if (rawTerm == null) continue;
            String term = rawTerm.replaceAll("[^a-zA-Z0-9]", "").toLowerCase();
            if (term.length() <= 2) continue; // Skip stop words like is, in, at

            if (doc.getSyllabusTopics() != null) {
                for (String topic : doc.getSyllabusTopics()) {
                    if (topic != null && topic.toLowerCase().contains(term)) score += 5;
                }
            }
            if (doc.getTags() != null) {
                for (String tag : doc.getTags()) {
                    if (tag != null && tag.toLowerCase().contains(term)) score += 3;
                }
            }
            if (doc.getTitle() != null && doc.getTitle().toLowerCase().contains(term)) {
                score += 4;
            }
            if (doc.getMarkdownBody() != null && doc.getMarkdownBody().toLowerCase().contains(term)) {
                score += 1;
            }
        }
        return score;
    }

    // --- Direct Query Serving Helper ---

    public Map<String, Object> serveChatQuery(Map<String, String> request) {
        String question = request.get("question");
        String subjectId = request.get("subjectId");
        String unit = request.get("unit");

        Map<String, Object> response = new HashMap<>();

        if (subjectId != null && !subjectId.isBlank()) {
            Optional<String> okfContext = buildKnowledgeContext(subjectId, question, unit);
            if (okfContext.isPresent()) {
                response.put("answer", "Answer derived from pre-compiled OKF Knowledge: " + question);
                response.put("source", "OKF_KNOWLEDGE");
                response.put("subjectId", subjectId);
                if (unit != null && !unit.isBlank()) {
                    response.put("unit", unit);
                }
                response.put("contextSnippet", okfContext.get());
                return response;
            }
        }

        String noteId = request.get("noteId");
        if (noteId != null && !noteId.isBlank()) {
            response.put("answer", "Answer from Chapter RAG for note: " + noteId);
            response.put("source", "CHAPTER_RAG");
            response.put("noteId", noteId);
            return response;
        }

        response.put("answer", "General response without specific subject OKF");
        response.put("source", "GENERAL_TUTOR");
        return response;
    }

    // --- Disk I/O & Frontmatter Parser ---

    public CachedSubjectBundle loadSubjectBundleFromDisk(String subjectId) {
        if (subjectId == null || subjectId.isBlank()) {
            return null;
        }

        Path okfDir = resolveSubjectDirectory(subjectId);
        if (okfDir == null || !Files.exists(okfDir) || !Files.isDirectory(okfDir)) {
            return null;
        }

        try {
            List<OkfDocument> docs = new ArrayList<>();
            String indexMarkdown = null;
            Map<String, Object> indexFrontmatter = null;

            try (Stream<Path> stream = Files.list(okfDir)) {
                List<Path> files = stream.filter(p -> p.toString().endsWith(".md")).collect(Collectors.toList());
                for (Path file : files) {
                    String fileName = file.getFileName().toString();
                    String content = Files.readString(file, StandardCharsets.UTF_8);
                    if ("index.md".equalsIgnoreCase(fileName)) {
                        indexMarkdown = content;
                        indexFrontmatter = parseFrontmatterOnly(content);
                    } else {
                        OkfDocument doc = parseOkfMarkdown(subjectId, fileName, content);
                        if (doc != null) {
                            docs.add(doc);
                        }
                    }
                }
            }

            if (docs.isEmpty() && indexMarkdown == null) {
                return null;
            }

            return new CachedSubjectBundle(subjectId, docs, indexMarkdown, indexFrontmatter);
        } catch (IOException e) {
            logger.error("Failed to load OKF bundle from disk for subject {}: {}", subjectId, e.getMessage());
            return null;
        }
    }

    public OkfDocument parseOkfMarkdown(String subjectId, String fileName, String content) {
        if (content == null || content.isBlank()) {
            return null;
        }

        String normalized = content.replace("\r\n", "\n");
        Map<String, Object> frontmatter = new HashMap<>();
        String body = normalized;

        if (normalized.startsWith("---\n")) {
            int endIdx = normalized.indexOf("\n---", 4);
            if (endIdx != -1) {
                String yamlContent = normalized.substring(4, endIdx);
                int nextNewline = normalized.indexOf('\n', endIdx + 4);
                body = (nextNewline != -1 && nextNewline < normalized.length()) ? normalized.substring(nextNewline + 1).trim() : "";
                try {
                    Yaml yaml = new Yaml();
                    Object parsed = yaml.load(yamlContent);
                    if (parsed instanceof Map) {
                        @SuppressWarnings("unchecked")
                        Map<String, Object> map = (Map<String, Object>) parsed;
                        frontmatter = map;
                    }
                } catch (Exception e) {
                    logger.warn("Failed to parse YAML frontmatter in {}: {}", fileName, e.getMessage());
                }
            }
        }

        String noteId = fileName.endsWith(".md") ? fileName.substring(0, fileName.length() - 3) : fileName;
        if (frontmatter.containsKey("note_id")) {
            noteId = String.valueOf(frontmatter.get("note_id"));
        }

        String title = (String) frontmatter.getOrDefault("title", noteId);
        String unit = (String) frontmatter.getOrDefault("unit", "General");
        String status = (String) frontmatter.getOrDefault("status", "active");

        List<String> tags = toStringList(frontmatter.get("tags"));
        List<String> syllabusTopics = toStringList(frontmatter.get("syllabus_topics"));
        List<String> sources = toStringList(frontmatter.get("sources"));

        OkfDocument doc = new OkfDocument(subjectId, noteId, unit, title, tags, syllabusTopics, body);
        doc.setStatus(status);
        doc.setSources(sources);
        doc.setFrontmatter(frontmatter);
        return doc;
    }

    private Map<String, Object> parseFrontmatterOnly(String content) {
        if (content == null || content.isBlank()) return Collections.emptyMap();
        String normalized = content.replace("\r\n", "\n");
        if (normalized.startsWith("---\n")) {
            int endIdx = normalized.indexOf("\n---", 4);
            if (endIdx != -1) {
                String yamlContent = normalized.substring(4, endIdx);
                try {
                    Yaml yaml = new Yaml();
                    Object parsed = yaml.load(yamlContent);
                    if (parsed instanceof Map) {
                        @SuppressWarnings("unchecked")
                        Map<String, Object> map = (Map<String, Object>) parsed;
                        return map;
                    }
                } catch (Exception e) {
                    logger.warn("Failed to parse index frontmatter: {}", e.getMessage());
                }
            }
        }
        return Collections.emptyMap();
    }

    private List<String> toStringList(Object obj) {
        if (obj instanceof List) {
            List<?> list = (List<?>) obj;
            List<String> result = new ArrayList<>();
            for (Object item : list) {
                if (item != null) {
                    result.add(item.toString());
                }
            }
            return result;
        }
        return Collections.emptyList();
    }

    private Path resolveSubjectDirectory(String subjectId) {
        if (subjectId == null) return null;
        if (okfGeneratorService != null) {
            Path p = okfGeneratorService.getSubjectOkfDirectory(subjectId);
            if (p != null && Files.exists(p)) {
                return p;
            }
        }

        String base = storageLocalDir != null ? storageLocalDir : "./data";
        Path direct = Paths.get(base, "okf", subjectId).toAbsolutePath().normalize();
        if (Files.exists(direct)) {
            return direct;
        }

        Path relativeToCurrent = Paths.get(".").toAbsolutePath().normalize().resolve(base).resolve("okf").resolve(subjectId);
        if (Files.exists(relativeToCurrent)) {
            return relativeToCurrent;
        }

        Path backendFallback = Paths.get("backend", "data", "okf", subjectId).toAbsolutePath().normalize();
        if (Files.exists(backendFallback)) {
            return backendFallback;
        }

        Path dataFallback = Paths.get("data", "okf", subjectId).toAbsolutePath().normalize();
        if (Files.exists(dataFallback)) {
            return dataFallback;
        }

        return direct;
    }
}
