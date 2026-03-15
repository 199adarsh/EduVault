package com.eduvault.repository;

import com.eduvault.model.Note;
import com.eduvault.model.StudentProfile;
import com.eduvault.model.Subject;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Repository;

import jakarta.annotation.PostConstruct;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Repository
public class LocalJsonDatabase {

    private static final Logger logger = LoggerFactory.getLogger(LocalJsonDatabase.class);

    @Value("${app.storage.local-dir}")
    private String storageDir;

    private File subjectsFile;
    private File notesFile;
    private File profileFile;
    
    private List<Subject> subjects = new ArrayList<>();
    private List<Note> notes = new ArrayList<>();
    private StudentProfile profile = new StudentProfile();
    private final ObjectMapper mapper = new ObjectMapper();

    @PostConstruct
    public void init() {
        try {
            Path dirPath = Paths.get(storageDir);
            if (!Files.exists(dirPath)) {
                Files.createDirectories(dirPath);
            }
            
            subjectsFile = new File(storageDir, "subjects.json");
            notesFile = new File(storageDir, "notes.json");
            profileFile = new File(storageDir, "profile.json");
            
            if (!subjectsFile.exists()) {
                seedSubjects();
            } else {
                subjects = mapper.readValue(subjectsFile, new TypeReference<List<Subject>>() {});
            }
            
            if (!notesFile.exists()) {
                saveNotes();
            } else {
                notes = mapper.readValue(notesFile, new TypeReference<List<Note>>() {});
            }
            
            if (!profileFile.exists()) {
                saveProfile();
            } else {
                profile = mapper.readValue(profileFile, StudentProfile.class);
            }
            
            logger.info("Local JSON DB initialized at {}", storageDir);
        } catch (IOException e) {
            logger.error("Failed to initialize Local JSON DB", e);
        }
    }

    private void seedSubjects() throws IOException {
        subjects.add(new Subject("1", "Operating Systems", "Computer Science", "Sem 4", "2023-10-01", 0));
        subjects.add(new Subject("2", "Database Systems", "Computer Science", "Sem 4", "2023-10-01", 0));
        subjects.add(new Subject("3", "Computer Networks", "Computer Science", "Sem 5", "2023-10-01", 0));
        saveSubjects();
    }

    public synchronized void saveSubjects() {
        try {
            mapper.writeValue(subjectsFile, subjects);
        } catch (IOException e) {
            logger.error("Failed to write subjects.json", e);
        }
    }

    public synchronized void saveNotes() {
        try {
            mapper.writeValue(notesFile, notes);
            updateSubjectCounts();
        } catch (IOException e) {
            logger.error("Failed to write notes.json", e);
        }
    }
    
    public synchronized void saveProfile() {
        try {
            mapper.writeValue(profileFile, profile);
        } catch (IOException e) {
            logger.error("Failed to write profile.json", e);
        }
    }
    
    public StudentProfile getProfile() {
        return profile;
    }
    
    public StudentProfile updateProfile(StudentProfile newProfile) {
        this.profile = newProfile;
        saveProfile();
        return this.profile;
    }

    private void updateSubjectCounts() {
        for (Subject s : subjects) {
            long count = notes.stream().filter(n -> n.getSubjectId().equals(s.getId())).count();
            s.setNoteCount((int) count);
        }
        saveSubjects();
    }

    public List<Subject> getAllSubjects() {
        return new ArrayList<>(subjects);
    }

    public List<Note> getAllNotes() {
        return new ArrayList<>(notes);
    }

    public Optional<Note> getNoteById(String id) {
        return notes.stream().filter(n -> n.getId().equals(id)).findFirst();
    }

    public void addNote(Note note) {
        notes.add(note);
        saveNotes();
    }
    
    public void updateNote(Note note) {
        for (int i = 0; i < notes.size(); i++) {
            if (notes.get(i).getId().equals(note.getId())) {
                notes.set(i, note);
                saveNotes();
                return;
            }
        }
    }
    
    public void deleteNote(String id) {
        notes.removeIf(n -> n.getId().equals(id));
        saveNotes();
    }
    
    public Subject addSubject(Subject subject) {
        subjects.add(subject);
        saveSubjects();
        return subject;
    }

    public List<Note> getNotesByFilter(String subjectId, String semester, String examType, String keyword, String search, String department) {
        return notes.stream()
            .filter(n -> subjectId == null || subjectId.isEmpty() || n.getSubjectId().equals(subjectId))
            .filter(n -> department == null || department.isEmpty() || (n.getDepartment() != null && n.getDepartment().equalsIgnoreCase(department)))
            .filter(n -> semester == null || semester.isEmpty() || n.getSemester().equals(semester))
            .filter(n -> examType == null || examType.isEmpty() || n.getExamType().equals(examType))
            .filter(n -> keyword == null || keyword.isEmpty() || n.getTitle().toLowerCase().contains(keyword.toLowerCase()))
            .filter(n -> {
                if (search == null || search.trim().isEmpty()) return true;
                String term = search.toLowerCase();
                boolean matchesTitle = n.getTitle() != null && n.getTitle().toLowerCase().contains(term);
                boolean matchesDepartment = n.getDepartment() != null && n.getDepartment().toLowerCase().contains(term);
                boolean matchesSemester = n.getSemester() != null && n.getSemester().toLowerCase().contains(term);
                boolean matchesSubject = false;
                if (n.getSubjectId() != null) {
                    Optional<Subject> sub = subjects.stream().filter(s -> s.getId().equals(n.getSubjectId())).findFirst();
                    if (sub.isPresent() && sub.get().getName().toLowerCase().contains(term)) {
                        matchesSubject = true;
                    }
                }
                return matchesTitle || matchesDepartment || matchesSemester || matchesSubject;
            })
            .collect(Collectors.toList());
    }
}
