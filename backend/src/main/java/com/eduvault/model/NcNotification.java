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
@Table(name = "nc_notifications")
public class NcNotification {

    @Id
    private String id;

    @Column(name = "request_id")
    private String requestId;

    @Column(name = "recipient_prn")
    private String recipientPrn; // student PRN or "ALL_TEACHERS"

    @Column(name = "recipient_role")
    private String recipientRole; // "student" or "teacher"

    private String title;

    @Column(columnDefinition = "TEXT")
    private String message;

    private String type; // "SUBMITTED", "APPROVED", "REJECTED"

    @Column(name = "created_at")
    private String createdAt;

    @Builder.Default
    private boolean read = false;
}
