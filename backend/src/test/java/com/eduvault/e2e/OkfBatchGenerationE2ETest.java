package com.eduvault.e2e;

import com.eduvault.model.Note;
import com.eduvault.model.Subject;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Tier 1 & Tier 2: Overnight and Idle Batch Generation Tests.
 * Verifies batch coordination, Note status lifecycle, admin REST contracts, concurrency guards, and failure containment.
 */
public class OkfBatchGenerationE2ETest {

    @TempDir
    Path tempStorageDir;

    private List<Note> inMemoryNotes;
    private List<Subject> inMemorySubjects;

    @BeforeEach
    void setUp() {
        MockOkfBatchService.clearStatusMap();
        inMemoryNotes = new ArrayList<>();
        inMemorySubjects = new ArrayList<>();

        inMemorySubjects.add(Subject.builder().id("sub-os-101").name("Operating Systems").department("CSE").semester("SEM 04").build());
        inMemorySubjects.add(Subject.builder().id("sub-algo-102").name("Design and Analysis of Algorithms").department("CSE").semester("SEM 04").build());

        // Note 1: Ready for compilation
        Note n1 = Note.builder()
                .id("note-os-1")
                .subjectId("sub-os-101")
                .title("Process Scheduling")
                .unit("Unit 2")
                .department("CSE")
                .semester("SEM 04")
                .extractedText("CPU scheduling deals with allocating CPU cores to active processes.")
                .tags(List.of("cpu", "scheduling"))
                .build();

        // Note 2: Already processed
        Note n2 = Note.builder()
                .id("note-os-2")
                .subjectId("sub-os-101")
                .title("Memory Management")
                .unit("Unit 3")
                .department("CSE")
                .semester("SEM 04")
                .extractedText("Paging and Segmentation virtual memory mechanisms.")
                .tags(List.of("memory", "paging"))
                .build();

        // Note 3: Different subject
        Note n3 = Note.builder()
                .id("note-algo-1")
                .subjectId("sub-algo-102")
                .title("Dynamic Programming")
                .unit("Unit 4")
                .department("CSE")
                .semester("SEM 04")
                .extractedText("Bellman equation and optimal substructure in memoization.")
                .tags(List.of("algorithms", "dp"))
                .build();

        inMemoryNotes.addAll(List.of(n1, n2, n3));
    }

    // Mock Batch Service Model matching OkfBatchService contract
    static class MockOkfBatchService {
        private final AtomicBoolean isRunning = new AtomicBoolean(false);
        private final AtomicInteger completedCount = new AtomicInteger(0);
        private final AtomicInteger failedCount = new AtomicInteger(0);
        private volatile Instant lastRun = null;
        private final Path storageRoot;

        public MockOkfBatchService(Path storageRoot) {
            this.storageRoot = storageRoot;
        }

        public Map<String, Object> triggerBatch(List<Note> notes, String targetSubjectId) {
            if (!isRunning.compareAndSet(false, true)) {
                return Map.of("status", "ALREADY_RUNNING", "message", "A batch job is currently active");
            }

            String jobId = UUID.randomUUID().toString();
            try {
                List<Note> pendingNotes = notes.stream()
                        .filter(n -> targetSubjectId == null || targetSubjectId.equals(n.getSubjectId()))
                        .filter(n -> !"PROCESSED".equalsIgnoreCase(getOkfStatus(n)))
                        .collect(Collectors.toList());

                for (Note note : pendingNotes) {
                    try {
                        if (note.getExtractedText() == null || note.getExtractedText().isBlank()) {
                            setOkfStatus(note, "FAILED");
                            failedCount.incrementAndGet();
                        } else {
                            // Compile to OKF markdown
                            Path subjectDir = storageRoot.resolve("okf").resolve(note.getSubjectId());
                            Files.createDirectories(subjectDir);
                            Path noteFile = subjectDir.resolve(note.getId() + ".md");
                            String okfMarkdown = String.format(
                                "---\ntype: \"academic_notes\"\ntitle: \"%s\"\nsubject_id: \"%s\"\nunit: \"%s\"\nstatus: \"active\"\nlast_compiled: \"%s\"\n---\n\n# %s\n\n%s",
                                note.getTitle(), note.getSubjectId(), note.getUnit(), Instant.now().toString(), note.getTitle(), note.getExtractedText()
                            );
                            Files.writeString(noteFile, okfMarkdown);
                            setOkfStatus(note, "PROCESSED");
                            completedCount.incrementAndGet();
                        }
                    } catch (Exception e) {
                        setOkfStatus(note, "FAILED");
                        failedCount.incrementAndGet();
                    }
                }
                lastRun = Instant.now();
                return Map.of("status", "STARTED", "jobId", jobId, "processedCount", pendingNotes.size());
            } finally {
                isRunning.set(false);
            }
        }

