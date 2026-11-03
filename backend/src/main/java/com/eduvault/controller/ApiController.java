package com.eduvault.controller;

import com.eduvault.model.Doubt;
import com.eduvault.model.Note;
import com.eduvault.model.StudentProfile;
import com.eduvault.model.Subject;
import com.eduvault.repository.LocalJsonDatabase;
import com.eduvault.service.BackblazeStorageService;
import com.eduvault.service.FileStorageService;
import com.eduvault.service.GeminiService;
import com.eduvault.service.RAGService;
import com.eduvault.util.AcademicNormalizer;
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
import java.nio.file.Paths;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.Optional;
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
    private GeminiService geminiService;

    @Autowired
    private RAGService ragService;

    @Autowired
    private ObjectMapper mapper;

    @GetMapping("/subjects")
    public ResponseEntity<List<Subject>> getSubjects(
            @RequestParam(required = false) String department,
            @RequestParam(required = false) String semester,
            @RequestParam(required = false) String prn) {
        database.relinkOrphanNotes();
        List<Subject> all = database.getAllSubjects();
        
        // Scope to department and semester if provided
        String targetDept = department;
        String targetSem = semester;
        if (targetDept == null && prn != null && !prn.isBlank()) {
            StudentProfile profile = database.getProfile(prn);
            if (profile != null) {
                targetDept = profile.getDepartment();
                targetSem = profile.getSemester();
            }
        }

        if (targetDept != null || targetSem != null) {
            final String finalDept = targetDept;
            final String finalSem = targetSem;
            all = all.stream()
                .filter(s -> {
                    boolean deptMatch = finalDept == null || AcademicNormalizer.isDepartmentMatch(s.getDepartment(), finalDept);
                    boolean semMatch = finalSem == null || AcademicNormalizer.isSemesterMatch(s.getSemester(), finalSem);
                    return deptMatch && semMatch;
                })
                .collect(java.util.stream.Collectors.toList());
        }
        return ResponseEntity.ok(all);
    }

    @GetMapping("/profile")
    public ResponseEntity<StudentProfile> getProfile(
            @RequestParam(required = false) String prn,
            @RequestHeader(value = "X-Student-PRN", required = false) String headerPrn) {
        String effectivePrn = (prn != null && !prn.isBlank()) ? prn : headerPrn;
        if (effectivePrn == null || effectivePrn.isBlank()) {
            return ResponseEntity.ok(null);
        }
        StudentProfile profile = database.getProfile(effectivePrn);
        if (profile == null) {
            return ResponseEntity.ok(null);
        }
        // Redact plaintext DOB credential to prevent IDOR credential harvesting
        StudentProfile sanitized = new StudentProfile(
                profile.getPrn(),
                profile.getName(),
                profile.getImage(),
                profile.getRollNo(),
                profile.getAbcId(),
                profile.getDepartment(),
                profile.getSemester(),
                profile.getSection(),
                null
        );
        return ResponseEntity.ok(sanitized);
    }

    @PostMapping("/profile")
    public ResponseEntity<StudentProfile> updateProfile(@RequestBody StudentProfile profile) {
        if (profile == null || profile.getPrn() == null || profile.getPrn().trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(database.updateProfile(profile));
    }

    @PostMapping("/profile/logout")
    public ResponseEntity<Void> logoutProfile() {
        // Individual logout does not clear the database
        return ResponseEntity.ok().build();
    }

    @PostMapping("/subjects")
    public ResponseEntity<Subject> createSubject(@RequestBody Map<String, String> payload) {
        String name = payload.get("name");
        String semester = payload.get("semester");
        String department = payload.get("department");
        if (name == null || name.trim().isEmpty() || semester == null || semester.trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        
        Subject subject = Subject.builder()
                .id(UUID.randomUUID().toString())
                .name(name.trim())
                .semester(semester.trim())
                .department(department != null && !department.isBlank() ? department.trim() : "General")
                .createdAt(LocalDate.now().format(DateTimeFormatter.ISO_DATE))
                .noteCount(0)
                .build();
                
        return ResponseEntity.ok(database.addSubject(subject));
    }

    @GetMapping("/notes")
    public ResponseEntity<List<Note>> getNotes(
            @RequestParam(required = false) String subjectId,
            @RequestParam(required = false) String semester,
            @RequestParam(required = false) String examType,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String department,
            @RequestParam(required = false) String unit,
            @RequestParam(required = false) String folder,
            @RequestParam(required = false) String prn,
            @RequestHeader(value = "X-Student-PRN", required = false) String headerPrn,
            @RequestHeader(value = "X-User-Role", required = false) String roleHeader) {

        boolean isTeacher = roleHeader != null && (roleHeader.equalsIgnoreCase("teacher") || roleHeader.equalsIgnoreCase("faculty") || roleHeader.equalsIgnoreCase("admin"));
        String effectivePrn = (prn != null && !prn.isBlank()) ? prn : headerPrn;
        StudentProfile profile = (effectivePrn != null && !effectivePrn.isBlank()) ? database.getProfile(effectivePrn) : null;

        String queryDept = department;
        String querySem = semester;
        if (folder != null && folder.contains("-")) {
            String[] parts = folder.split("-", 2);
            queryDept = parts[0];
            querySem = parts[1];
        }

        // Students must ONLY see notes matching their academic profile
        if (!isTeacher) {
            if (profile != null) {
                String profDept = profile.getDepartment();
                String profSem = profile.getSemester();
                // Reject unauthorized cross-department or cross-semester folder queries by students
                if (queryDept != null && !queryDept.isBlank() && !AcademicNormalizer.isDepartmentMatch(queryDept, profDept)) {
                    return ResponseEntity.ok(java.util.List.of());
                }
                if (querySem != null && !querySem.isBlank() && !AcademicNormalizer.isSemesterMatch(querySem, profSem)) {
                    return ResponseEntity.ok(java.util.List.of());
                }
                queryDept = profDept;
                querySem = profSem;
            } else if (effectivePrn != null && !effectivePrn.isBlank()) {
                String inferredDept = AcademicNormalizer.normalizeDepartment(effectivePrn);
                if (queryDept != null && !queryDept.isBlank() && !AcademicNormalizer.isDepartmentMatch(queryDept, inferredDept)) {
                    return ResponseEntity.ok(java.util.List.of());
                }
                if (queryDept == null || queryDept.isBlank()) {
                    queryDept = inferredDept;
                }
            }
        }

        List<Note> allNotes = database.getAllNotes();
        final String finalDept = queryDept;
        final String finalSem = querySem;
        final String finalSubjectId = subjectId;
        final String finalUnit = unit;
        final String finalSearch = (search != null && !search.isBlank()) ? search.toLowerCase() : ((keyword != null && !keyword.isBlank()) ? keyword.toLowerCase() : null);

        Map<String, Subject> subjectMap = database.getAllSubjects().stream()
                .filter(s -> s.getId() != null)
                .collect(java.util.stream.Collectors.toMap(Subject::getId, s -> s, (s1, s2) -> s1));

        List<Note> filtered = allNotes.stream()
                .filter(n -> {
                    if (finalSubjectId != null && !finalSubjectId.isBlank() && !finalSubjectId.equalsIgnoreCase(n.getSubjectId())) {
                        return false;
                    }
                    if (finalUnit != null && !finalUnit.isBlank() && (n.getUnit() == null || !n.getUnit().equalsIgnoreCase(finalUnit))) {
                        return false;
                    }
                    if (finalDept != null && !finalDept.isBlank() && (finalSubjectId == null || finalSubjectId.isBlank())) {
                        String noteDept = n.getDepartment();
                        if ((noteDept == null || noteDept.isBlank()) && n.getSubjectId() != null) {
                            Subject s = subjectMap.get(n.getSubjectId());
                            if (s != null) noteDept = s.getDepartment();
                        }
                        if (noteDept == null || !AcademicNormalizer.isDepartmentMatch(noteDept, finalDept)) {
                            return false;
                        }
                    }
                    if (finalSem != null && !finalSem.isBlank()) {
                        String noteSem = n.getSemester();
                        if ((noteSem == null || noteSem.isBlank()) && n.getSubjectId() != null) {
                            Subject s = subjectMap.get(n.getSubjectId());
                            if (s != null) noteSem = s.getSemester();
                        }
                        if (noteSem == null || !AcademicNormalizer.isSemesterMatch(noteSem, finalSem)) {
                            return false;
                        }
                    }
                    if (finalSearch != null) {
                        String title = n.getTitle() != null ? n.getTitle().toLowerCase() : "";
                        String text = n.getExtractedText() != null ? n.getExtractedText().toLowerCase() : "";
                        if (!title.contains(finalSearch) && !text.contains(finalSearch)) {
                            return false;
                        }
                    }
                    return true;
                })
                .collect(java.util.stream.Collectors.toList());

        return ResponseEntity.ok(filtered);
    }

    @RequestMapping(value = "/notes/sync-b2", method = {RequestMethod.GET, RequestMethod.POST})
    public ResponseEntity<Map<String, Object>> syncB2Notes() {
        int synced = database.syncNotesFromBackblaze();
        return ResponseEntity.ok(Map.of("syncedCount", synced, "totalNotes", database.getAllNotes().size()));
    }

    @RequestMapping(value = "/notes/repair", method = {RequestMethod.GET, RequestMethod.POST})
    public ResponseEntity<Map<String, Object>> repairNotes() {
        int repaired = database.repairExistingNotes();
        return ResponseEntity.ok(Map.of("repairedCount", repaired, "totalNotes", database.getAllNotes().size()));
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
            String b2Key = note.getB2ObjectKey() != null ? note.getB2ObjectKey() : note.getFileUrl();
            backblazeStorageService.deleteFile(b2Key);
            fileStorageService.deleteFile(note.getFileUrl());
            database.deleteNote(id);
            return ResponseEntity.ok(Map.of("message", "Note deleted successfully"));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/notes")
    public ResponseEntity<Map<String, Object>> deleteAllNotes(
            @RequestHeader(value = "X-User-Role", required = false) String roleHeader) {
        List<Note> all = database.getAllNotes();
        int count = all.size();
        for (Note note : all) {
            try {
                String b2Key = note.getB2ObjectKey() != null ? note.getB2ObjectKey() : note.getFileUrl();
                backblazeStorageService.deleteFile(b2Key);
                fileStorageService.deleteFile(note.getFileUrl());
            } catch (Exception ignored) {}
        }
        int purgedB2 = backblazeStorageService.purgeAllBucketObjects();
        database.deleteAllNotes();
        return ResponseEntity.ok(Map.of("message", "All notes and B2 files deleted successfully", "deletedNotes", count, "purgedB2Objects", purgedB2));
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
            return ResponseEntity.ok(Map.of(
                    "noteId", noteId,
                    "url", "/api/files/raw/" + fileUrl
            ));
        }).orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/files/raw/{fileName}")
    public ResponseEntity<Resource> getRawFile(@PathVariable String fileName) {
        Path path = fileStorageService.getFilePath(fileName);
        if (!java.nio.file.Files.exists(path)) {
            path = Paths.get("./data").resolve(fileName);
        }
        if (!java.nio.file.Files.exists(path)) {
            path = Paths.get("./backend/data").resolve(fileName);
        }

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

        // Fallback: Stream directly from Backblaze B2 if available
        try {
            String b2Key = fileName;
            // Check if fileName is part of a known note's full B2 key path (e.g., folder/subfolder/file.docx)
            Optional<Note> matchingNote = database.getAllNotes().stream()
                    .filter(n -> fileName.equals(n.getFileUrl()) ||
                            (n.getB2ObjectKey() != null && (n.getB2ObjectKey().equals(fileName) || n.getB2ObjectKey().endsWith("/" + fileName))))
                    .findFirst();
            if (matchingNote.isPresent() && matchingNote.get().getB2ObjectKey() != null) {
                b2Key = matchingNote.get().getB2ObjectKey();
            }

            byte[] bytes = backblazeStorageService.getObjectBytes(b2Key);
            if (bytes != null && bytes.length > 0) {
                String ext = fileName.contains(".") ? fileName.substring(fileName.lastIndexOf('.')) : "";
                String contentType = "application/octet-stream";
                if (ext.equalsIgnoreCase(".pdf")) contentType = "application/pdf";
                else if (ext.equalsIgnoreCase(".docx")) contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
                else if (ext.equalsIgnoreCase(".doc")) contentType = "application/msword";

                return ResponseEntity.ok()
                        .contentType(MediaType.parseMediaType(contentType))
                        .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + fileName + "\"")
                        .body(new org.springframework.core.io.ByteArrayResource(bytes));
            }
        } catch (Exception ignored) {}

        return ResponseEntity.notFound().build();
    }

    /**
     * Returns a direct, CORS-safe proxy URL for viewing or downloading the file.
     */
    @GetMapping("/files/{noteId}/presigned")
    public ResponseEntity<Map<String, String>> getPresignedUrl(@PathVariable String noteId) {
        return database.getNoteById(noteId).map(note -> {
            String b2Key = note.getB2ObjectKey() != null ? note.getB2ObjectKey() : note.getFileUrl();
            if (backblazeStorageService != null && b2Key != null && !b2Key.startsWith("http")) {
                try {
                    String presigned = backblazeStorageService.generatePresignedUrl(b2Key);
                    if (presigned != null && !presigned.isBlank()) {
                        return ResponseEntity.ok(Map.of("noteId", noteId, "url", presigned));
                    }
                } catch (Exception ignored) {}
            }
            String fileUrl = note.getFileUrl();
            if (fileUrl != null && fileUrl.startsWith("http")) {
                return ResponseEntity.ok(Map.of("noteId", noteId, "url", fileUrl));
            }
            String rawFilename = fileUrl != null && fileUrl.contains("/") ? fileUrl.substring(fileUrl.lastIndexOf('/') + 1) : fileUrl;
            return ResponseEntity.ok(Map.of(
                    "noteId", noteId,
                    "url", "/api/files/raw/" + rawFilename
            ));
        }).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/notes/upload")
    public ResponseEntity<Map<String, String>> uploadNote(
            @RequestParam("file") MultipartFile file,
            @RequestParam("title") String title,
            @RequestParam("subjectId") String subjectId,
            @RequestParam(value = "department", required = false) String departmentParam,
            @RequestParam(value = "semester", required = false) String semesterParam,
            @RequestParam(value = "unit", required = false, defaultValue = "Unit 1") String unit,
            @RequestParam(value = "examType", required = false, defaultValue = "mid-sem") String examType,
            @RequestParam(value = "category", required = false, defaultValue = "Notes") String category,
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

        // 2. Extract department and semester directly from selected subject or request parameters
        Subject targetSubject = database.getAllSubjects().stream()
                .filter(s -> s.getId().equals(subjectId))
                .findFirst().orElse(null);
        String department = (targetSubject != null && targetSubject.getDepartment() != null && !targetSubject.getDepartment().isBlank())
                ? targetSubject.getDepartment()
                : ((departmentParam != null && !departmentParam.isBlank()) ? departmentParam.trim() : "General");
        String semester = (targetSubject != null && targetSubject.getSemester() != null && !targetSubject.getSemester().isBlank())
                ? targetSubject.getSemester()
                : ((semesterParam != null && !semesterParam.isBlank()) ? semesterParam.trim() : "General");
        
        // 2. Extract text from the in-memory file BEFORE uploading (avoids re-downloading from B2)
        String extractedText = fileStorageService.extractTextFromMultipartFile(file);

        // 3. Construct deterministic B2 key: [CourseCode] [SubjectName]/[Unit]/[filename]
        String safeSubject = targetSubject != null && targetSubject.getName() != null
                ? targetSubject.getName().replaceAll("[\\\\/:*?\"<>|]", "_").trim()
                : "General";
        String safeUnit = (unit != null && !unit.isBlank()) ? unit.replaceAll("[\\\\/:*?\"<>|]", "_").trim() : "General";
        String coursePrefix = (targetSubject != null && targetSubject.getCode() != null && !targetSubject.getCode().isBlank())
                ? targetSubject.getCode().trim().toUpperCase() + " "
                : "";
        String courseFolder = (coursePrefix + safeSubject).trim();
        String originalName = file.getOriginalFilename() != null ? file.getOriginalFilename() : "document.pdf";
        String b2Key = courseFolder + "/" + safeUnit + "/" + UUID.randomUUID() + "-" + originalName;

        String savedFileName = backblazeStorageService.uploadFile(file, b2Key);
        
        // 4. Create Note Record
        Note note = Note.builder()
                .id(UUID.randomUUID().toString())
                .title(title)
                .subjectId(subjectId)
                .department(department) // Auto-filled from profile
                .semester(semester) // Auto-filled from profile
                .unit(unit)
                .examType(examType)
                .fileUrl(savedFileName)
                .b2ObjectKey(savedFileName)
                .originalFilename(file.getOriginalFilename())
                .uploadedBy(uploaderName)
                .createdAt(LocalDate.now().format(DateTimeFormatter.ISO_DATE))
                .status("ready")
                .category(category != null && !category.isBlank() ? category : "Notes")
                .tags(tags != null ? tags : List.of())
                .extractedText(extractedText)
                .build();

        database.addNote(note);

        // Trigger Async AI generation and RAG ingestion
        geminiService.processNoteAsync(note.getId());
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
        return ResponseEntity.ok(geminiService.generateStudyGuide(pyqText, qbText));
    }

    @DeleteMapping("/pyqs")
    public ResponseEntity<?> clearAllPyqs() {
        database.deleteAllPyqs();
        return ResponseEntity.ok(Map.of("message", "All PYQs deleted successfully."));
    }

    @DeleteMapping("/pyqs/{id}")
    public ResponseEntity<?> deletePyq(@PathVariable String id) {
        database.deletePyq(id);
        return ResponseEntity.ok(Map.of("message", "PYQ deleted successfully."));
    }

    // --- Announcement Endpoints (Full CRUD with Permissions & Persistence) ---

    @GetMapping("/announcements")
    public ResponseEntity<List<com.eduvault.model.Announcement>> getAnnouncements() {
        return ResponseEntity.ok(database.getAllAnnouncements());
    }

    @GetMapping("/announcements/recent")
    public ResponseEntity<List<com.eduvault.model.Announcement>> getRecentAnnouncements() {
        return ResponseEntity.ok(database.getRecentAnnouncements(5));
    }

    @GetMapping("/announcements/{id}")
    public ResponseEntity<com.eduvault.model.Announcement> getAnnouncementById(@PathVariable String id) {
        return database.getAnnouncementById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/announcements")
    public ResponseEntity<?> createAnnouncement(
            @RequestHeader(value = "X-User-Role", required = false) String roleHeader,
            @RequestBody com.eduvault.model.Announcement announcement) {
        boolean isTeacher = roleHeader != null && (roleHeader.equalsIgnoreCase("teacher") || roleHeader.equalsIgnoreCase("faculty") || roleHeader.equalsIgnoreCase("admin"));
        if (!isTeacher) {
            return ResponseEntity.status(403).body(Map.of("error", "Permission Denied: Only teachers/faculty can post announcements"));
        }
        if (announcement.getTitle() == null || announcement.getTitle().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Title is required for notice"));
        }
        if (announcement.getId() == null) announcement.setId(UUID.randomUUID().toString());
        if (announcement.getCreatedAt() == null) announcement.setCreatedAt(LocalDate.now().format(DateTimeFormatter.ISO_DATE));
        if (announcement.getPostedBy() == null || announcement.getPostedBy().isBlank()) {
            announcement.setPostedBy("Faculty / Department");
        }
        return ResponseEntity.ok(database.addAnnouncement(announcement));
    }

    @PutMapping("/announcements/{id}")
    public ResponseEntity<?> updateAnnouncement(
            @PathVariable String id,
            @RequestHeader(value = "X-User-Role", required = false) String roleHeader,
            @RequestBody com.eduvault.model.Announcement announcement) {
        boolean isTeacher = roleHeader != null && (roleHeader.equalsIgnoreCase("teacher") || roleHeader.equalsIgnoreCase("faculty") || roleHeader.equalsIgnoreCase("admin"));
        if (!isTeacher) {
            return ResponseEntity.status(403).body(Map.of("error", "Permission Denied: Only teachers/faculty can update notices"));
        }
        return database.updateAnnouncement(id, announcement)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/announcements/{id}")
    public ResponseEntity<?> deleteAnnouncement(
            @PathVariable String id,
            @RequestHeader(value = "X-User-Role", required = false) String roleHeader) {
        boolean isTeacher = roleHeader != null && (roleHeader.equalsIgnoreCase("teacher") || roleHeader.equalsIgnoreCase("faculty") || roleHeader.equalsIgnoreCase("admin"));
        if (!isTeacher) {
            return ResponseEntity.status(403).body(Map.of("error", "Permission Denied: Only teachers/faculty can delete notices"));
        }
        boolean deleted = database.deleteAnnouncement(id);
        if (deleted) {
            return ResponseEntity.ok(Map.of("message", "Notice successfully deleted", "id", id));
        }
        return ResponseEntity.notFound().build();
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
