package com.eduvault.controller;

import com.eduvault.model.BatchStatus;
import com.eduvault.model.BatchTriggerResult;
import com.eduvault.service.OkfBatchService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/batch/okf")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class OkfBatchController {

    private final OkfBatchService okfBatchService;

    @PostMapping("/trigger")
    public ResponseEntity<BatchTriggerResult> triggerBatch(
            @RequestParam(required = false) String subjectId) {
        BatchTriggerResult result = okfBatchService.triggerBatchJob(subjectId, "ADMIN_TRIGGER");
        return ResponseEntity.ok(result);
    }

    @GetMapping("/status")
    public ResponseEntity<BatchStatus> getStatus() {
        return ResponseEntity.ok(okfBatchService.getBatchStatus());
    }
}
