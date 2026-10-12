package com.eduvault.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import jakarta.persistence.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
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
}
