package com.eduvault.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OptimizationSubject {
    private String subjectId;
    private String subjectName;
    private int attended;
    private int conducted;
    private int remaining;

    // Outputs
    private int toAttend;
    private double currentPercentage;
    private double newPercentage;
}
