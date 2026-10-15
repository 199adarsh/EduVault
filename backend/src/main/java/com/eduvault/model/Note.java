package com.eduvault.model;

import lombok.Data;
import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.io.Serializable;
import java.util.List;

@Data
@Entity
@Table(name = "notes")
public class Note {
    @Id
    private String id;
    
    private String title;
    
    @Column(name = "subject_id")
    private String subjectId;
    
    private String department;
    private String semester;
    private String unit;
    
    @Column(name = "exam_type")
    private String examType;
    
    @Column(name = "file_url")
    private String fileUrl;
    
    @Column(name = "uploaded_by")
    private String uploadedBy;
    
    @Column(name = "created_at")
    private String createdAt;
    
    private String status;
    
    @Column(name = "category")
    private String category;
    
    @Column(name = "moodle_id")
    private String moodleId;
    
    @Column(name = "source_url")
    private String sourceUrl;
    
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "tags", columnDefinition = "jsonb")
    private List<String> tags;
    
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "ai_important_topics", columnDefinition = "jsonb")
    private List<String> aiImportantTopics;
    
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "ai_generated_questions", columnDefinition = "jsonb")
    private List<Question> aiGeneratedQuestions;
    
    @Column(name = "b2_object_key")
    private String b2ObjectKey;

    @Column(name = "original_filename")
    private String originalFilename;

    @Column(name = "import_batch_id")
    private String importBatchId;

    @Column(name = "extracted_text", columnDefinition = "TEXT")
    private String extractedText;

    public Note() {
    }

    public Note(String id, String title, String subjectId, String department, String semester, String unit, String examType, String fileUrl, String b2ObjectKey, String originalFilename, String importBatchId, String uploadedBy, String createdAt, String status, String category, String moodleId, String sourceUrl, List<String> tags, List<String> aiImportantTopics, List<Question> aiGeneratedQuestions, String extractedText) {
        this.id = id;
        this.title = title;
        this.subjectId = subjectId;
        this.department = department;
        this.semester = semester;
        this.unit = unit;
        this.examType = examType;
        this.fileUrl = fileUrl;
        this.b2ObjectKey = b2ObjectKey;
        this.originalFilename = originalFilename;
        this.importBatchId = importBatchId;
        this.uploadedBy = uploadedBy;
        this.createdAt = createdAt;
        this.status = status;
        this.category = category;
        this.moodleId = moodleId;
        this.sourceUrl = sourceUrl;
        this.tags = tags;
        this.aiImportantTopics = aiImportantTopics;
        this.aiGeneratedQuestions = aiGeneratedQuestions;
        this.extractedText = extractedText;
    }

    public static NoteBuilder builder() {
        return new NoteBuilder();
    }

    public static class NoteBuilder {
        private String id;
        private String title;
        private String subjectId;
        private String department;
        private String semester;
        private String unit;
        private String examType;
        private String fileUrl;
        private String b2ObjectKey;
        private String originalFilename;
        private String importBatchId;
        private String uploadedBy;
        private String createdAt;
        private String status;
        private String category;
        private String moodleId;
        private String sourceUrl;
        private List<String> tags;
        private List<String> aiImportantTopics;
        private List<Question> aiGeneratedQuestions;
        private String extractedText;

        public NoteBuilder id(String id) { this.id = id; return this; }
        public NoteBuilder title(String title) { this.title = title; return this; }
        public NoteBuilder subjectId(String subjectId) { this.subjectId = subjectId; return this; }
        public NoteBuilder department(String department) { this.department = department; return this; }
        public NoteBuilder semester(String semester) { this.semester = semester; return this; }
        public NoteBuilder unit(String unit) { this.unit = unit; return this; }
        public NoteBuilder examType(String examType) { this.examType = examType; return this; }
        public NoteBuilder fileUrl(String fileUrl) { this.fileUrl = fileUrl; return this; }
        public NoteBuilder b2ObjectKey(String b2ObjectKey) { this.b2ObjectKey = b2ObjectKey; return this; }
        public NoteBuilder originalFilename(String originalFilename) { this.originalFilename = originalFilename; return this; }
        public NoteBuilder importBatchId(String importBatchId) { this.importBatchId = importBatchId; return this; }
        public NoteBuilder uploadedBy(String uploadedBy) { this.uploadedBy = uploadedBy; return this; }
        public NoteBuilder createdAt(String createdAt) { this.createdAt = createdAt; return this; }
        public NoteBuilder status(String status) { this.status = status; return this; }
        public NoteBuilder category(String category) { this.category = category; return this; }
        public NoteBuilder moodleId(String moodleId) { this.moodleId = moodleId; return this; }
        public NoteBuilder sourceUrl(String sourceUrl) { this.sourceUrl = sourceUrl; return this; }
        public NoteBuilder tags(List<String> tags) { this.tags = tags; return this; }
        public NoteBuilder aiImportantTopics(List<String> aiImportantTopics) { this.aiImportantTopics = aiImportantTopics; return this; }
        public NoteBuilder aiGeneratedQuestions(List<Question> aiGeneratedQuestions) { this.aiGeneratedQuestions = aiGeneratedQuestions; return this; }
        public NoteBuilder extractedText(String extractedText) { this.extractedText = extractedText; return this; }

        public Note build() {
            return new Note(id, title, subjectId, department, semester, unit, examType, fileUrl, b2ObjectKey, originalFilename, importBatchId, uploadedBy, createdAt, status, category, moodleId, sourceUrl, tags, aiImportantTopics, aiGeneratedQuestions, extractedText);
        }
    }

    @Data
    public static class Question implements Serializable {
        private String q;
        private String type; // short|long|mcq
        private String difficulty; // easy|medium|hard

        public Question() {
        }

        public Question(String q, String type, String difficulty) {
            this.q = q;
            this.type = type;
            this.difficulty = difficulty;
        }
    }
}
