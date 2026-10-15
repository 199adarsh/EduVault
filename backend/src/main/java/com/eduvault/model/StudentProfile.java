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

        public StudentProfileBuilder prn(String prn) { this.prn = prn; return this; }
        public StudentProfileBuilder name(String name) { this.name = name; return this; }
        public StudentProfileBuilder image(String image) { this.image = image; return this; }
        public StudentProfileBuilder rollNo(String rollNo) { this.rollNo = rollNo; return this; }
        public StudentProfileBuilder abcId(String abcId) { this.abcId = abcId; return this; }
        public StudentProfileBuilder department(String department) { this.department = department; return this; }
        public StudentProfileBuilder semester(String semester) { this.semester = semester; return this; }
        public StudentProfileBuilder section(String section) { this.section = section; return this; }
        public StudentProfileBuilder dob(String dob) { this.dob = dob; return this; }

        public StudentProfile build() {
            return new StudentProfile(prn, name, image, rollNo, abcId, department, semester, section, dob);
        }
    }
}
