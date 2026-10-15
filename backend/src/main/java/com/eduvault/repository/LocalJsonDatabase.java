package com.eduvault.repository;

import com.eduvault.model.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Repository;

import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Repository
@Primary
public class LocalJsonDatabase {

    private static final Logger logger = LoggerFactory.getLogger(LocalJsonDatabase.class);

    @Autowired
    private SubjectRepository subjectRepository;

    @Autowired
    private NoteRepository noteRepository;

    @Autowired
    private StudentProfileRepository studentProfileRepository;

    @Autowired
    private DoubtRepository doubtRepository;

    @Autowired
    private PYQRepository pyqRepository;

    @Autowired
    private AnnouncementRepository announcementRepository;

    @Autowired
    private PredefinedRoadmapRepository predefinedRoadmapRepository;

    @Autowired
    private TimelineEventRepository timelineEventRepository;

    @Autowired
    @org.springframework.context.annotation.Lazy
    private com.eduvault.service.BackblazeStorageService backblazeStorageService;

    @Autowired
    @org.springframework.context.annotation.Lazy
    private com.eduvault.service.FileStorageService fileStorageService;

    private final ObjectMapper mapper = mapperWithJava8Time();

    private ObjectMapper mapperWithJava8Time() {
        ObjectMapper m = new ObjectMapper();
        m.registerModule(new com.fasterxml.jackson.datatype.jsr310.JavaTimeModule());
        return m;
    }

    @PostConstruct
    public void init() {
        logger.info("LocalJsonDatabase redirected to Supabase/PostgreSQL");

        // Seed Profile if empty
        seedIfEmpty("profile.json", new com.fasterxml.jackson.core.type.TypeReference<StudentProfile>() {}, sp -> studentProfileRepository.save(sp), studentProfileRepository.count());

        // Seed Subjects if empty
        seedIfEmpty("subjects.json", new com.fasterxml.jackson.core.type.TypeReference<List<Subject>>() {}, list -> subjectRepository.saveAll(list), subjectRepository.count());

        // Seed Notes if empty
        seedIfEmpty("notes.json", new com.fasterxml.jackson.core.type.TypeReference<List<Note>>() {}, list -> noteRepository.saveAll(list), noteRepository.count());

        // Seed Doubts if empty
        seedIfEmpty("doubts.json", new com.fasterxml.jackson.core.type.TypeReference<List<Doubt>>() {}, list -> doubtRepository.saveAll(list), doubtRepository.count());

        // Seed PYQs if empty
        seedIfEmpty("pyqs.json", new com.fasterxml.jackson.core.type.TypeReference<List<PYQ>>() {}, list -> pyqRepository.saveAll(list), pyqRepository.count());

        // Seed Announcements if empty
        seedIfEmpty("announcements.json", new com.fasterxml.jackson.core.type.TypeReference<List<Announcement>>() {}, list -> announcementRepository.saveAll(list), announcementRepository.count());

        // Seed Timeline Events if empty
        seedIfEmpty("timeline.json", new com.fasterxml.jackson.core.type.TypeReference<List<TimelineEvent>>() {}, list -> timelineEventRepository.saveAll(list), timelineEventRepository.count());

        // Seed Predefined Roadmaps if empty
        if (predefinedRoadmapRepository.count() == 0) {
            seedIfEmpty("roadmaps.json", new com.fasterxml.jackson.core.type.TypeReference<List<PredefinedRoadmap>>() {}, list -> predefinedRoadmapRepository.saveAll(list), 0);
            if (predefinedRoadmapRepository.count() == 0) {
                try {
                    org.springframework.core.io.ClassPathResource resource = new org.springframework.core.io.ClassPathResource("seed_roadmaps.json");
                    if (resource.exists()) {
                        List<PredefinedRoadmap> defaultRoadmaps = mapper.readValue(
                                resource.getInputStream(),
                                new com.fasterxml.jackson.core.type.TypeReference<List<PredefinedRoadmap>>() {}
                        );
                        predefinedRoadmapRepository.saveAll(defaultRoadmaps);
                        logger.info("Seeded predefined roadmaps from classpath resource");
                    }
                } catch (IOException e) {
                    logger.error("Failed to seed predefined roadmaps", e);
                }
            }
        }

        updateSubjectCounts();
        
        // Repair existing note records
        repairExistingNotes();
    }

