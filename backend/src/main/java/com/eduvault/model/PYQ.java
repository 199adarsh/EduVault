package com.eduvault.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PYQ {
    private String id;
    private String subjectId;
    private String subjectName;
    private String examType; // ISE01, ISE02, ESE, Others
    private String year;
    private String tags;
    private String textContent;
    private String fileUrl;
    private String uploadedBy;
    private String createdAt;
}
