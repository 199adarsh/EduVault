package com.eduvault.model;

import lombok.Data;
import jakarta.persistence.*;

@Data
@Entity
@Table(name = "timeline_events")
public class TimelineEvent {
    @Id
    private String id;
    
    private String title;
    
    @Column(name = "event_date")
    private String date; // YYYY-MM-DD
    
    @Column(name = "event_time")
    private String time;
    
    private String tag; // Exam, Assignment, Event
    private String priority; // low, medium, high
    private boolean active;

    public TimelineEvent() {
    }

    public TimelineEvent(String id, String title, String date, String time, String tag, String priority, boolean active) {
        this.id = id;
        this.title = title;
        this.date = date;
        this.time = time;
        this.tag = tag;
        this.priority = priority;
        this.active = active;
    }
}