    public synchronized int repairExistingNotes() {
        try {
            subjectRepository.findById("ef0e44fc-760d-4b34-93ad-e525d4a5e1c8").ifPresent(subjectRepository::delete);
            List<Subject> subjects = subjectRepository.findAll();
            List<Note> allNotes = noteRepository.findAll();
            int repaired = 0;

            for (Note note : allNotes) {
                if (note.getB2ObjectKey() == null && note.getFileUrl() != null) {
                    note.setB2ObjectKey(note.getFileUrl());
                }

                boolean validSubject = note.getSubjectId() != null && subjects.stream().anyMatch(s -> s.getId().equals(note.getSubjectId()));
                if (!validSubject || "PENDING_MAPPING".equals(note.getStatus())) {
                    Subject matched = findSubjectFromContent(note.getExtractedText(), subjects);
                    if (matched == null && note.getTitle() != null) {
                        matched = findSubjectFromContent(note.getTitle(), subjects);
                    }
                    if (matched != null) {
                        note.setSubjectId(matched.getId());
                        note.setDepartment(matched.getDepartment());
                        note.setSemester(matched.getSemester());
                        note.setStatus("ready");
                        repaired++;
                    } else {
                        note.setSubjectId(null);
                        note.setStatus("PENDING_MAPPING");
                    }
                }
            }

            if (repaired > 0) {
                noteRepository.saveAll(allNotes);
                updateSubjectCounts();
                logger.info("Repaired {} existing note records according to subject schema", repaired);
            }
            return repaired;
        } catch (Exception e) {
            logger.warn("Error during repairExistingNotes: {}", e.getMessage());
            return 0;
        }
    }

    public synchronized int syncNotesFromBackblaze() {
        if (backblazeStorageService == null) return 0;
        try {
            logger.info("Checking notes from Backblaze B2 bucket...");

            List<software.amazon.awssdk.services.s3.model.S3Object> objects = backblazeStorageService.listAllObjects();
            if (objects.isEmpty()) return 0;

            java.util.Set<String> existingFileUrls = noteRepository.findAll().stream()
                    .map(Note::getFileUrl)
                    .filter(java.util.Objects::nonNull)
                    .collect(java.util.stream.Collectors.toSet());

            List<Subject> subjects = subjectRepository.findAll();
            List<Note> newNotes = new java.util.ArrayList<>();

            // Load cached notes from notes.json to preserve pre-extracted text
            java.util.Map<String, Note> cachedNotesByKey = new java.util.HashMap<>();
            try {
                java.nio.file.Path notesJsonPath = java.nio.file.Paths.get("data", "notes.json");
                if (!java.nio.file.Files.exists(notesJsonPath)) {
                    notesJsonPath = java.nio.file.Paths.get("backend", "data", "notes.json");
                }
                if (java.nio.file.Files.exists(notesJsonPath)) {
                    List<Note> cachedList = mapper.readValue(notesJsonPath.toFile(), new com.fasterxml.jackson.core.type.TypeReference<List<Note>>() {});
                    if (cachedList != null) {
                        for (Note cn : cachedList) {
                            if (cn.getFileUrl() != null) cachedNotesByKey.put(cn.getFileUrl(), cn);
                        }
                    }
                }
            } catch (Exception ignored) {}

            for (software.amazon.awssdk.services.s3.model.S3Object obj : objects) {
                String key = obj.key();
                if (key.endsWith(".json") || key.endsWith("/") || key.startsWith(".")) continue;
                if (existingFileUrls.contains(key)) continue;

                String ext = key.contains(".") ? key.substring(key.lastIndexOf('.')) : "";

                // Attempt text extraction for reliable metadata and course code mapping
                String extractedText = "";
                if (cachedNotesByKey.containsKey(key)) {
                    Note cached = cachedNotesByKey.get(key);
                    if (cached.getExtractedText() != null && !cached.getExtractedText().isBlank()) {
                        extractedText = cached.getExtractedText();
                    }
                }

                if (extractedText.isBlank() && fileStorageService != null) {
                    try {
                        extractedText = fileStorageService.extractText(key);
                    } catch (Exception ignored) {}
                }

                if (extractedText == null || extractedText.isBlank()
                        || extractedText.startsWith("File not found")
                        || extractedText.startsWith("Failed to extract")
                        || extractedText.startsWith("Text extraction only")) {
                    extractedText = "";
                    if (backblazeStorageService != null) {
                        try {
                            byte[] bytes = backblazeStorageService.getObjectBytes(key);
                            if (bytes != null && bytes.length > 0 && fileStorageService != null) {
                                extractedText = fileStorageService.extractTextFromBytes(bytes, key);
                            }
                        } catch (Exception ignored) {}
                    }
                }

                if (extractedText == null
                        || extractedText.startsWith("File not found")
                        || extractedText.startsWith("Failed to extract")
                        || extractedText.startsWith("Text extraction only")) {
                    extractedText = "";
                }

                Subject matched = findSubjectFromContent(extractedText, subjects);
                String title = extractTitleFromContent(extractedText, key, ext);
                if (matched == null && title != null) {
                    matched = findSubjectFromContent(title, subjects);
                }
                String unit = extractUnitFromContent(extractedText);

                Note note = Note.builder()
                        .id(java.util.UUID.randomUUID().toString())
                        .title(title)
                        .fileUrl(key)
                        .b2ObjectKey(key)
                        .unit(unit)
                        .examType("mid-sem")
                        .uploadedBy("Backblaze B2")
                        .createdAt(java.time.LocalDate.now().format(java.time.format.DateTimeFormatter.ISO_DATE))
                        .extractedText(extractedText != null && extractedText.length() > 5000 ? extractedText.substring(0, 5000) : extractedText)
                        .build();

                if (matched != null) {
                    note.setSubjectId(matched.getId());
                    note.setDepartment(matched.getDepartment());
                    note.setSemester(matched.getSemester());
                    note.setStatus("ready");
                } else {
                    note.setSubjectId(null);
                    note.setStatus("PENDING_MAPPING");
                }

                newNotes.add(note);
                existingFileUrls.add(key);
                noteRepository.save(note);
                if (newNotes.size() % 10 == 0) {
                    updateSubjectCounts();
                    logger.info("Progress: synced {} notes from B2", newNotes.size());
                }
            }

            if (!newNotes.isEmpty()) {
                long mappedCount = newNotes.stream().filter(n -> n.getSubjectId() != null).count();
                logger.info("Synced {} notes from B2 ({} mapped to subjects, {} marked PENDING_MAPPING)", 
                        newNotes.size(), mappedCount, newNotes.size() - mappedCount);
                updateSubjectCounts();
                return newNotes.size();
            }
        } catch (Exception e) {
            logger.error("Error during Backblaze B2 note synchronization: {}", e.getMessage(), e);
        }
        return 0;
    }

