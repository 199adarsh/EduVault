package com.eduvault.controller;

import com.eduvault.model.Note;
import com.eduvault.model.StudentProfile;
import com.eduvault.model.Subject;
import com.eduvault.repository.LocalJsonDatabase;
import com.eduvault.service.FileStorageService;
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
public class ApiController {

    @Autowired
    private LocalJsonDatabase database;

    @Autowired
    private FileStorageService fileStorageService;

    @Autowired
    private com.eduvault.service.GeminiService geminiService;

    @GetMapping("/subjects")
    public ResponseEntity<List<Subject>> getSubjects() {
        return ResponseEntity.ok(database.getAllSubjects());
    }

    @GetMapping("/profile")
    public ResponseEntity<StudentProfile> getProfile() {
        return ResponseEntity.ok(database.getProfile());
    }

    @PostMapping("/profile")
    public ResponseEntity<StudentProfile> updateProfile(@RequestBody StudentProfile profile) {
        return ResponseEntity.ok(database.updateProfile(profile));
    }

    @PostMapping("/subjects")
    public ResponseEntity<Subject> createSubject(@RequestBody Map<String, String> payload) {
        String name = payload.get("name");
        String semester = payload.get("semester");
        if (name == null || name.trim().isEmpty() || semester == null || semester.trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        
        Subject subject = Subject.builder()
                .id(UUID.randomUUID().toString())
                .name(name.trim())
                .semester(semester.trim())
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
            @RequestParam(required = false) String department) {
        return ResponseEntity.ok(database.getNotesByFilter(subjectId, semester, examType, keyword, search, department));
    }

    @GetMapping("/notes/{id}")
    public ResponseEntity<Note> getNote(@PathVariable String id) {
        return database.getNoteById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/notes/{id}")
    public ResponseEntity<Map<String, String>> deleteNote(@PathVariable String id) {
        return database.getNoteById(id).map(note -> {
            fileStorageService.deleteFile(note.getFileUrl());
            database.deleteNote(id);
            return ResponseEntity.ok(Map.of("message", "Note deleted successfully"));
        }).orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/files/{noteId}")
    public ResponseEntity<Resource> downloadFile(@PathVariable String noteId) {
        try {
            java.util.Optional<Note> noteOpt = database.getNoteById(noteId);
            if (!noteOpt.isPresent()) {
                return ResponseEntity.notFound().build();
            }
            String fileName = noteOpt.get().getFileUrl();
            Path filePath = fileStorageService.getFilePath(fileName);
            Resource resource = new UrlResource(filePath.toUri());

            if (resource.exists() || resource.isReadable()) {
                String contentType = "application/octet-stream";
                if (fileName.toLowerCase().endsWith(".pdf")) contentType = "application/pdf";
                if (fileName.toLowerCase().endsWith(".pptx")) contentType = "application/vnd.openxmlformats-officedocument.presentationml.presentation";

                return ResponseEntity.ok()
                        .contentType(MediaType.parseMediaType(contentType))
                        .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + resource.getFilename() + "\"")
                        .body(resource);
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception ex) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @PostMapping("/notes/upload")
    public ResponseEntity<Map<String, String>> uploadNote(
            @RequestParam("file") MultipartFile file,
            @RequestParam("title") String title,
            @RequestParam("subjectId") String subjectId,
            @RequestParam(value = "department", required = false, defaultValue = "") String department,
            @RequestParam(value = "semester", required = false, defaultValue = "Sem 1") String semester,
            @RequestParam(value = "examType", required = false, defaultValue = "mid-sem") String examType,
            @RequestParam(value = "uploaderName", required = false, defaultValue = "Anonymous") String uploaderName) {

        // 1. Store File Locally
        String savedFileName = fileStorageService.storeFile(file);
        
        // 2. Extract Text
        String extractedText = fileStorageService.extractText(savedFileName);
        
        // 3. Create Note Record
        Note note = Note.builder()
                .id(UUID.randomUUID().toString())
                .title(title)
                .subjectId(subjectId)
                .department(department)
                .semester(semester)
                .examType(examType)
                .fileUrl(savedFileName) // This is now just the file name
                .uploadedBy(uploaderName)
                .createdAt(LocalDate.now().format(DateTimeFormatter.ISO_DATE))
                .status("processing")
                .extractedText(extractedText)
                .build();

        database.addNote(note);

        // Trigger Async AI generation
        geminiService.processNoteAsync(note.getId());

        return ResponseEntity.ok(Map.of(
                "noteId", note.getId(),
                "title", note.getTitle(),
                "status", "processing"
        ));
    }
}
