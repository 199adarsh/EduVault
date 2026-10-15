package com.eduvault.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LmsProgress {
    private String status; // IDLE, AUTHENTICATING, DISCOVERING, SYNCING, COMPLETED, FAILED
    private String currentStage;
    private String currentCourse;
    private int currentCourseIndex;
    private int totalCourses;
    private String currentMaterial;
    private int materialsFound;
    private int importedCount;
    private int skippedCount;
    private int failureCount;
    private int percent;
    private List<String> logs;
}