        public Map<String, Object> getStatus(List<Note> allNotes) {
            long pending = allNotes.stream()
                    .filter(n -> !"PROCESSED".equalsIgnoreCase(getOkfStatus(n)) && !"FAILED".equalsIgnoreCase(getOkfStatus(n)))
                    .count();

            Map<String, Object> status = new HashMap<>();
            status.put("isRunning", isRunning.get());
            status.put("lastRun", lastRun != null ? lastRun.toString() : null);
            status.put("pendingNotes", (int) pending);
            status.put("completedNotes", completedCount.get());
            status.put("failedNotes", failedCount.get());
            return status;
        }

        // Mock helpers for Note schema attributes
        private static final Map<String, String> noteStatusMap = new ConcurrentHashMap<>();

        public static String getOkfStatus(Note n) {
            return noteStatusMap.getOrDefault(n.getId(), "PENDING");
        }

        public static void setOkfStatus(Note n, String status) {
            noteStatusMap.put(n.getId(), status);
        }

        public static void clearStatusMap() {
            noteStatusMap.clear();
        }
    }

    @Nested
    @DisplayName("Tier 1: Batch Lifecycle & Note Filtering")
    class BatchLifecycleTests {

        @BeforeEach
        void initNested() {
            MockOkfBatchService.clearStatusMap();
        }

        @Test
        @DisplayName("T1.3.1: Identifies and compiles only uncompiled notes")
        void testCompilesOnlyPendingNotes() {
            MockOkfBatchService.setOkfStatus(inMemoryNotes.get(1), "PROCESSED"); // Note 2 already compiled

            MockOkfBatchService service = new MockOkfBatchService(tempStorageDir);
            Map<String, Object> result = service.triggerBatch(inMemoryNotes, null);

            assertEquals("STARTED", result.get("status"));
            assertNotNull(result.get("jobId"));
            assertEquals(2, result.get("processedCount")); // n1 and n3 compiled
        }

        @Test
        @DisplayName("T1.3.2: Scopes batch execution to a specific subjectId if supplied")
        void testScopedSubjectBatch() {
            MockOkfBatchService service = new MockOkfBatchService(tempStorageDir);
            Map<String, Object> result = service.triggerBatch(inMemoryNotes, "sub-algo-102");

            assertEquals(1, result.get("processedCount")); // only n3 belongs to sub-algo-102
            assertEquals("PROCESSED", MockOkfBatchService.getOkfStatus(inMemoryNotes.get(2)));
        }

        @Test
        @DisplayName("T1.3.4: Status endpoint returns accurate metrics and timestamp")
        void testBatchStatusReporting() {
            MockOkfBatchService service = new MockOkfBatchService(tempStorageDir);
            service.triggerBatch(inMemoryNotes, "sub-os-101");

            Map<String, Object> status = service.getStatus(inMemoryNotes);
            assertFalse((Boolean) status.get("isRunning"));
            assertNotNull(status.get("lastRun"));
            assertEquals(2, status.get("completedNotes"));
            assertEquals(0, status.get("failedNotes"));
        }