    public synchronized int deleteDisposableTestImportNotes() {
        try {
            List<Note> testNotes = noteRepository.findByUploadedBy("Backblaze B2");
            int deleted = 0;
            for (Note n : testNotes) {
                if (n.getFileUrl() != null && backblazeStorageService != null) {
                    try {
                        backblazeStorageService.deleteFile(n.getFileUrl());
                    } catch (Exception ex) {
                        logger.warn("Could not delete B2 file {}: {}", n.getFileUrl(), ex.getMessage());
                    }
                }
                noteRepository.delete(n);
                deleted++;
            }
            updateSubjectCounts();
            logger.info("Safely deleted {} disposable test-import notes and associated B2 files", deleted);
            return deleted;
        } catch (Exception e) {
            logger.error("Error deleting disposable test import notes: {}", e.getMessage(), e);
            return 0;
        }
    }

    private Subject findSubjectFromContent(String text, List<Subject> subjects) {
        if (text == null || text.isBlank() || subjects == null || subjects.isEmpty()) return null;
        String upper = text.toUpperCase();

        // 1. Match verified course codes first
        for (Subject s : subjects) {
            if (s.getCode() != null && !s.getCode().isBlank()) {
                String code = s.getCode().trim().toUpperCase();
                if (upper.contains(code)) {
                    return s;
                }
            }
        }

        // 2. Exact subject name matches
        for (Subject s : subjects) {
            if (s.getName() != null && !s.getName().isBlank()) {
                String name = s.getName().trim().toUpperCase();
                if (upper.equals(name)) return s;
            }
        }

        // 3. Substring matching prioritizing longer subject names first with Lab distinction
        List<Subject> sortedByNameLength = subjects.stream()
                .filter(s -> s.getName() != null && !s.getName().isBlank())
                .sorted((a, b) -> Integer.compare(b.getName().trim().length(), a.getName().trim().length()))
                .toList();

        boolean contentIsLab = upper.contains("LAB") || upper.contains("EXPERIMENT");

        for (Subject s : sortedByNameLength) {
            String name = s.getName().trim().toUpperCase();
            boolean subIsLab = name.contains("LAB") || (s.getCode() != null && s.getCode().toUpperCase().contains("P"));
            if (contentIsLab != subIsLab) continue;

            if (upper.contains(name)) {
                return s;
            }
        }

        // Never force incorrect mappings
        return null;
    }

