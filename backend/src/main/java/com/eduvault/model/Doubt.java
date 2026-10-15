package com.eduvault.model;

import lombok.Data;
import jakarta.persistence.*;

@Data
@Entity
@Table(name = "doubts")
public class Doubt {
    @Id
    private String id;
    
    @Column(name = "note_id")
    private String noteId;
    
    @Column(name = "student_name")
    private String studentName;
    
    private String question;
    private String answer;
    
    @Column(name = "created_at")
    private String createdAt;
    
    private String status; // pending, answered

    public Doubt() {
    }

    public Doubt(String id, String noteId, String studentName, String question, String answer, String createdAt, String status) {
        this.id = id;
        this.noteId = noteId;
        this.studentName = studentName;
        this.question = question;
        this.answer = answer;
        this.createdAt = createdAt;
        this.status = status;
    }

    public static DoubtBuilder builder() {
        return new DoubtBuilder();
    }

    public static class DoubtBuilder {
        private String id;
        private String noteId;
        private String studentName;
        private String question;
        private String answer;
        private String createdAt;
        private String status;

        public DoubtBuilder id(String id) { this.id = id; return this; }
        public DoubtBuilder noteId(String noteId) { this.noteId = noteId; return this; }
        public DoubtBuilder studentName(String studentName) { this.studentName = studentName; return this; }
        public DoubtBuilder question(String question) { this.question = question; return this; }
        public DoubtBuilder answer(String answer) { this.answer = answer; return this; }
        public DoubtBuilder createdAt(String createdAt) { this.createdAt = createdAt; return this; }
        public DoubtBuilder status(String status) { this.status = status; return this; }

        public Doubt build() {
            return new Doubt(id, noteId, studentName, question, answer, createdAt, status);
        }
    }
}