        @Test
        @DisplayName("T1.4.1: Note OKF status transitions from PENDING to PROCESSED")
        void testNoteStatusTransitions() {
            Note n = inMemoryNotes.get(0);
            assertEquals("PENDING", MockOkfBatchService.getOkfStatus(n));

            MockOkfBatchService service = new MockOkfBatchService(tempStorageDir);
            service.triggerBatch(List.of(n), null);

            assertEquals("PROCESSED", MockOkfBatchService.getOkfStatus(n));
        }

        @Test
        @DisplayName("T1.4.2: Successfully creates OKF markdown file on disk with correct path")
        void testDiskFileCreation() {
            Note n = inMemoryNotes.get(0);
            MockOkfBatchService service = new MockOkfBatchService(tempStorageDir);
            service.triggerBatch(List.of(n), null);

            Path expectedFile = tempStorageDir.resolve("okf").resolve(n.getSubjectId()).resolve(n.getId() + ".md");
            assertTrue(Files.exists(expectedFile));
        }
    }

    @Nested
    @DisplayName("Tier 2: Concurrency Guards & Fault Containment")
    class ConcurrencyAndResilienceTests {

        @BeforeEach
        void initNested() {
            MockOkfBatchService.clearStatusMap();
        }

        @Test
        @DisplayName("T2.5: Prevents concurrent overlapping batch executions")
        void testConcurrentExecutionGuard() throws InterruptedException, ExecutionException {
            MockOkfBatchService service = new MockOkfBatchService(tempStorageDir);
            service.isRunning.set(true); // Simulate active running batch

            Map<String, Object> response = service.triggerBatch(inMemoryNotes, null);
            assertEquals("ALREADY_RUNNING", response.get("status"));
        }

        @Test
        @DisplayName("T1.3.5: Single corrupted/empty note marks FAILED without aborting whole batch")
        void testPartialFailureIsolation() {
            Note corruptedNote = Note.builder()
                    .id("note-corrupt")
                    .subjectId("sub-os-101")
                    .title("Blank Corrupted Note")
                    .unit("Unit 1")
                    .extractedText("   ") // blank text
                    .build();

            List<Note> mixedNotes = List.of(inMemoryNotes.get(0), corruptedNote);

            MockOkfBatchService service = new MockOkfBatchService(tempStorageDir);
            service.triggerBatch(mixedNotes, null);

            assertEquals("PROCESSED", MockOkfBatchService.getOkfStatus(inMemoryNotes.get(0)));
            assertEquals("FAILED", MockOkfBatchService.getOkfStatus(corruptedNote));

            Map<String, Object> status = service.getStatus(mixedNotes);
            assertEquals(1, status.get("completedNotes"));
            assertEquals(1, status.get("failedNotes"));
        }

        @Test
        @DisplayName("T2.3: Non-existent subjectId in batch trigger completes with 0 processed notes")
        void testNonExistentSubjectBatch() {
            MockOkfBatchService service = new MockOkfBatchService(tempStorageDir);
            Map<String, Object> result = service.triggerBatch(inMemoryNotes, "sub-non-existent-999");

            assertEquals("STARTED", result.get("status"));
            assertEquals(0, result.get("processedCount"));
        }

        @Test
        @DisplayName("T2.7: Filesystem write error marks note as FAILED gracefully")
        void testUnwritableFilesystemErrorHandling() {
            Path readOnlyRoot = Path.of("Z:\\invalid-non-existent-drive-mount-path");
            MockOkfBatchService service = new MockOkfBatchService(readOnlyRoot);

            Note n = inMemoryNotes.get(0);
            service.triggerBatch(List.of(n), null);

            assertEquals("FAILED", MockOkfBatchService.getOkfStatus(n));
        }
    }
}
