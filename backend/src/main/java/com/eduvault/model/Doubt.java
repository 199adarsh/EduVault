package com.eduvault.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Doubt {
    private String id;
    private String noteId;
    private String studentName;
    private String question;
    private String answer;
    private String createdAt;
    private String status; // pending, answered
}
