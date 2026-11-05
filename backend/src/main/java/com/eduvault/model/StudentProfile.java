package com.eduvault.model;

import lombok.Data;
import jakarta.persistence.*;

@Data
@Entity
@Table(name = "student_profiles")
public class StudentProfile {
    @Id
    private String prn;
    
    private String name;
    private String image;
    
    @Column(name = "roll_no")
    private String rollNo;
    
    @Column(name = "abc_id")
    private String abcId;
    
    private String department;
    private String semester;
    private String section;
    private String dob;

    @Transient
    private java.util.List<String> selectedSubjects = new java.util.ArrayList<>();

    @Transient
    private java.util.List<String> subjectIds = new java.util.ArrayList<>();

    @Transient
    private String role;

    public StudentProfile() {
    }

    public StudentProfile(String prn, String name, String image, String rollNo, String abcId, String department, String semester, String section, String dob) {
        this.prn = prn;
        this.name = name;
        this.image = image;
        this.rollNo = rollNo;
        this.abcId = abcId;
        this.department = department;
        this.semester = semester;
        this.section = section;
        this.dob = dob;
    }

    public StudentProfile(String prn, String name, String image, String rollNo, String abcId, String department, String semester, String section, String dob, java.util.List<String> selectedSubjects, java.util.List<String> subjectIds, String role) {
        this.prn = prn;
        this.name = name;
        this.image = image;
        this.rollNo = rollNo;
        this.abcId = abcId;
        this.department = department;
        this.semester = semester;
        this.section = section;
        this.dob = dob;
        this.selectedSubjects = selectedSubjects != null ? selectedSubjects : new java.util.ArrayList<>();
        this.subjectIds = subjectIds != null ? subjectIds : new java.util.ArrayList<>();
        this.role = role;
    }

    public static StudentProfileBuilder builder() {
        return new StudentProfileBuilder();
    }

    public static class StudentProfileBuilder {
        private String prn;
        private String name;
        private String image;
        private String rollNo;
        private String abcId;
        private String department;
        private String semester;
        private String section;
        private String dob;
        private java.util.List<String> selectedSubjects = new java.util.ArrayList<>();
        private java.util.List<String> subjectIds = new java.util.ArrayList<>();
        private String role;

        public StudentProfileBuilder prn(String prn) { this.prn = prn; return this; }
        public StudentProfileBuilder name(String name) { this.name = name; return this; }
        public StudentProfileBuilder image(String image) { this.image = image; return this; }
        public StudentProfileBuilder rollNo(String rollNo) { this.rollNo = rollNo; return this; }
        public StudentProfileBuilder abcId(String abcId) { this.abcId = abcId; return this; }
        public StudentProfileBuilder department(String department) { this.department = department; return this; }
        public StudentProfileBuilder semester(String semester) { this.semester = semester; return this; }
        public StudentProfileBuilder section(String section) { this.section = section; return this; }
        public StudentProfileBuilder dob(String dob) { this.dob = dob; return this; }
        public StudentProfileBuilder selectedSubjects(java.util.List<String> selectedSubjects) { this.selectedSubjects = selectedSubjects; return this; }
        public StudentProfileBuilder subjectIds(java.util.List<String> subjectIds) { this.subjectIds = subjectIds; return this; }
        public StudentProfileBuilder role(String role) { this.role = role; return this; }

        public StudentProfile build() {
            return new StudentProfile(prn, name, image, rollNo, abcId, department, semester, section, dob, selectedSubjects, subjectIds, role);
        }
    }
}
