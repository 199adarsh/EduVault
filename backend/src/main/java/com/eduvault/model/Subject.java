package com.eduvault.model;

import lombok.Data;
import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.util.List;

@Data
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
    private List<DashboardSubject.AttendanceRecord> detailedAttendance;

    public Subject() {
    }

    public Subject(String id, String name, String code, String department, String semester, String createdAt, int noteCount, String attendance, String cie, int totalConducted, int totalAttended, int totalScheduled, int stillToGo, List<DashboardSubject.AttendanceRecord> detailedAttendance) {
        this.id = id;
        this.name = name;
        this.code = code;
        this.department = department;
        this.semester = semester;
        this.createdAt = createdAt;
        this.noteCount = noteCount;
        this.attendance = attendance;
        this.cie = cie;
        this.totalConducted = totalConducted;
        this.totalAttended = totalAttended;
        this.totalScheduled = totalScheduled;
        this.stillToGo = stillToGo;
        this.detailedAttendance = detailedAttendance;
    }

    public static SubjectBuilder builder() {
        return new SubjectBuilder();
    }

    public static class SubjectBuilder {
        private String id;
        private String name;
        private String code;
        private String department;
        private String semester;
        private String createdAt;
        private int noteCount;
        private String attendance;
        private String cie;
        private int totalConducted;
        private int totalAttended;
        private int totalScheduled;
        private int stillToGo;
        private List<DashboardSubject.AttendanceRecord> detailedAttendance;

        public SubjectBuilder id(String id) { this.id = id; return this; }
        public SubjectBuilder name(String name) { this.name = name; return this; }
        public SubjectBuilder code(String code) { this.code = code; return this; }
        public SubjectBuilder department(String department) { this.department = department; return this; }
        public SubjectBuilder semester(String semester) { this.semester = semester; return this; }
        public SubjectBuilder createdAt(String createdAt) { this.createdAt = createdAt; return this; }
        public SubjectBuilder noteCount(int noteCount) { this.noteCount = noteCount; return this; }
        public SubjectBuilder attendance(String attendance) { this.attendance = attendance; return this; }
        public SubjectBuilder cie(String cie) { this.cie = cie; return this; }
        public SubjectBuilder totalConducted(int totalConducted) { this.totalConducted = totalConducted; return this; }
        public SubjectBuilder totalAttended(int totalAttended) { this.totalAttended = totalAttended; return this; }
        public SubjectBuilder totalScheduled(int totalScheduled) { this.totalScheduled = totalScheduled; return this; }
        public SubjectBuilder stillToGo(int stillToGo) { this.stillToGo = stillToGo; return this; }
        public SubjectBuilder detailedAttendance(List<DashboardSubject.AttendanceRecord> detailedAttendance) { this.detailedAttendance = detailedAttendance; return this; }

        public Subject build() {
            return new Subject(id, name, code, department, semester, createdAt, noteCount, attendance, cie, totalConducted, totalAttended, totalScheduled, stillToGo, detailedAttendance);
        }
    }
}
