package com.eduvault.model;

import com.fasterxml.jackson.annotation.JsonAlias;
import lombok.Data;
import jakarta.persistence.*;

@Data
@Entity
@Table(name = "announcements")
public class Announcement {
    @Id
    private String id;
    
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @JsonAlias({"type", "category"})
    private String tag; // "Official Notice", "Academic", "Schedule", "Exam", "Results"

    @JsonAlias({"colorTag"})
    private String color; // "blue", "yellow", "green", "red"
    
    @Column(name = "posted_by")
    @JsonAlias({"author"})
    private String postedBy; // e.g. "Dean Office", "Faculty"
    
    @Column(name = "created_at")
    private String createdAt;

    @Column(name = "author_role")
    private String authorRole; // e.g. "Department of AI & Data Science"

    @Column(name = "is_pinned")
    private Boolean isPinned = false;

    public Announcement() {
    }

    public Announcement(String id, String title, String description, String tag, String color, String postedBy, String createdAt) {
        this.id = id;
        this.title = title;
        this.description = description;
        this.tag = tag;
        this.color = color;
        this.postedBy = postedBy;
        this.createdAt = createdAt;
    }
}
