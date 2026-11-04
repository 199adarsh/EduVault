package com.eduvault.controller;

import com.eduvault.model.BatchStatus;
import com.eduvault.model.BatchTriggerResult;
import com.eduvault.service.OkfBatchService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class OkfBatchControllerTest {

    private OkfBatchController controller;
    private OkfBatchService batchService;

    @BeforeEach
    void setUp() {
        batchService = mock(OkfBatchService.class);
        controller = new OkfBatchController(batchService);
    }

    @Test
    @DisplayName("POST /api/batch/okf/trigger delegates to OkfBatchService and returns result")
    void testTriggerBatch() {
        BatchTriggerResult expected = BatchTriggerResult.builder()
                .status("STARTED")
                .jobId("test-job-123")
                .processedCount(3)
                .build();

        when(batchService.triggerBatchJob("sub-101", "ADMIN_TRIGGER")).thenReturn(expected);

        ResponseEntity<BatchTriggerResult> response = controller.triggerBatch("sub-101");

        assertEquals(200, response.getStatusCode().value());
        assertNotNull(response.getBody());
        assertEquals("STARTED", response.getBody().getStatus());
        assertEquals("test-job-123", response.getBody().getJobId());
        assertEquals(3, response.getBody().getProcessedCount());
    }

    @Test
    @DisplayName("GET /api/batch/okf/status returns BatchStatus from OkfBatchService")
    void testGetStatus() {
        BatchStatus expected = BatchStatus.builder()
                .isRunning(false)
                .pendingNotes(2)
                .completedNotes(8)
                .failedNotes(0)
                .totalNotes(10)
                .build();

        when(batchService.getBatchStatus()).thenReturn(expected);

        ResponseEntity<BatchStatus> response = controller.getStatus();

        assertEquals(200, response.getStatusCode().value());
        assertNotNull(response.getBody());
        assertFalse(response.getBody().isRunning());
        assertEquals(8, response.getBody().getCompletedNotes());
        assertEquals(10, response.getBody().getTotalNotes());
    }
}
