package com.eduvault.model;

import lombok.Data;
import jakarta.persistence.*;

@Data
@Entity
@Table(name = "pyqs")
public class PYQ {
    @Id
    private String id;
    
    @Column(name = "subject_id")
    private String subjectId;
    
    @Column(name = "subject_name")
    private String subjectName;
    
    @Column(name = "exam_type")
    private String examType; // ISE01, ISE02, ESE, Others
    
    @Column(name = "\"year\"")
    private String year;
    private String tags;
    
    @Column(name = "text_content", columnDefinition = "TEXT")
    private String textContent;
    
    @Column(name = "file_url")
    private String fileUrl;
    
    @Column(name = "uploaded_by")
    private String uploadedBy;
    
    @Column(name = "created_at")
    private String createdAt;

    public PYQ() {
    }

    public PYQ(String id, String subjectId, String subjectName, String examType, String year, String tags, String textContent, String fileUrl, String uploadedBy, String createdAt) {
        this.id = id;
        this.subjectId = subjectId;
        this.subjectName = subjectName;
        this.examType = examType;
        this.year = year;
        this.tags = tags;
        this.textContent = textContent;
        this.fileUrl = fileUrl;
        this.uploadedBy = uploadedBy;
        this.createdAt = createdAt;
    }

    public static PYQBuilder builder() {
        return new PYQBuilder();
    }

    public static class PYQBuilder {
        private String id;
        private String subjectId;
        private String subjectName;
        private String examType;
        private String year;
        private String tags;
        private String textContent;
        private String fileUrl;
        private String uploadedBy;
        private String createdAt;

        public PYQBuilder id(String id) { this.id = id; return this; }
        public PYQBuilder subjectId(String subjectId) { this.subjectId = subjectId; return this; }
        public PYQBuilder subjectName(String subjectName) { this.subjectName = subjectName; return this; }
        public PYQBuilder examType(String examType) { this.examType = examType; return this; }
        public PYQBuilder year(String year) { this.year = year; return this; }
        public PYQBuilder tags(String tags) { this.tags = tags; return this; }
        public PYQBuilder textContent(String textContent) { this.textContent = textContent; return this; }
        public PYQBuilder fileUrl(String fileUrl) { this.fileUrl = fileUrl; return this; }
        public PYQBuilder uploadedBy(String uploadedBy) { this.uploadedBy = uploadedBy; return this; }
        public PYQBuilder createdAt(String createdAt) { this.createdAt = createdAt; return this; }

        public PYQ build() {
            return new PYQ(id, subjectId, subjectName, examType, year, tags, textContent, fileUrl, uploadedBy, createdAt);
        }
    }
}
