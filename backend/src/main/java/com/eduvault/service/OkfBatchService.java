package com.eduvault.service;

import com.eduvault.filter.ActivityTrackerFilter;
import com.eduvault.model.BatchStatus;
import com.eduvault.model.BatchTriggerResult;
import com.eduvault.model.Note;
import com.eduvault.model.Subject;
import com.eduvault.repository.NoteRepository;
import com.eduvault.repository.SubjectRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Lazy;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ForkJoinPool;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;

@Service
@Lazy(false)
public class OkfBatchService {

    private static final Logger log = LoggerFactory.getLogger(OkfBatchService.class);

    @Autowired
    private NoteRepository noteRepository;

    @Autowired
    private SubjectRepository subjectRepository;

    @Autowired
    private OkfGeneratorService okfGeneratorService;

    @Autowired(required = false)
    private ActivityTrackerFilter activityTrackerFilter;

    @Value("${app.batch.okf.enabled:true}")
    private boolean batchEnabled;

    @Value("${app.batch.okf.idle-threshold-ms:1800000}")
    private long idleThresholdMs;

    private final AtomicBoolean isRunning = new AtomicBoolean(false);
    private volatile String currentJobId;
    private volatile Instant lastRunStartedAt;
    private volatile Instant lastRunCompletedAt;
    private final AtomicInteger lastProcessedCount = new AtomicInteger(0);
    private final AtomicInteger lastFailedCount = new AtomicInteger(0);

    @Scheduled(cron = "${app.batch.okf.cron:0 0 2 * * ?}")
    public void runOvernightBatch() {
        if (!batchEnabled) return;
        log.info("Triggering scheduled overnight OKF batch compilation at 02:00 AM");
        triggerBatchJob(null, "OVERNIGHT_CRON");
    }

    @Scheduled(fixedDelayString = "${app.batch.okf.idle-check-ms:900000}")
    public void runIdleBatchCheck() {
        if (!batchEnabled) return;
        if (activityTrackerFilter != null && activityTrackerFilter.isIdle(idleThresholdMs)) {
            List<Note> pending = noteRepository.findPendingOrFailedOkfNotes(null);
            if (!pending.isEmpty()) {
                log.info("System idle for >{}ms with {} pending notes. Triggering idle OKF batch.", idleThresholdMs, pending.size());
                triggerBatchJob(null, "IDLE_TRIGGER");
                activityTrackerFilter.resetIdleTimer();
            }
        }
    }

    public BatchTriggerResult triggerBatchJob(String optionalSubjectId, String triggerSource) {
        if (!isRunning.compareAndSet(false, true)) {
            log.warn("Batch trigger rejected: job [{}] already in progress", currentJobId);
            return BatchTriggerResult.builder()
                    .status("ALREADY_RUNNING")
                    .jobId(currentJobId)
                    .message("A batch job is currently active")
                    .build();
        }

        String jobId = UUID.randomUUID().toString();
        this.currentJobId = jobId;
        this.lastRunStartedAt = Instant.now();

        List<Note> pendingNotes = noteRepository.findPendingOrFailedOkfNotes(optionalSubjectId);
        int pendingCount = pendingNotes.size();

        CompletableFuture.runAsync(() -> {
            try {
                executeBatchInternalWithNotes(jobId, pendingNotes, optionalSubjectId);
            } finally {
                isRunning.set(false);
                lastRunCompletedAt = Instant.now();
            }
        }, ForkJoinPool.commonPool());

        return BatchTriggerResult.builder()
                .status("STARTED")
                .jobId(jobId)
                .message("OKF batch generation started (" + triggerSource + ")")
                .processedCount(pendingCount)
                .build();
    }

