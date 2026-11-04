package com.eduvault.service;

import com.eduvault.model.Note;
import com.eduvault.model.Subject;
import com.eduvault.repository.LocalJsonDatabase;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.time.Instant;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class OkfGeneratorService {

    private static final Logger logger = LoggerFactory.getLogger(OkfGeneratorService.class);

    @Value("${app.storage.local-dir:./data}")
    private String storageDir;

    @Autowired(required = false)
    private LocalJsonDatabase database;

    @Autowired(required = false)
    private FileStorageService fileStorageService;

    @Autowired(required = false)
    private BackblazeStorageService backblazeStorageService;

    @Autowired(required = false)
    private GitHubStorageService gitHubStorageService;

    // --- Result Records ---

    public record OkfGenerationResult(
        boolean success,
        String noteId,
        String subjectId,
        Path filePath,
        long byteSize,
        String errorMessage,
        Instant compiledAt
    ) {
        public static OkfGenerationResult success(String noteId, String subjectId, Path filePath, long byteSize, Instant compiledAt) {
            return new OkfGenerationResult(true, noteId, subjectId, filePath, byteSize, null, compiledAt);
        }

        public static OkfGenerationResult failure(String noteId, String subjectId, String error) {
            return new OkfGenerationResult(false, noteId, subjectId, null, 0, error, Instant.now());
        }

        public boolean isSuccess() {
            return success;
        }

        public String getErrorMessage() {
            return errorMessage;
        }

        public Path getFilePath() {
            return filePath;
        }
    }

    public record OkfBundleResult(
        boolean success,
        String subjectId,
        Path manifestPath,
        int notesProcessed,
        int notesSucceeded,
        int notesFailed,
        List<String> compiledNoteIds,
        String errorMessage,
        Instant compiledAt
    ) {
        public static OkfBundleResult success(String subjectId, Path manifestPath, int processed, int succeeded, int failed, List<String> compiledNoteIds, Instant compiledAt) {
            return new OkfBundleResult(true, subjectId, manifestPath, processed, succeeded, failed, compiledNoteIds, null, compiledAt);
        }

        public static OkfBundleResult failure(String subjectId, String error) {
            return new OkfBundleResult(false, subjectId, null, 0, 0, 0, List.of(), error, Instant.now());
        }

        public boolean isSuccess() {
            return success;
        }

        public String getErrorMessage() {
            return errorMessage;
        }

        public Path getManifestPath() {
            return manifestPath;
        }
    }

    // --- Directory Accessors ---

    public Path getOkfRootDirectory() {
        return Paths.get(storageDir, "okf").toAbsolutePath().normalize();
    }

    public Path getSubjectOkfDirectory(String subjectId) {
        return getOkfRootDirectory().resolve(subjectId != null ? subjectId : "unassigned");
    }

    public Path getNoteOkfPath(String subjectId, String noteId) {
        return getSubjectOkfDirectory(subjectId).resolve(noteId + ".md");
    }

    public Path getSubjectIndexPath(String subjectId) {
        return getSubjectOkfDirectory(subjectId).resolve("index.md");
    }

    public boolean isSubjectBundleReady(String subjectId) {
        Path indexPath = getSubjectIndexPath(subjectId);
        try {
            return Files.exists(indexPath) && Files.size(indexPath) > 0;
        } catch (IOException e) {
            return false;
        }
    }

    // --- Core Generation Methods ---

    /**
     * Generates a Google OKF Markdown file with strict YAML frontmatter for a single Note.
     */
    public OkfGenerationResult generateOkfForNote(Note note, Subject subject) {
        if (note == null || note.getId() == null) {
            return OkfGenerationResult.failure("unknown", "unknown", "Note cannot be null");
        }

        String subjectId = subject != null ? subject.getId() : (note.getSubjectId() != null ? note.getSubjectId() : "general");
        String subjectName = subject != null ? subject.getName() : "General Studies";

        try {
            // 1. Resolve extracted text
            String text = resolveExtractedText(note);
            if (text == null || text.isBlank() || text.startsWith("Failed to extract") || text.startsWith("File not found")) {
                Path subjectDir = getSubjectOkfDirectory(subjectId);
                Files.createDirectories(subjectDir);
                Path targetPath = getNoteOkfPath(subjectId, note.getId());

                String failedFrontmatter = buildFailedFrontmatter(note, subjectId, subjectName, "Source document contained no extractable text");
                writeAtomically(targetPath, failedFrontmatter);

                return OkfGenerationResult.failure(note.getId(), subjectId, "Source document contained no extractable text");
            }

            // 2. Resolve topics & tags
            List<String> topics = resolveSyllabusTopics(note, text);
            List<String> tags = note.getTags() != null ? note.getTags() : Collections.emptyList();
            Instant now = Instant.now();

            // 3. Build Frontmatter and Body
            String frontmatter = buildNoteFrontmatter(note, subjectId, subjectName, topics, tags, now);
            String body = buildNoteMarkdownBody(note, subjectName, text, topics);
            String fullDocument = frontmatter + "\n\n" + body + "\n";

            // 4. Atomic Write
            Path targetPath = getNoteOkfPath(subjectId, note.getId());
            writeAtomically(targetPath, fullDocument);

            long byteSize = Files.size(targetPath);
            logger.info("Generated OKF Note Markdown: {} ({} bytes)", targetPath, byteSize);
            return OkfGenerationResult.success(note.getId(), subjectId, targetPath, byteSize, now);

        } catch (Exception e) {
            logger.error("Failed to generate OKF for note {}: {}", note.getId(), e.getMessage(), e);
            return OkfGenerationResult.failure(note.getId(), subjectId, e.getMessage());
        }
    }

    /**
     * Compiles all notes belonging to a Subject and writes index.md.
     */
    public OkfBundleResult compileSubjectBundle(String subjectId) {
        if (subjectId == null || subjectId.isBlank()) {
            return OkfBundleResult.failure(subjectId, "Subject ID must not be blank");
        }

        Subject subject = null;
        if (database != null) {
            Optional<Subject> subjectOpt = database.getSubjectById(subjectId);
            if (subjectOpt.isPresent()) {
                subject = subjectOpt.get();
            }
        }
        if (subject == null) {
            subject = new Subject();
            subject.setId(subjectId);
            subject.setName("Subject " + subjectId);
        }

        List<Note> subjectNotes = Collections.emptyList();
        if (database != null) {
            subjectNotes = database.getAllNotes().stream()
                    .filter(n -> subjectId.equals(n.getSubjectId()))
                    .collect(Collectors.toList());
        }

        int processed = 0;
        int succeeded = 0;
        int failed = 0;
        List<String> compiledNoteIds = new ArrayList<>();
        Set<String> unitsCovered = new TreeSet<>();
        Set<String> allTags = new TreeSet<>(String.CASE_INSENSITIVE_ORDER);
        Set<String> allTopics = new LinkedHashSet<>();

        for (Note note : subjectNotes) {
            processed++;
            OkfGenerationResult result = generateOkfForNote(note, subject);
            if (result.success()) {
                succeeded++;
                compiledNoteIds.add(note.getId());
                if (note.getUnit() != null && !note.getUnit().isBlank()) {
                    unitsCovered.add(note.getUnit());
                } else {
                    unitsCovered.add("Unit 1");
                }
                if (note.getTags() != null) {
                    allTags.addAll(note.getTags());
                }
                if (note.getAiImportantTopics() != null) {
                    allTopics.addAll(note.getAiImportantTopics());
                }
            } else {
                failed++;
            }
        }

        Instant now = Instant.now();
        try {
            Path indexPath = getSubjectIndexPath(subjectId);
            String indexContent = buildSubjectIndexDocument(subject, subjectNotes, unitsCovered, allTags, allTopics, succeeded, now);
            writeAtomically(indexPath, indexContent);
            logger.info("Compiled Subject Knowledge Bundle: {} ({} notes compiled, {} succeeded, {} failed)",
                    subjectId, processed, succeeded, failed);
            return OkfBundleResult.success(subjectId, indexPath, processed, succeeded, failed, compiledNoteIds, now);
        } catch (Exception e) {
            logger.error("Failed to compile subject index for {}: {}", subjectId, e.getMessage(), e);
            return OkfBundleResult.failure(subjectId, "Failed to compile index: " + e.getMessage());
        }
    }

    // --- Frontmatter & Document Builders ---

    private String buildNoteFrontmatter(Note note, String subjectId, String subjectName, List<String> topics, List<String> tags, Instant compiledAt) {
        StringBuilder sb = new StringBuilder();
        sb.append("---\n");
        sb.append("type: \"academic_notes\"\n");
        sb.append("note_id: \"").append(escapeYaml(note.getId())).append("\"\n");
        sb.append("title: \"").append(escapeYaml(note.getTitle() != null ? note.getTitle() : "Academic Note")).append("\"\n");

        String desc = extractShortDescription(note);
        sb.append("description: \"").append(escapeYaml(desc)).append("\"\n");
        sb.append("subject_id: \"").append(escapeYaml(subjectId)).append("\"\n");
        sb.append("subject_name: \"").append(escapeYaml(subjectName)).append("\"\n");
        sb.append("unit: \"").append(escapeYaml(note.getUnit() != null && !note.getUnit().isBlank() ? note.getUnit() : "Unit 1")).append("\"\n");

        sb.append("tags:\n");
        if (tags == null || tags.isEmpty()) {
            sb.append("  - \"academic\"\n");
        } else {
            for (String tag : tags) {
                sb.append("  - \"").append(escapeYaml(tag)).append("\"\n");
            }
        }

        sb.append("syllabus_topics:\n");
        if (topics == null || topics.isEmpty()) {
            sb.append("  - \"General Concepts\"\n");
        } else {
            for (String topic : topics) {
                sb.append("  - \"").append(escapeYaml(topic)).append("\"\n");
            }
        }

        sb.append("sources:\n");
        String src = note.getOriginalFilename() != null ? note.getOriginalFilename() : (note.getFileUrl() != null ? note.getFileUrl() : (note.getId() != null ? note.getId() : "note"));
        sb.append("  - \"").append(escapeYaml(src)).append("\"\n");

        sb.append("last_compiled: \"").append(compiledAt.toString()).append("\"\n");
        sb.append("status: \"active\"\n");
        sb.append("---");
        return sb.toString();
    }

    private String buildFailedFrontmatter(Note note, String subjectId, String subjectName, String errorMessage) {
        StringBuilder sb = new StringBuilder();
        sb.append("---\n");
        sb.append("type: \"academic_notes\"\n");
        sb.append("note_id: \"").append(escapeYaml(note.getId())).append("\"\n");
        sb.append("title: \"").append(escapeYaml(note.getTitle() != null ? note.getTitle() : "Unprocessed Note")).append("\"\n");
        sb.append("subject_id: \"").append(escapeYaml(subjectId)).append("\"\n");
        sb.append("subject_name: \"").append(escapeYaml(subjectName)).append("\"\n");
        sb.append("status: \"FAILED\"\n");
        sb.append("error: \"").append(escapeYaml(errorMessage)).append("\"\n");
        sb.append("last_compiled: \"").append(Instant.now().toString()).append("\"\n");
        sb.append("---\n\n");
        sb.append("# ").append(note.getTitle() != null ? note.getTitle() : "Note").append("\n\n");
        sb.append("*Error: ").append(errorMessage).append("*\n");
        return sb.toString();
    }

    private String buildNoteMarkdownBody(Note note, String subjectName, String text, List<String> topics) {
        StringBuilder sb = new StringBuilder();
        String title = note.getTitle() != null ? note.getTitle() : "Academic Lecture Notes";
        sb.append("# ").append(title).append("\n\n");

        sb.append("> **Subject**: ").append(subjectName);
        if (note.getUnit() != null) sb.append(" | **Unit**: ").append(note.getUnit());
        if (note.getExamType() != null) sb.append(" | **Exam Focus**: ").append(note.getExamType());
        sb.append("\n\n");

        // Section 1: Executive Summary
        sb.append("## 1. Executive Summary & Overview\n");
        sb.append(extractSummary(text, title)).append("\n\n");

        // Section 2: Key Concepts & Syllabus Topics
        sb.append("## 2. Key Concepts & Theory\n");
        if (topics != null && !topics.isEmpty()) {
            for (String topic : topics) {
                sb.append("### ").append(topic).append("\n");
                sb.append(extractConceptPassage(text, topic)).append("\n\n");
            }
        } else {
            sb.append(extractPassageSlice(text, 0, 1500)).append("\n\n");
        }

        // Section 3: Definitions & Core Principles
        sb.append("## 3. Definitions & Core Principles\n");
        List<String> definitions = extractDefinitions(text);
        if (!definitions.isEmpty()) {
            for (String def : definitions) {
                sb.append("- ").append(def).append("\n");
            }
            sb.append("\n");
        } else {
            sb.append("- **Core Terminology**: Refer to theoretical concepts above for foundational rules.\n\n");
        }

        // Section 4: Practice Questions & Exam Focus
        sb.append("## 4. Practice Questions & Exam Focus\n");
        if (note.getAiGeneratedQuestions() != null && !note.getAiGeneratedQuestions().isEmpty()) {
            int qIndex = 1;
            for (Note.Question q : note.getAiGeneratedQuestions()) {
                sb.append(qIndex++).append(". **[").append(q.getType() != null ? q.getType().toUpperCase() : "THEORY")
                        .append(" | ").append(q.getDifficulty() != null ? q.getDifficulty().toUpperCase() : "MEDIUM")
                        .append("]** ").append(q.getQ()).append("\n");
            }
            sb.append("\n");
        } else {
            int qIndex = 1;
            List<String> sampleTopics = (topics != null && !topics.isEmpty()) ? topics.stream().limit(3).toList() : List.of("Core Principles");
            for (String topic : sampleTopics) {
                sb.append(qIndex++).append(". Explain the core principles and academic significance of **").append(topic).append("**.\n");
            }
            sb.append("\n");
        }

        // Section 5: Key Takeaways & Exam Checklist
        sb.append("## 5. Key Takeaways & Exam Checklist\n");
        sb.append("- Review all definitions and core formulas before mid-semester/end-semester evaluations.\n");
        sb.append("- Be prepared to contrast comparative mechanisms and algorithmic trade-offs.\n");
        sb.append("- Ensure mastery over standard derivations and sample problems.\n\n");

        // Section 6: Primary Reference Excerpts
        sb.append("## 6. Primary Reference Excerpts\n");
        sb.append("```text\n");
        int maxExcerptLen = Math.min(text.length(), 2500);
        sb.append(text.substring(0, maxExcerptLen).trim());
        if (text.length() > maxExcerptLen) {
            sb.append("\n\n... [Remaining content indexed in primary document repository] ...");
        }
        sb.append("\n```\n");

        return sb.toString();
    }

    private String buildSubjectIndexDocument(Subject subject, List<Note> notes, Set<String> units, Set<String> tags, Set<String> topics, int succeededCount, Instant compiledAt) {
        StringBuilder sb = new StringBuilder();
        sb.append("---\n");
        sb.append("type: \"subject_index\"\n");
        sb.append("subject_id: \"").append(escapeYaml(subject.getId())).append("\"\n");
        sb.append("subject_name: \"").append(escapeYaml(subject.getName())).append("\"\n");
        if (subject.getCode() != null) {
            sb.append("subject_code: \"").append(escapeYaml(subject.getCode())).append("\"\n");
        }
        if (subject.getDepartment() != null) {
            sb.append("department: \"").append(escapeYaml(subject.getDepartment())).append("\"\n");
        }
        if (subject.getSemester() != null) {
            sb.append("semester: \"").append(escapeYaml(subject.getSemester())).append("\"\n");
        }
        sb.append("units_covered:\n");
        if (units == null || units.isEmpty()) {
            sb.append("  - \"Unit 1\"\n");
        } else {
            for (String u : units) {
                sb.append("  - \"").append(escapeYaml(u)).append("\"\n");
            }
        }
        sb.append("total_notes_compiled: ").append(succeededCount).append("\n");
        sb.append("last_compiled: \"").append(compiledAt.toString()).append("\"\n");
        sb.append("---\n\n");

        sb.append("# ").append(subject.getName()).append(" — Knowledge Bundle\n\n");
        sb.append("Automated Open Knowledge Format (OKF) index serving rapid AI retrieval for **")
                .append(subject.getName()).append("**.\n\n");

        sb.append("## Unit & Note Directory\n\n");
        Map<String, List<Note>> byUnit = notes.stream()
                .collect(Collectors.groupingBy(n -> n.getUnit() != null && !n.getUnit().isBlank() ? n.getUnit() : "Unit 1"));

        for (Map.Entry<String, List<Note>> entry : byUnit.entrySet()) {
            sb.append("### ").append(entry.getKey()).append("\n");
            for (Note n : entry.getValue()) {
                String title = n.getTitle() != null ? n.getTitle() : "Note " + n.getId();
                sb.append("- [").append(entry.getKey()).append(": ").append(title).append("](").append(n.getId()).append(".md)\n");
            }
            sb.append("\n");
        }

        sb.append("## Knowledge Base Guidelines\n");
        sb.append("1. **Frontmatter Filtering**: Ingest YAML blocks to target specific units and topics before vector lookups.\n");
        sb.append("2. **Ground Truth**: Section 6 retains authentic faculty excerpts for verifiable exam answers.\n");
        return sb.toString();
    }

    // --- Text Extraction & NLP Helpers ---

    private String resolveExtractedText(Note note) {
        String text = note.getExtractedText();
        if (text != null && text.trim().length() > 100 && !text.startsWith("Failed to extract") && !text.startsWith("File not found")) {
            return text.trim();
        }

        // Lazy local disk recovery
        if (note.getFileUrl() != null && fileStorageService != null) {
            try {
                String recovered = fileStorageService.extractText(note.getFileUrl());
                if (recovered != null && recovered.trim().length() > 100 && !recovered.startsWith("Failed to extract")) {
                    note.setExtractedText(recovered.trim());
                    if (database != null) {
                        database.updateNote(note);
                    }
                    return recovered.trim();
                }
            } catch (Exception ignored) {}
        }

        // Lazy B2 recovery
        if (note.getB2ObjectKey() != null && backblazeStorageService != null && fileStorageService != null) {
            try {
                byte[] bytes = backblazeStorageService.getObjectBytes(note.getB2ObjectKey());
                if (bytes != null && bytes.length > 0) {
                    String recovered = fileStorageService.extractTextFromBytes(bytes, note.getOriginalFilename() != null ? note.getOriginalFilename() : note.getB2ObjectKey());
                    if (recovered != null && recovered.trim().length() > 100) {
                        note.setExtractedText(recovered.trim());
                        if (database != null) {
                            database.updateNote(note);
                        }
                        return recovered.trim();
                    }
                }
            } catch (Exception ignored) {}
        }

        return text;
    }

    private List<String> resolveSyllabusTopics(Note note, String text) {
        if (note.getAiImportantTopics() != null && !note.getAiImportantTopics().isEmpty()) {
            return note.getAiImportantTopics();
        }

        // Derive heuristic topics from headers
        Set<String> topics = new LinkedHashSet<>();
        if (note.getTitle() != null) {
            String sanitized = note.getTitle().replaceAll("(?i)(notes|unit\\s*\\d+|lecture)", "").trim();
            if (!sanitized.isBlank()) {
                topics.add(sanitized);
            }
        }

        Pattern headerPattern = Pattern.compile("(?m)^(?:[0-9]+[\\.\\)]|#+|Chapter|Unit|Section)\\s+([A-Z][A-Za-z0-9\\s]{3,40})$");
        Matcher m = headerPattern.matcher(text);
        while (m.find() && topics.size() < 6) {
            String cand = m.group(1).trim();
            if (cand.length() > 3 && !cand.equalsIgnoreCase("introduction")) {
                topics.add(cand);
            }
        }

        if (topics.isEmpty()) {
            topics.add("Fundamentals & Theory");
            topics.add("Core Principles");
        }
        return new ArrayList<>(topics);
    }

    private String extractShortDescription(Note note) {
        if (note.getTitle() != null && note.getUnit() != null) {
            return "Curated academic notes on " + note.getTitle() + " for " + note.getUnit();
        }
        return "Comprehensive academic lecture notes and exam study material.";
    }

    private String extractSummary(String text, String title) {
        String[] lines = text.split("\\r?\\n");
        StringBuilder sb = new StringBuilder();
        int count = 0;
        for (String line : lines) {
            String trimmed = line.trim();
            if (trimmed.length() > 30 && !trimmed.matches("^[0-9]+$") && !trimmed.toLowerCase().contains("page")) {
                sb.append(trimmed).append(" ");
                count++;
                if (count >= 3) break;
            }
        }
        if (sb.length() > 0) {
            return sb.toString().trim();
        }
        return "This document encompasses primary curricular material for " + title + ", highlighting core principles, theoretical foundations, and exam applications.";
    }

    private String extractConceptPassage(String text, String topic) {
        int idx = text.toLowerCase().indexOf(topic.toLowerCase());
        if (idx != -1) {
            int start = Math.max(0, idx - 50);
            int end = Math.min(text.length(), idx + 600);
            return text.substring(start, end).replaceAll("\\r?\\n+", "\n").trim();
        }
        return "Exploration of " + topic + " including formal terminology, procedural execution, and practical academic constraints.";
    }

    private String extractPassageSlice(String text, int start, int maxLen) {
        if (start >= text.length()) return "";
        int end = Math.min(text.length(), start + maxLen);
        return text.substring(start, end).replaceAll("\\r?\\n+", "\n").trim();
    }

    private List<String> extractDefinitions(String text) {
        List<String> defs = new ArrayList<>();
        Pattern defPattern = Pattern.compile("(?im)^(?:[•\\-\\d\\.]+\\s*)?([A-Z][A-Za-z\\s]{2,30})\\s*(?:[:\\-–]|is defined as|refers to)\\s*([^\r\n]{15,180})");
        Matcher m = defPattern.matcher(text);
        while (m.find() && defs.size() < 5) {
            String term = m.group(1).trim();
            String explanation = m.group(2).trim();
            defs.add("**" + term + "**: " + explanation);
        }
        return defs;
    }

    // --- I/O & Escaping Utilities ---

    private void writeAtomically(Path targetPath, String content) throws IOException {
        Path parent = targetPath.getParent();
        if (parent != null) {
            Files.createDirectories(parent);
        }
        Path tempFile = targetPath.resolveSibling(targetPath.getFileName().toString() + ".tmp");
        Files.writeString(tempFile, content, StandardCharsets.UTF_8, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
        try {
            Files.move(tempFile, targetPath, StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING);
        } catch (AtomicMoveNotSupportedException e) {
            Files.move(tempFile, targetPath, StandardCopyOption.REPLACE_EXISTING);
        }

        if (gitHubStorageService != null && parent != null) {
            String subjectId = parent.getFileName().toString();
            String fileName = targetPath.getFileName().toString();
            gitHubStorageService.syncOkfFileAsync(subjectId, fileName, content);
        }
    }

    private String escapeYaml(String input) {
        if (input == null) return "";
        return input.replace("\\", "\\\\")
                    .replace("\"", "\\\"")
                    .replace("\r", " ")
                    .replace("\n", " ")
                    .trim();
    }
}
