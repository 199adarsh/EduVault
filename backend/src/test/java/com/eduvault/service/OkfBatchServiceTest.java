package com.eduvault.service;

import com.eduvault.filter.ActivityTrackerFilter;
import com.eduvault.model.BatchStatus;
import com.eduvault.model.BatchTriggerResult;
import com.eduvault.model.Note;
import com.eduvault.model.Subject;
import com.eduvault.repository.NoteRepository;
import com.eduvault.repository.SubjectRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.nio.file.Path;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicBoolean;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class OkfBatchServiceTest {

    private OkfBatchService batchService;
    private NoteRepository noteRepository;
    private SubjectRepository subjectRepository;
    private OkfGeneratorService okfGeneratorService;
    private ActivityTrackerFilter activityTrackerFilter;

    @BeforeEach
    void setUp() {
        batchService = new OkfBatchService();
        noteRepository = mock(NoteRepository.class);
        subjectRepository = mock(SubjectRepository.class);
        okfGeneratorService = mock(OkfGeneratorService.class);
        activityTrackerFilter = mock(ActivityTrackerFilter.class);

        ReflectionTestUtils.setField(batchService, "noteRepository", noteRepository);
        ReflectionTestUtils.setField(batchService, "subjectRepository", subjectRepository);
        ReflectionTestUtils.setField(batchService, "okfGeneratorService", okfGeneratorService);
        ReflectionTestUtils.setField(batchService, "activityTrackerFilter", activityTrackerFilter);
        ReflectionTestUtils.setField(batchService, "batchEnabled", true);
        ReflectionTestUtils.setField(batchService, "idleThresholdMs", 1800000L);
    }

    @Test
    @DisplayName("Executes synchronous batch and updates Note okfStatus to PROCESSED")
    void testExecuteBatchSuccess() {
        Subject subject = Subject.builder().id("sub-cs-101").name("Algorithms").build();
        when(subjectRepository.findById("sub-cs-101")).thenReturn(Optional.of(subject));

        Note note = Note.builder()
                .id("note-1")
                .subjectId("sub-cs-101")
                .title("Dynamic Programming")
                .okfStatus("PENDING")
                .build();

        when(noteRepository.findPendingOrFailedOkfNotes(null)).thenReturn(List.of(note));
        when(okfGeneratorService.generateOkfForNote(eq(note), any(Subject.class)))
                .thenReturn(OkfGeneratorService.OkfGenerationResult.success("note-1", "sub-cs-101", Path.of("./data/okf/sub-cs-101/note-1.md"), 1024, Instant.now()));

        BatchTriggerResult result = batchService.executeBatchSync(null, "TEST");

        assertEquals("STARTED", result.getStatus());
        assertEquals(1, result.getProcessedCount());
        assertEquals("PROCESSED", note.getOkfStatus());
        assertNotNull(note.getOkfFilePath());
        assertNotNull(note.getOkfCompiledAt());

        verify(noteRepository, atLeast(2)).save(note);
        verify(okfGeneratorService).compileSubjectBundle("sub-cs-101");
    }

    @Test
    @DisplayName("Rejects overlapping batch runs when already active")
    void testConcurrentBatchRejection() {
        AtomicBoolean isRunning = (AtomicBoolean) ReflectionTestUtils.getField(batchService, "isRunning");
        assertNotNull(isRunning);
        isRunning.set(true);

        BatchTriggerResult result = batchService.triggerBatchJob(null, "TEST");

        assertEquals("ALREADY_RUNNING", result.getStatus());
    }

    @Test
    @DisplayName("Isolates failing note and marks FAILED without breaking other notes")
    void testPartialFailureIsolation() {
        Subject subject = Subject.builder().id("sub-cs-101").name("Algorithms").build();
        when(subjectRepository.findById("sub-cs-101")).thenReturn(Optional.of(subject));

        Note validNote = Note.builder().id("note-valid").subjectId("sub-cs-101").build();
        Note invalidNote = Note.builder().id("note-invalid").subjectId("sub-cs-101").build();

        when(noteRepository.findPendingOrFailedOkfNotes(null)).thenReturn(List.of(validNote, invalidNote));
        when(okfGeneratorService.generateOkfForNote(eq(validNote), any(Subject.class)))
                .thenReturn(OkfGeneratorService.OkfGenerationResult.success("note-valid", "sub-cs-101", Path.of("path1"), 500, Instant.now()));
        when(okfGeneratorService.generateOkfForNote(eq(invalidNote), any(Subject.class)))
                .thenReturn(OkfGeneratorService.OkfGenerationResult.failure("note-invalid", "sub-cs-101", "Text empty"));

        BatchTriggerResult result = batchService.executeBatchSync(null, "TEST");

        assertEquals("STARTED", result.getStatus());
        assertEquals("PROCESSED", validNote.getOkfStatus());
        assertEquals("FAILED", invalidNote.getOkfStatus());
    }

    @Test
    @DisplayName("Reports status metrics correctly via getBatchStatus()")
    void testGetBatchStatus() {
        when(noteRepository.count()).thenReturn(10L);
        when(noteRepository.countByOkfStatus("PROCESSED")).thenReturn(6L);
        when(noteRepository.countByOkfStatus("FAILED")).thenReturn(1L);

        BatchStatus status = batchService.getBatchStatus();

        assertFalse(status.isRunning());
        assertEquals(10, status.getTotalNotes());
        assertEquals(6, status.getCompletedNotes());
        assertEquals(1, status.getFailedNotes());
        assertEquals(3, status.getPendingNotes());
    }

    @Test
    @DisplayName("Triggers batch during idle check when activityTracker is idle and pending notes exist")
    void testIdleBatchCheckTriggers() {
        when(activityTrackerFilter.isIdle(1800000L)).thenReturn(true);
        when(noteRepository.findPendingOrFailedOkfNotes(null)).thenReturn(List.of(Note.builder().id("note-pending").build()));

        batchService.runIdleBatchCheck();

        verify(activityTrackerFilter).resetIdleTimer();
    }
}