    private String extractTitleFromContent(String text, String key, String ext) {
        if (text != null && !text.isBlank() 
                && !text.startsWith("File not found") 
                && !text.startsWith("Failed to extract") 
                && !text.startsWith("Text extraction only")) {
            String[] lines = text.split("\\r?\\n");
            for (String line : lines) {
                String trimmed = line.trim();
                if (trimmed.length() >= 4 && trimmed.length() <= 75 
                        && !trimmed.matches("^[0-9a-fA-F-]{36}.*")
                        && !trimmed.toLowerCase().contains("file not found")
                        && !trimmed.toLowerCase().contains("text extraction")) {
                    return trimmed;
                }
            }
        }
        String base = key.contains(".") ? key.substring(0, key.lastIndexOf('.')) : key;
        String clean = base.replaceAll("^[0-9a-fA-F-]{36}[_-]?", "").trim();
        if (clean.isEmpty() || clean.matches("^[0-9a-fA-F-]{36}$")) {
            String shortId = base.length() > 8 ? base.substring(0, 8).toUpperCase() : base.toUpperCase();
            return "Asset " + shortId + " (" + ext.replace(".", "").toUpperCase() + ")";
        }
        return clean;
    }

    private String extractUnitFromContent(String text) {
        if (text == null || text.isBlank()) return "Unit 1";
        java.util.regex.Matcher m = java.util.regex.Pattern.compile("(?i)unit[\\s_-]?0?([1-6])").matcher(text);
        if (m.find()) {
            return "Unit " + m.group(1);
        }
        return "Unit 1";
    }

    private <T> void seedIfEmpty(String fileName, com.fasterxml.jackson.core.type.TypeReference<T> typeRef, java.util.function.Consumer<T> saver, long currentCount) {
        if (currentCount > 0) return;
        try {
            java.nio.file.Path path = java.nio.file.Paths.get("data", fileName);
            if (!java.nio.file.Files.exists(path)) {
                path = java.nio.file.Paths.get("backend", "data", fileName);
            }
            if (java.nio.file.Files.exists(path)) {
                T data = mapper.readValue(path.toFile(), typeRef);
                if (data != null) {
                    saver.accept(data);
                    logger.info("Automatically seeded {} from {}", fileName, path);
                }
            }
        } catch (Exception e) {
            logger.warn("Could not seed {} on startup: {}", fileName, e.getMessage());
        }
    }

    public StudentProfile getProfile() {
        List<StudentProfile> profiles = studentProfileRepository.findAll();
        if (profiles.isEmpty()) {
            return new StudentProfile();
        }
        return profiles.get(0);
    }
    
    public StudentProfile updateProfile(StudentProfile newProfile) {
        if (newProfile.getPrn() == null || newProfile.getPrn().trim().isEmpty()) {
            newProfile.setPrn("DEFAULT_PRN");
        }
        return studentProfileRepository.save(newProfile);
    }

    public synchronized void clearProfileAndSubjects() {
        studentProfileRepository.deleteAll();
        subjectRepository.deleteAll();
    }

    private void updateSubjectCounts() {
        relinkOrphanNotes();
        List<Subject> subjects = subjectRepository.findAll();
        List<Note> notes = noteRepository.findAll();
        for (Subject s : subjects) {
            long count = notes.stream().filter(n -> n.getSubjectId() != null && n.getSubjectId().equals(s.getId())).count();
            s.setNoteCount((int) count);
        }
        subjectRepository.saveAll(subjects);
    }

    public synchronized void relinkOrphanNotes() {
        List<Subject> subjects = subjectRepository.findAll();
        List<Note> notes = noteRepository.findAll();
        if (subjects.isEmpty() || notes.isEmpty()) return;

        java.util.Set<String> validIds = subjects.stream()
                .map(Subject::getId)
                .collect(java.util.stream.Collectors.toSet());

        List<Note> toUpdate = new java.util.ArrayList<>();
        for (Note n : notes) {
            if (n.getSubjectId() == null || !validIds.contains(n.getSubjectId())) {
                Subject matched = matchSubjectForNote(n, subjects);
                if (matched != null) {
                    n.setSubjectId(matched.getId());
                    toUpdate.add(n);
                }
            }
        }
        if (!toUpdate.isEmpty()) {
            noteRepository.saveAll(toUpdate);
            logger.info("Relinked {} orphan notes to their respective subjects", toUpdate.size());
        }
    }

