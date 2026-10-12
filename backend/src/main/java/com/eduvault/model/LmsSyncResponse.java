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
public class LmsSyncResponse {
    private int totalDiscoveredCourses;
    private int matchedCoursesCount;
    private int unmatchedCoursesCount;
    private int totalMaterialsFound;
    private int importedCount;
    private int skippedDuplicatesCount;
    private int failureCount;
    private List<CourseSyncSummary> courses;
    private List<DiscoveredCourseInfo> allDiscoveredCourses;
    private List<String> unmatchedCourses;
    private List<String> errors;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CourseSyncSummary {
        private String courseId;
        private String courseCode;
        private String courseName;
        private String subjectId;
        private String subjectName;
        private boolean matched;
        private int materialsFound;
        private int importedCount;
        private int skippedCount;
        private int failureCount;
        private String status; // SUCCESS, UNMATCHED, FAILED
        private String message;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DiscoveredCourseInfo {
        private String id;
        private String code;
        private String fullname;
        private String shortname;
        private String viewurl;
        private boolean matched;
        private String matchedSubjectName;
        private String matchedSubjectId;
    }
}
