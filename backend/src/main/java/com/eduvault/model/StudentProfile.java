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
}