    private Subject matchSubjectForNote(Note note, List<Subject> subjects) {
        String combined = (note.getTitle() != null ? note.getTitle() + " " : "")
                + (note.getTags() != null ? String.join(" ", note.getTags()) + " " : "")
                + (note.getExtractedText() != null ? note.getExtractedText() : "");
        Subject fromContent = findSubjectFromContent(combined, subjects);
        if (fromContent != null) return fromContent;

        String tags = note.getTags() != null ? String.join(" ", note.getTags()).toUpperCase() : "";
        String title = note.getTitle() != null ? note.getTitle().toUpperCase() : "";

        for (Subject s : subjects) {
            String sName = s.getName() != null ? s.getName().toUpperCase() : "";
            if (s.getCode() != null && !s.getCode().isEmpty() && tags.contains(s.getCode().toUpperCase())) {
                return s;
            }
            if (tags.contains("01ADP303") && sName.contains("WEB")) return s;
            if (tags.contains("01ADL301") && sName.contains("DATABASE") && !sName.contains("LAB")) return s;
            if (tags.contains("01ADL302") && sName.contains("MACHINE LEARNING") && !sName.contains("LAB")) return s;
            if (tags.contains("01ADL333") && sName.contains("FEATURE") && !sName.contains("LAB")) return s;
            if (tags.contains("MINI-PROJECT") && sName.contains("MINI PROJECT")) return s;
            if (title.contains("ENTREPRENEURSHIP") && sName.contains("ENTREPRENEURSHIP")) return s;
        }

        for (Subject s : subjects) {
            String sName = s.getName() != null ? s.getName().toUpperCase() : "";
            if (!sName.isEmpty() && (title.contains(sName) || tags.contains(sName))) {
                return s;
            }
        }
        return null;
    }

    public synchronized void setSubjects(List<Subject> newSubjects) {
        List<Subject> existing = subjectRepository.findAll();
        java.util.Map<String, String> nameToId = new java.util.HashMap<>();
        for (Subject s : existing) {
            if (s.getName() != null) {
                nameToId.put(s.getName().trim().toLowerCase(), s.getId());
            }
        }

        for (Subject s : newSubjects) {
            if (s.getName() != null) {
                String existingId = nameToId.get(s.getName().trim().toLowerCase());
                if (existingId != null) {
                    s.setId(existingId);
                }
            }
        }
        subjectRepository.saveAll(newSubjects);
        updateSubjectCounts();
    }

    public List<Subject> getAllSubjects() {
        return subjectRepository.findAll();
    }

    public List<Note> getAllNotes() {
        return noteRepository.findAll();
    }

    public Optional<Note> getNoteById(String id) {
        return noteRepository.findById(id);
    }

    public void addNote(Note note) {
        noteRepository.save(note);
        updateSubjectCounts();
    }
    
    public void updateNote(Note note) {
        noteRepository.save(note);
        updateSubjectCounts();
    }
    
    public synchronized Optional<Note> updateNoteTags(String id, List<String> tags) {
        return noteRepository.findById(id).map(note -> {
            note.setTags(tags);
            return noteRepository.save(note);
        });
    }

    public void deleteNote(String id) {
        noteRepository.deleteById(id);
        updateSubjectCounts();
    }
    
    public boolean existsNoteByMoodleId(String moodleId) {
        if (moodleId == null || moodleId.trim().isEmpty()) return false;
        return noteRepository.existsByMoodleId(moodleId);
    }

    public boolean existsNoteBySourceUrl(String sourceUrl) {
        if (sourceUrl == null || sourceUrl.trim().isEmpty()) return false;
        return noteRepository.existsBySourceUrl(sourceUrl);
    }

    public boolean existsNoteByB2ObjectKey(String b2ObjectKey) {
        if (b2ObjectKey == null || b2ObjectKey.trim().isEmpty()) return false;
        return noteRepository.existsByB2ObjectKey(b2ObjectKey);
    }
    
    public Subject addSubject(Subject subject) {
        return subjectRepository.save(subject);
    }

    public Subject updateSubject(Subject subject) {
        return subjectRepository.save(subject);
    }

