package com.eduvault.controller;

import com.eduvault.model.Doubt;
import com.eduvault.model.Note;
import com.eduvault.model.StudentProfile;
import com.eduvault.model.Subject;
import com.eduvault.repository.LocalJsonDatabase;
import com.eduvault.service.BackblazeStorageService;
import com.eduvault.service.FileStorageService;
import com.eduvault.service.GroqService;
import com.eduvault.service.RAGService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.type.TypeReference;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Path;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class ApiController {
    
    private static final Logger logger = LoggerFactory.getLogger(ApiController.class);

    @Autowired
    private LocalJsonDatabase database;

    @Autowired
    private FileStorageService fileStorageService;

    @Autowired
    private BackblazeStorageService backblazeStorageService;

    @Autowired
    private com.eduvault.service.DocumentConversionService documentConversionService;

    @Autowired
    private com.eduvault.service.GroqService groqService;

    @Autowired
    private RAGService ragService;

    @Autowired
    private ObjectMapper mapper;

    @GetMapping("/subjects")
    public ResponseEntity<List<Subject>> getSubjects() {
        StudentProfile profile = database.getProfile();
        List<Subject> all = database.getAllSubjects();
        
        // Always filter by user's department and semester
        if (profile != null && profile.getDepartment() != null && profile.getSemester() != null) {
            all = all.stream()
                .filter(s -> s.getDepartment().equalsIgnoreCase(profile.getDepartment()) && 
                             s.getSemester().equalsIgnoreCase(profile.getSemester()))
                .collect(java.util.stream.Collectors.toList());
        }
        return ResponseEntity.ok(all);
    }

    @GetMapping("/profile")
    public ResponseEntity<StudentProfile> getProfile() {
        return ResponseEntity.ok(database.getProfile());
    }

    @PostMapping("/profile")
    public ResponseEntity<StudentProfile> updateProfile(@RequestBody StudentProfile profile) {
        return ResponseEntity.ok(database.updateProfile(profile));
    }

    @PostMapping("/profile/logout")
    public ResponseEntity<Void> logoutProfile() {
        database.clearProfileAndSubjects();
        return ResponseEntity.ok().build();
    }

    @PostMapping("/subjects")
    public ResponseEntity<Subject> createSubject(@RequestBody Map<String, String> payload) {
        String name = payload.get("name");
        String semester = payload.get("semester");
        if (name == null || name.trim().isEmpty() || semester == null || semester.trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        
        StudentProfile profile = database.getProfile();
        Subject subject = Subject.builder()
                .id(UUID.randomUUID().toString())
                .name(name.trim())
                .semester(semester.trim())
                .department(profile != null ? profile.getDepartment() : "General")
                .createdAt(LocalDate.now().format(DateTimeFormatter.ISO_DATE))
                .noteCount(0)
                .build();
                
        return ResponseEntity.ok(database.addSubject(subject));
    }

    @GetMapping("/notes")
    public ResponseEntity<List<Note>> getNotes(
            @RequestParam(required = false) String subjectId,
            @RequestParam(required = false) String examType,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String unit) {
        
        StudentProfile profile = database.getProfile();
        String department = profile != null ? profile.getDepartment() : null;
        String semester = profile != null ? profile.getSemester() : null;
        
        return ResponseEntity.ok(database.getNotesByFilter(subjectId, semester, examType, keyword, search, department, unit));
    }

    @GetMapping("/notes/{id}")
    public ResponseEntity<Note> getNote(@PathVariable String id) {
        return database.getNoteById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/notes/{id}/tags")
    public ResponseEntity<Note> updateNoteTags(@PathVariable String id, @RequestBody Map<String, List<String>> payload) {
        List<String> tags = payload.get("tags");
        return database.updateNoteTags(id, tags)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/notes/{id}")
    public ResponseEntity<Map<String, String>> deleteNote(@PathVariable String id) {
        return database.getNoteById(id).map(note -> {
            // Delete from B2 (primary) and also attempt local cleanup for legacy files
            backblazeStorageService.deleteFile(note.getFileUrl());
            fileStorageService.deleteFile(note.getFileUrl());
            database.deleteNote(id);
            return ResponseEntity.ok(Map.of("message", "Note deleted successfully"));
        }).orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/files/{noteId}")
    public ResponseEntity<Map<String, String>> downloadFile(@PathVariable String noteId) {
        return database.getNoteById(noteId).map(note -> {
            String fileUrl = note.getFileUrl();
            if (fileUrl != null && fileUrl.startsWith("http")) {
                return ResponseEntity.ok(Map.of(
                        "noteId", noteId,
                        "url", fileUrl
                ));
            }
            try {
                String url = backblazeStorageService.generatePresignedUrl(fileUrl);
                if (url != null && !url.isEmpty()) {
                    return ResponseEntity.ok(Map.of(
                            "noteId", noteId,
                            "url", url
                    ));
                }
            } catch (Exception ignored) {}
            return ResponseEntity.ok(Map.of(
                    "noteId", noteId,
                    "url", "http://localhost:8081/api/files/raw/" + fileUrl
            ));
        }).orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/files/raw/{fileName}")
    public ResponseEntity<Resource> getRawFile(@PathVariable String fileName) {
        Path path = fileStorageService.getFilePath(fileName);
        if (java.nio.file.Files.exists(path)) {
            try {
                Resource resource = new UrlResource(path.toUri());
                String contentType = java.nio.file.Files.probeContentType(path);
                if (contentType == null) contentType = "application/octet-stream";
                return ResponseEntity.ok()
                        .contentType(MediaType.parseMediaType(contentType))
                        .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + fileName + "\"")
                        .body(resource);
            } catch (Exception e) {
                // fall through
            }
        }
        return ResponseEntity.notFound().build();
    }

    /**
     * Returns a presigned URL for direct, time-limited access to a private B2 file.
     * The URL is valid for the duration configured via B2_PRESIGNED_EXPIRY_MINUTES (default 60 min).
     */
    @GetMapping("/files/{noteId}/presigned")
    public ResponseEntity<Map<String, String>> getPresignedUrl(@PathVariable String noteId) {
        return database.getNoteById(noteId).map(note -> {
            String fileUrl = note.getFileUrl();
            if (fileUrl != null && fileUrl.startsWith("http")) {
                return ResponseEntity.ok(Map.of(
                        "noteId", noteId,
                        "url", fileUrl
                ));
            }
            try {
                String url = backblazeStorageService.generatePresignedUrl(fileUrl);
                if (url != null && !url.isEmpty()) {
                    return ResponseEntity.ok(Map.of(
                            "noteId", noteId,
                            "url", url
                    ));
                }
            } catch (Exception ignored) {}
            return ResponseEntity.ok(Map.of(
                    "noteId", noteId,
                    "url", "http://localhost:8081/api/files/raw/" + fileUrl
            ));
        }).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/notes/upload")
    public ResponseEntity<Map<String, String>> uploadNote(
            @RequestParam("file") MultipartFile file,
            @RequestParam("title") String title,
            @RequestParam("subjectId") String subjectId,
            @RequestParam(value = "unit", required = false, defaultValue = "Unit 1") String unit,
            @RequestParam(value = "examType", required = false, defaultValue = "mid-sem") String examType,
            @RequestParam(value = "tags", required = false) String tagsJson,
            @RequestParam(value = "uploaderName", required = false, defaultValue = "Anonymous") String uploaderName) {

        // 0. Validate Subject
        boolean subjectExists = database.getAllSubjects().stream().anyMatch(s -> s.getId().equals(subjectId));
        if (!subjectExists) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid subject. Please select a subject from your dashboard."));
        }

        // 1. Parse tags from JSON string
        List<String> tags = List.of();
        if (tagsJson != null && !tagsJson.trim().isEmpty()) {
            try {
                tags = mapper.readValue(tagsJson, new TypeReference<List<String>>() {});
            } catch (Exception e) {
                logger.warn("Failed to parse tags JSON: " + tagsJson, e);
            }
        }

        // 2. Get user profile for auto-filling department and semester
        StudentProfile profile = database.getProfile();
        String department = profile != null ? profile.getDepartment() : "Unknown";
        String semester = profile != null ? profile.getSemester() : "Unknown";
        
        // 2. Extract text from the in-memory file BEFORE uploading (avoids re-downloading from B2)
        String extractedText = fileStorageService.extractTextFromMultipartFile(file);

        // 3. Upload to Backblaze B2
        String savedFileName = backblazeStorageService.uploadFile(file);
        
        // 4. Create Note Record
        Note note = Note.builder()
                .id(UUID.randomUUID().toString())
                .title(title)
                .subjectId(subjectId)
                .department(department) // Auto-filled from profile
                .semester(semester) // Auto-filled from profile
                .unit(unit)
                .examType(examType)
                .fileUrl(savedFileName) // This is now just the file name
                .uploadedBy(uploaderName)
                .createdAt(LocalDate.now().format(DateTimeFormatter.ISO_DATE))
                .status("processing")
                .tags(tags != null ? tags : List.of())
                .extractedText(extractedText)
                .build();

        database.addNote(note);

        // Trigger Async AI generation and RAG ingestion
        groqService.processNoteAsync(note.getId());
        ragService.ingestNote(note.getId());

        // Warn if text extraction failed (e.g. scanned/image-only PDF) — AI features will be skipped
        boolean textExtractionFailed = extractedText == null
                || extractedText.trim().isEmpty()
                || extractedText.equals("Failed to extract text.")
                || extractedText.startsWith("Text extraction only supported");

        if (textExtractionFailed) {
            logger.warn("Text extraction produced no usable content for note: {} ({}). AI features will be skipped.", note.getId(), savedFileName);
            return ResponseEntity.ok(Map.of(
                    "noteId", note.getId(),
                    "title", note.getTitle(),
                    "status", "processing",
                    "warning", "Text could not be extracted from this file. AI features (topics, questions, RAG chat) will not be available. Scanned or image-based PDFs are not supported."
            ));
        }

        return ResponseEntity.ok(Map.of(
                "noteId", note.getId(),
                "title", note.getTitle(),
                "status", "processing"
        ));
    }

    @GetMapping("/notes/{id}/doubts")
    public ResponseEntity<List<Doubt>> getDoubts(@PathVariable String id) {
        return ResponseEntity.ok(database.getDoubtsByNoteId(id));
    }

    @PostMapping("/notes/{id}/doubts")
    public ResponseEntity<Doubt> addDoubt(@PathVariable String id, @RequestBody Map<String, String> payload) {
        String question = payload.get("question");
        String studentName = payload.get("studentName");
        
        if (question == null || question.trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        Doubt doubt = Doubt.builder()
                .id(UUID.randomUUID().toString())
                .noteId(id)
                .studentName(studentName != null ? studentName : "Anonymous")
                .question(question)
                .createdAt(LocalDate.now().format(DateTimeFormatter.ISO_DATE))
                .status("pending")
                .build();

        database.addDoubt(doubt);
        return ResponseEntity.ok(doubt);
    }

    // --- PYQ Endpoints ---

    @GetMapping("/pyqs")
    public ResponseEntity<List<com.eduvault.model.PYQ>> getPyqs(
            @RequestParam(required = false) String subjectId,
            @RequestParam(required = false) String examType) {
        return ResponseEntity.ok(database.getPyqsByFilter(subjectId, examType));
    }

    @PostMapping("/pyqs")
    public ResponseEntity<com.eduvault.model.PYQ> uploadPyq(@RequestBody com.eduvault.model.PYQ pyq) {
        if (pyq.getId() == null) pyq.setId(UUID.randomUUID().toString());
        if (pyq.getCreatedAt() == null) pyq.setCreatedAt(LocalDate.now().format(DateTimeFormatter.ISO_DATE));
        return ResponseEntity.ok(database.addPyq(pyq));
    }

    @PostMapping(value = "/pyqs/predict", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> predictPyqs(@RequestBody Map<String, String> payload) {
        String pyqText = payload.get("pyqText");
        String qbText = payload.get("qbText");
        return ResponseEntity.ok(groqService.generateStudyGuide(pyqText, qbText));
    }

    // --- Announcement Endpoints ---

    @GetMapping("/announcements")
    public ResponseEntity<List<com.eduvault.model.Announcement>> getAnnouncements() {
        return ResponseEntity.ok(database.getAllAnnouncements());
    }

    @GetMapping("/announcements/recent")
    public ResponseEntity<List<com.eduvault.model.Announcement>> getRecentAnnouncements() {
        return ResponseEntity.ok(database.getRecentAnnouncements(2));
    }

    @PostMapping("/announcements")
    public ResponseEntity<com.eduvault.model.Announcement> createAnnouncement(@RequestBody com.eduvault.model.Announcement announcement) {
        if (announcement.getId() == null) announcement.setId(UUID.randomUUID().toString());
        if (announcement.getCreatedAt() == null) announcement.setCreatedAt(LocalDate.now().format(DateTimeFormatter.ISO_DATE));
        return ResponseEntity.ok(database.addAnnouncement(announcement));
    }

    // --- Roadmap Endpoints ---

    @GetMapping("/roadmaps")
    public ResponseEntity<List<com.eduvault.model.PredefinedRoadmap>> getRoadmaps() {
        return ResponseEntity.ok(database.getAllRoadmaps());
    }

    @GetMapping("/roadmaps/{id}")
    public ResponseEntity<com.eduvault.model.PredefinedRoadmap> getRoadmap(@PathVariable String id) {
        return database.getRoadmapById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // --- Timeline Endpoints ---

    @GetMapping("/timeline")
    public ResponseEntity<List<com.eduvault.model.TimelineEvent>> getTimeline() {
        return ResponseEntity.ok(database.getAllTimelineEvents());
    }

    @PostMapping("/timeline")
    public ResponseEntity<com.eduvault.model.TimelineEvent> createTimelineEvent(@RequestBody com.eduvault.model.TimelineEvent event) {
        if (event.getId() == null) event.setId(UUID.randomUUID().toString());
        database.addTimelineEvent(event);
        return ResponseEntity.ok(event);
    }

    @PutMapping("/timeline/{id}")
    public ResponseEntity<com.eduvault.model.TimelineEvent> updateTimelineEvent(@PathVariable String id, @RequestBody com.eduvault.model.TimelineEvent event) {
        event.setId(id);
        database.updateTimelineEvent(event);
        return ResponseEntity.ok(event);
    }

    @DeleteMapping("/timeline/{id}")
    public ResponseEntity<Map<String, String>> deleteTimelineEvent(@PathVariable String id) {
        database.deleteTimelineEvent(id);
        return ResponseEntity.ok(Map.of("message", "Event deleted"));
    }

}
