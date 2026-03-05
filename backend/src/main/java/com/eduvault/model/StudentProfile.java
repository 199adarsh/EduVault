package com.eduvault.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentProfile {
    private String name;
    private String image;
    private String rollNo;
    private String abcId;
    private String department;
    private String semester;
    private String section;
    private String prn;
    private String dob;
}
