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

    private final ObjectMapper mapper = mapperWithJava8Time();

    private ObjectMapper mapperWithJava8Time() {
        ObjectMapper m = new ObjectMapper();
        m.registerModule(new com.fasterxml.jackson.datatype.jsr310.JavaTimeModule());
        return m;
    }

    @PostConstruct
    public void init() {
        logger.info("LocalJsonDatabase redirected to Supabase/PostgreSQL");
        // Seeding predefined roadmaps if database table is empty
        if (predefinedRoadmapRepository.count() == 0) {
            try {
                org.springframework.core.io.ClassPathResource resource = new org.springframework.core.io.ClassPathResource("seed_roadmaps.json");
                if (resource.exists()) {
                    List<PredefinedRoadmap> defaultRoadmaps = mapper.readValue(
                            resource.getInputStream(),
                            new com.fasterxml.jackson.core.type.TypeReference<List<PredefinedRoadmap>>() {}
                    );
                    predefinedRoadmapRepository.saveAll(defaultRoadmaps);
                    logger.info("Seeded predefined roadmaps into Supabase");
                }
            } catch (IOException e) {
                logger.error("Failed to seed predefined roadmaps", e);
            }
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
        List<Subject> subjects = subjectRepository.findAll();
        List<Note> notes = noteRepository.findAll();
        for (Subject s : subjects) {
            long count = notes.stream().filter(n -> n.getSubjectId() != null && n.getSubjectId().equals(s.getId())).count();
            s.setNoteCount((int) count);
        }
        subjectRepository.saveAll(subjects);
    }

    public synchronized void setSubjects(List<Subject> newSubjects) {
        subjectRepository.deleteAll();
        subjectRepository.saveAll(newSubjects);
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
    
    public Subject addSubject(Subject subject) {
        return subjectRepository.save(subject);
    }

    public Subject updateSubject(Subject subject) {
        return subjectRepository.save(subject);
    }

    public List<Note> getNotesByFilter(String subjectId, String semester, String examType, String keyword, String search, String department, String unit) {
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

    public synchronized Announcement addAnnouncement(Announcement announcement) {
        return announcementRepository.save(announcement);
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
