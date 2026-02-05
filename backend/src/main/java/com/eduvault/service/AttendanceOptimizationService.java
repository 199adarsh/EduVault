package com.eduvault.service;

import com.eduvault.model.OptimizationOutput;
import com.eduvault.model.OptimizationSubject;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Service
public class AttendanceOptimizationService {

    public OptimizationOutput optimizeAttendance(List<OptimizationSubject> subjects, double targetPercentage) {
        int n = subjects.size();
        if (n == 0) return new OptimizationOutput();

        double currentTotal = 0;
        for (OptimizationSubject sub : subjects) {
            double p = sub.getConducted() == 0 ? 0 : ((double) sub.getAttended() / sub.getConducted()) * 100.0;
            sub.setCurrentPercentage(p);
            sub.setNewPercentage(p);
            sub.setToAttend(0);
            currentTotal += p;
        }

        double currentGlobalAvg = currentTotal / n;
        
        List<OptimizationSubject> workingList = new ArrayList<>();
        for (OptimizationSubject sub : subjects) {
            OptimizationSubject copy = new OptimizationSubject(
                sub.getSubjectId(), sub.getSubjectName(),
                sub.getAttended(), sub.getConducted(), sub.getRemaining(),
                0, sub.getCurrentPercentage(), sub.getCurrentPercentage()
            );
            workingList.add(copy);
        }

        int totalLecturesToAttend = 0;
        double simulatedTotal = currentTotal;

        while ((simulatedTotal / n) < targetPercentage) {
            // Find subject that gives max benefit per lecture and has remaining classes
            OptimizationSubject bestSubject = null;
            double maxBenefit = -1;

            for (OptimizationSubject sub : workingList) {
                if (sub.getRemaining() > sub.getToAttend()) {
                    int simAttended = sub.getAttended() + sub.getToAttend() + 1;
                    int simConducted = sub.getConducted() + sub.getToAttend() + 1; // Assuming remaining classes happen and are attended
                    
                    double newP = ((double) simAttended / simConducted) * 100.0;
                    double currentP = ((double) (sub.getAttended() + sub.getToAttend()) / (sub.getConducted() + sub.getToAttend())) * 100.0;
                    if (sub.getConducted() + sub.getToAttend() == 0) currentP = 0;
                    
                    double benefit = newP - currentP;
                    if (benefit > maxBenefit) {
                        maxBenefit = benefit;
                        bestSubject = sub;
                    }
                }
            }

            if (bestSubject == null) {
                break; // No more classes to attend
            }

            bestSubject.setToAttend(bestSubject.getToAttend() + 1);
            totalLecturesToAttend++;
            
            // Recalculate simulated total
            simulatedTotal = 0;
            for (OptimizationSubject sub : workingList) {
                int simAttended = sub.getAttended() + sub.getToAttend();
                int simConducted = sub.getConducted() + sub.getToAttend();
                double p = simConducted == 0 ? 0 : ((double) simAttended / simConducted) * 100.0;
                sub.setNewPercentage(p);
                simulatedTotal += p;
            }
        }

        boolean achievable = (simulatedTotal / n) >= targetPercentage;
        String riskLevel = "SAFE";
        if (!achievable) {
            riskLevel = "CRITICAL";
        } else if ((simulatedTotal / n) < targetPercentage + 2.0) {
            riskLevel = "AT_RISK";
        }

        String actionSummary = achievable 
            ? "Attend " + totalLecturesToAttend + " specific lectures to secure " + String.format("%.1f", targetPercentage) + "%."
            : "Target impossible. Maximum achievable is " + String.format("%.1f", (simulatedTotal / n)) + "%.";

        return OptimizationOutput.builder()
                .achievable(achievable)
                .currentGlobalPercentage(currentGlobalAvg)
                .targetGlobalPercentage(targetPercentage)
                .totalLecturesToAttend(totalLecturesToAttend)
                .requiredActionSummary(actionSummary)
                .riskLevel(riskLevel)
                .subjectBreakdown(workingList)
                .build();
    }
}
