package com.eduvault.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Announcement {
    private String id;
    private String title;
    private String description;
    private String tag;
    private String color; // green, yellow, red
    private String postedBy; // Teacher/Admin
    private String createdAt;
}
