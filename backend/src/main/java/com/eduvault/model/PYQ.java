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
}
