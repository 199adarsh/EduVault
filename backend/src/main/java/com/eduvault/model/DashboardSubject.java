package com.eduvault.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardSubject {
    private String code;
    private String name;
    private int attendance;
    private int cie;
    private int totalConducted;
    private int totalAttended;
    private int totalScheduled;
    private int stillToGo;
    private int credit;
    private int lecturesPerWeek;
    private List<AttendanceRecord> detailedAttendance;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AttendanceRecord {
        private String date;
        private String slot;
        private String status; // Present / Absent
    }
}
