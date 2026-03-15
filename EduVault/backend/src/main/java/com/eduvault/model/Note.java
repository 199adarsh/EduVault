package com.eduvault.model;

import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Note {
    private String id;
    private String title;
    private String subjectId;
    private String department;
    private String semester;
    private String examType;
    private String fileUrl;
    // Note: User requested NO duplicate detection, so checksum is removed/ignored
    private String uploadedBy;
    private String createdAt;
    private String status;
    private List<String> aiImportantTopics;
    private List<Question> aiGeneratedQuestions;
    private String extractedText;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Question {
        private String q;
        private String type; // short|long|mcq
        private String difficulty; // easy|medium|hard
    }
}
