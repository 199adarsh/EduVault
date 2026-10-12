package com.eduvault.model;

import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "subjects")
public class Subject {
    @Id
    private String id;
    
    private String name;
    private String code;
    private String department;
    private String semester;
    
    @Column(name = "created_at")
    private String createdAt;
    
    @Column(name = "note_count")
    private int noteCount; 
    
    private String attendance; 
    private String cie; 
    
    @Column(name = "total_conducted")
    private int totalConducted;
    
    @Column(name = "total_attended")
    private int totalAttended;
    
    @Column(name = "total_scheduled")
    private int totalScheduled;
    
    @Column(name = "still_to_go")
    private int stillToGo;
    
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "detailed_attendance", columnDefinition = "jsonb")
    private java.util.List<DashboardSubject.AttendanceRecord> detailedAttendance;
}