    public BatchTriggerResult executeBatchSync(String optionalSubjectId, String triggerSource) {
        if (!isRunning.compareAndSet(false, true)) {
            log.warn("Batch trigger rejected: job [{}] already in progress", currentJobId);
            return BatchTriggerResult.builder()
                    .status("ALREADY_RUNNING")
                    .jobId(currentJobId)
                    .message("A batch job is currently active")
                    .build();
        }

        String jobId = UUID.randomUUID().toString();
        this.currentJobId = jobId;
        this.lastRunStartedAt = Instant.now();

        try {
            List<Note> pendingNotes = noteRepository.findPendingOrFailedOkfNotes(optionalSubjectId);
            int count = executeBatchInternalWithNotes(jobId, pendingNotes, optionalSubjectId);
            return BatchTriggerResult.builder()
                    .status("STARTED")
                    .jobId(jobId)
                    .message("OKF batch generation completed (" + triggerSource + ")")
                    .processedCount(count)
                    .build();
        } finally {
            isRunning.set(false);
            lastRunCompletedAt = Instant.now();
        }
    }

    private int executeBatchInternalWithNotes(String jobId, List<Note> notes, String optionalSubjectId) {
        log.info("Starting OKF batch execution [{}] (scope: {}, pending notes: {})",
                jobId, optionalSubjectId != null ? optionalSubjectId : "ALL", notes.size());

        if (notes.isEmpty()) {
            log.info("No pending/failed notes found for OKF batch [{}]", jobId);
            lastProcessedCount.set(0);
            lastFailedCount.set(0);
            return 0;
        }

        int processed = 0;
        int failed = 0;
        Set<String> affectedSubjects = new HashSet<>();

        for (Note note : notes) {
            try {
                note.setOkfStatus("PROCESSING");
                noteRepository.save(note);

                Subject subject = (note.getSubjectId() != null)
                        ? subjectRepository.findById(note.getSubjectId()).orElse(null)
                        : null;

                OkfGeneratorService.OkfGenerationResult result = okfGeneratorService.generateOkfForNote(note, subject);
                if (result != null && result.isSuccess()) {
                    note.setOkfStatus("PROCESSED");
                    note.setOkfFilePath(result.getFilePath() != null ? result.getFilePath().toString() : null);
                    note.setOkfCompiledAt(Instant.now().toString());
                    noteRepository.save(note);
                    processed++;
                    if (note.getSubjectId() != null) {
                        affectedSubjects.add(note.getSubjectId());
                    }
                } else {
                    note.setOkfStatus("FAILED");
                    noteRepository.save(note);
                    failed++;
                    log.warn("OKF generation failed for note [{}]: {}", note.getId(), result != null ? result.getErrorMessage() : "null");
                }
            } catch (Exception ex) {
                note.setOkfStatus("FAILED");
                try {
                    noteRepository.save(note);
                } catch (Exception ignored) {}
                failed++;
                log.error("Exception generating OKF for note [{}]: {}", note.getId(), ex.getMessage(), ex);
            }
        }

        for (String subId : affectedSubjects) {
            try {
                okfGeneratorService.compileSubjectBundle(subId);
            } catch (Exception ex) {
                log.error("Failed to compile subject bundle for [{}]: {}", subId, ex.getMessage(), ex);
            }
        }

        lastProcessedCount.set(processed);
        lastFailedCount.set(failed);
        log.info("Finished OKF batch [{}]. Processed: {}, Failed: {}", jobId, processed, failed);
        return processed;
    }

    public BatchStatus getBatchStatus() {
        long processed = noteRepository.countByOkfStatus("PROCESSED");
        long failed = noteRepository.countByOkfStatus("FAILED");
        long total = noteRepository.count();
        long pending = Math.max(0, total - processed - failed);

        return BatchStatus.builder()
                .isRunning(isRunning.get())
                .currentJobId(isRunning.get() ? currentJobId : null)
                .lastRun(lastRunStartedAt != null ? lastRunStartedAt.toString() : null)
                .lastCompleted(lastRunCompletedAt != null ? lastRunCompletedAt.toString() : null)
                .pendingNotes((int) pending)
                .completedNotes((int) processed)
                .failedNotes((int) failed)
                .totalNotes((int) total)
                .build();
    }

    public boolean isRunning() {
        return isRunning.get();
    }
}
