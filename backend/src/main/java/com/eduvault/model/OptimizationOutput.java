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
public class OptimizationOutput {
    private boolean achievable;
    private double currentGlobalPercentage;
    private double targetGlobalPercentage;
    private int totalLecturesToAttend;
    private String requiredActionSummary;
    private String riskLevel; // SAFE, AT_RISK, CRITICAL
    private List<OptimizationSubject> subjectBreakdown;
}
