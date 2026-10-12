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
}
