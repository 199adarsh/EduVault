package com.eduvault.controller;

import com.eduvault.model.OptimizationOutput;
import com.eduvault.model.OptimizationSubject;
import com.eduvault.service.AttendanceOptimizationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/optimization")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class OptimizationController {

    private final AttendanceOptimizationService optimizationService;

    @PostMapping("/calculate")
    public ResponseEntity<OptimizationOutput> calculateOptimization(
            @RequestBody Map<String, Object> payload) {
        
        List<Map<String, Object>> subjectsData = (List<Map<String, Object>>) payload.get("subjects");
        double target = Double.parseDouble(payload.getOrDefault("target", "75.0").toString());
        
        List<OptimizationSubject> subjects = subjectsData.stream().map(data -> 
            OptimizationSubject.builder()
                .subjectId((String) data.get("subjectId"))
                .subjectName((String) data.get("subjectName"))
                .attended((Integer) data.get("attended"))
                .conducted((Integer) data.get("conducted"))
                .remaining((Integer) data.get("remaining"))
                .build()
        ).toList();

        OptimizationOutput output = optimizationService.optimizeAttendance(subjects, target);
        return ResponseEntity.ok(output);
    }
}
