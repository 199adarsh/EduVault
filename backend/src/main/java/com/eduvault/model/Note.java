package com.eduvault.model;

import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.io.Serializable;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
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
    
    @Column(name = "extracted_text", columnDefinition = "TEXT")
    private String extractedText;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Question implements Serializable {
        private String q;
        private String type; // short|long|mcq
        private String difficulty; // easy|medium|hard
    }
}