    public List<Note> getNotesByFilter(String subjectId, String semester, String examType, String keyword, String search, String department, String unit) {
        if ((subjectId == null || subjectId.isBlank()) &&
            (semester == null || semester.isBlank()) &&
            (examType == null || examType.isBlank()) &&
            (keyword == null || keyword.isBlank()) &&
            (search == null || search.isBlank()) &&
            (department == null || department.isBlank()) &&
            (unit == null || unit.isBlank())) {
            return noteRepository.findAll();
        }
        return noteRepository.findByFilters(subjectId, semester, examType, keyword, search, department, unit);
    }

    public List<Doubt> getDoubtsByNoteId(String noteId) {
        return doubtRepository.findByNoteId(noteId);
    }

    public void addDoubt(Doubt doubt) {
        doubtRepository.save(doubt);
    }

    public void updateDoubt(Doubt doubt) {
        doubtRepository.save(doubt);
    }

    public List<PYQ> getAllPyqs() {
        return pyqRepository.findAll();
    }

    public synchronized PYQ addPyq(PYQ pyq) {
        return pyqRepository.save(pyq);
    }

    public List<PYQ> getPyqsByFilter(String subjectId, String examType) {
        return pyqRepository.findByFilters(subjectId, examType);
    }

    public List<Announcement> getAllAnnouncements() {
        return announcementRepository.findAll();
    }

    public Optional<Announcement> getAnnouncementById(String id) {
        return announcementRepository.findById(id);
    }

    public synchronized Announcement addAnnouncement(Announcement announcement) {
        if (announcement.getId() == null || announcement.getId().isBlank()) {
            announcement.setId(java.util.UUID.randomUUID().toString());
        }
        if (announcement.getCreatedAt() == null || announcement.getCreatedAt().isBlank()) {
            announcement.setCreatedAt(java.time.Instant.now().toString());
        }
        Announcement saved = announcementRepository.save(announcement);
        saveAnnouncementsBackup();
        return saved;
    }

    public synchronized Optional<Announcement> updateAnnouncement(String id, Announcement updated) {
        return announcementRepository.findById(id).map(existing -> {
            if (updated.getTitle() != null) existing.setTitle(updated.getTitle());
            if (updated.getDescription() != null) existing.setDescription(updated.getDescription());
            if (updated.getTag() != null) existing.setTag(updated.getTag());
            if (updated.getColor() != null) existing.setColor(updated.getColor());
            if (updated.getPostedBy() != null) existing.setPostedBy(updated.getPostedBy());
            if (updated.getAuthorRole() != null) existing.setAuthorRole(updated.getAuthorRole());
            if (updated.getIsPinned() != null) existing.setIsPinned(updated.getIsPinned());
            Announcement saved = announcementRepository.save(existing);
            saveAnnouncementsBackup();
            return saved;
        });
    }

    public synchronized boolean deleteAnnouncement(String id) {
        if (announcementRepository.existsById(id)) {
            announcementRepository.deleteById(id);
            saveAnnouncementsBackup();
            return true;
        }
        return false;
    }

    private void saveAnnouncementsBackup() {
        try {
            java.nio.file.Path path = java.nio.file.Paths.get("data", "announcements.json");
            if (!java.nio.file.Files.exists(path)) {
                java.nio.file.Path backendData = java.nio.file.Paths.get("backend", "data", "announcements.json");
                if (java.nio.file.Files.exists(backendData)) path = backendData;
            }
            if (path.getParent() != null && !java.nio.file.Files.exists(path.getParent())) {
                java.nio.file.Files.createDirectories(path.getParent());
            }
            mapper.writeValue(path.toFile(), announcementRepository.findAll());
        } catch (Exception e) {
            logger.warn("Could not sync announcements to backup file: {}", e.getMessage());
        }
    }

    public List<Announcement> getRecentAnnouncements(int count) {
        return announcementRepository.findAll().stream().limit(count).toList();
    }

    public List<PredefinedRoadmap> getAllRoadmaps() {
        return predefinedRoadmapRepository.findAll();
    }

    public Optional<PredefinedRoadmap> getRoadmapById(String id) {
        return predefinedRoadmapRepository.findById(id);
    }

    public List<TimelineEvent> getAllTimelineEvents() {
        return timelineEventRepository.findAll();
    }

    public synchronized void addTimelineEvent(TimelineEvent event) {
        timelineEventRepository.save(event);
    }

    public synchronized void updateTimelineEvent(TimelineEvent event) {
        timelineEventRepository.save(event);
    }

    public synchronized void deleteTimelineEvent(String id) {
        timelineEventRepository.deleteById(id);
    }
}
