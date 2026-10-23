package com.eduvault.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "nc_requests")
public class NcRequest {

    @Id
    private String id;

    @Column(name = "student_prn", nullable = false)
    private String studentPrn;

    @Column(name = "student_name")
    private String studentName;

    @Column(name = "roll_no")
    private String rollNo;

    private String department;
    private String semester;
    private String section;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "absent_dates", columnDefinition = "jsonb")
    @Builder.Default
    private List<String> absentDates = new ArrayList<>();

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "missed_subjects", columnDefinition = "jsonb")
    @Builder.Default
    private List<NcMissedSubject> missedSubjects = new ArrayList<>();

    private String reason;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "proof_file_name")
    private String proofFileName;

    @Column(name = "proof_file_key")
    private String proofFileKey;

    @Column(name = "proof_file_type")
    private String proofFileType;

    @Column(name = "proof_presigned_url", columnDefinition = "TEXT")
    private String proofPresignedUrl;

    @Column(length = 32)
    @Builder.Default
    private String status = "PENDING"; // PENDING, APPROVED, REJECTED

    @Column(name = "created_at")
    private String createdAt;

    @Column(name = "reviewed_by")
    private String reviewedBy;

    @Column(name = "review_comment", columnDefinition = "TEXT")
    private String reviewComment;

    @Column(name = "reviewed_at")
    private String reviewedAt;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class NcMissedSubject {
        private String subjectId;
        private String subjectName;
        private String subjectCode;
        private String date;
        private String slot;
        private String faculty;
    }
}
