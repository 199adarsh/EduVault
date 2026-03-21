package com.eduvault.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TimelineEvent {
    private String id;
    private String title;
    private String date; // YYYY-MM-DD
    private String time;
    private String tag; // Exam, Assignment, Event
    private String priority; // low, medium, high
    private boolean active;
}
