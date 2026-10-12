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
@Table(name = "announcements")
public class Announcement {
    @Id
    private String id;
    
    private String title;
    private String description;
    private String tag;
    private String color; // green, yellow, red
    
    @Column(name = "posted_by")
    private String postedBy; // Teacher/Admin
    
    @Column(name = "created_at")
    private String createdAt;
}
