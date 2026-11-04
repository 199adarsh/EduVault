package com.eduvault.e2e;

import com.eduvault.model.Note;
import com.eduvault.model.Subject;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Tier 4: Real-World Application Scenarios.
 * Exercises realistic, complete end-to-end workflows representing faculty note uploads,
 * scheduled overnight batch processing, student deep-linking, and fast OKF query serving.
 */
public class OkfRealWorldScenarioTest {

    @TempDir
    Path storageDir;

    private OkfBatchGenerationE2ETest.MockOkfBatchService batchService;
    private OkfQueryServingE2ETest.MockOkfKnowledgeService knowledgeService;
    private OkfSpecificationContractTest.ActivityTrackerTests.SimpleActivityTracker activityTracker;

    @BeforeEach
    void setUp() {
        OkfBatchGenerationE2ETest.MockOkfBatchService.clearStatusMap();
        batchService = new OkfBatchGenerationE2ETest.MockOkfBatchService(storageDir);
        knowledgeService = new OkfQueryServingE2ETest.MockOkfKnowledgeService();
        activityTracker = new OkfSpecificationContractTest.ActivityTrackerTests.SimpleActivityTracker();
    }

    @Test
    @DisplayName("Scenario 1: Faculty uploads OS Notes -> Overnight Batch runs at 02:00 -> Student asks Round Robin question -> Fast OKF response")
    void testScenario1_FacultyUploadToStudentInquiry() {
        // Step 1: Faculty uploads Operating Systems Unit 2 lecture notes
        Note osNote = Note.builder()
                .id("note-os-cpu")
                .subjectId("sub-cs-os")
                .title("CPU Scheduling Policies")
                .unit("Unit 2")
                .department("Computer Science")
                .semester("SEM 04")
                .extractedText(
                    "# CPU Scheduling\n\n" +
                    "Round Robin is a preemptive scheduling algorithm designed for time-sharing systems. " +
                    "Each process receives a fixed time slice (Time Quantum). If the burst exceeds the quantum, " +
                    "the process is context switched to the ready queue tail."
                )
                .tags(List.of("cpu-scheduling", "round-robin", "context-switch"))
                .build();

        // Step 2: System reaches overnight 02:00 idle state (>30m no active requests)
        activityTracker.setLastRequestTime(System.currentTimeMillis() - (45 * 60 * 1000L));
        assertTrue(activityTracker.isIdle(30 * 60 * 1000L));

        // Overnight batch processor runs
        Map<String, Object> batchResult = batchService.triggerBatch(List.of(osNote), "sub-cs-os");
        assertEquals("STARTED", batchResult.get("status"));
        assertEquals("PROCESSED", OkfBatchGenerationE2ETest.MockOkfBatchService.getOkfStatus(osNote));

        // OKF markdown generated on disk
        Path generatedFile = storageDir.resolve("okf").resolve("sub-cs-os").resolve("note-os-cpu.md");
        assertTrue(Files.exists(generatedFile));

        // Step 3: Bundle ingested into in-memory knowledge service
        OkfQueryServingE2ETest.OkfDocument doc = new OkfQueryServingE2ETest.OkfDocument(
                osNote.getSubjectId(), osNote.getId(), osNote.getUnit(), osNote.getTitle(),
                osNote.getTags(), List.of("Round Robin", "Time Quantum", "Preemption"),
                osNote.getExtractedText()
        );
        knowledgeService.loadBundle("sub-cs-os", List.of(doc));

        // Step 4: Next morning, student selects Operating Systems in AI Assistant and asks:
        Map<String, String> studentRequest = Map.of(
                "subjectId", "sub-cs-os",
                "question", "What happens when a process exceeds its Time Quantum in Round Robin?"
        );
        Map<String, Object> aiResponse = knowledgeService.serveChatQuery(studentRequest);

        // Step 5: Verified fast response served from OKF knowledge
        assertEquals("OKF_KNOWLEDGE", aiResponse.get("source"));
        assertEquals("sub-cs-os", aiResponse.get("subjectId"));
        String context = (String) aiResponse.get("contextSnippet");
        assertTrue(context.contains("Round Robin"));
        assertTrue(context.contains("Time Quantum"));
    }

    @Test
    @DisplayName("Scenario 2: Admin triggers batch compilation -> Student deep-links from Notes Library -> Preselected subject instant answer")
    void testScenario2_DeepLinkFromNotesLibrary() {
        // Faculty notes compiled for Data Structures
        Note bstNote = Note.builder()
                .id("note-bst")
                .subjectId("sub-cs-201")
                .title("AVL Trees and BST Balancing")
                .unit("Unit 3")
                .extractedText("AVL tree is a self-balancing binary search tree where the difference between heights of left and right subtrees cannot exceed one.")
                .tags(List.of("avl", "trees", "balance"))
                .build();

        // Admin triggers compilation via POST /api/batch/okf/trigger
        Map<String, Object> triggerResponse = batchService.triggerBatch(List.of(bstNote), "sub-cs-201");
        assertEquals("STARTED", triggerResponse.get("status"));

        knowledgeService.loadBundle("sub-cs-201", List.of(new OkfQueryServingE2ETest.OkfDocument(
                "sub-cs-201", "note-bst", "Unit 3", "AVL Trees",
                List.of("avl", "trees"), List.of("AVL Balance Factor", "Rotations"),
                bstNote.getExtractedText()
        )));

        // Student in Notes Library clicks "Ask AI about Data Structures"
        // Deep-link URL: /ai-assistant?subjectId=sub-cs-201
        String deepLinkParam = "sub-cs-201";
        Map<String, String> clientPayload = Map.of(
                "subjectId", deepLinkParam,
                "question", "What is an AVL tree balance factor?"
        );

        Map<String, Object> aiResponse = knowledgeService.serveChatQuery(clientPayload);
        assertEquals("OKF_KNOWLEDGE", aiResponse.get("source"));
        assertEquals("sub-cs-201", aiResponse.get("subjectId"));
        assertTrue(((String) aiResponse.get("contextSnippet")).contains("AVL Trees"));
    }

    @Test
    @DisplayName("Scenario 3: Newly uploaded subject notes pending compilation -> Student queries immediately -> Graceful fallback")
    void testScenario3_ImmediateQueryBeforeBatchRun() {
        // Note is uploaded but overnight batch has NOT run yet (okfStatus=PENDING)
        Note freshlyUploadedNote = Note.builder()
                .id("note-fresh-1")
                .subjectId("sub-new-subject")
                .title("Intro to Cloud Computing")
                .unit("Unit 1")
                .extractedText("Cloud service models: IaaS, PaaS, and SaaS.")
                .build();

        // No OKF bundle exists for sub-new-subject
        Map<String, String> studentRequest = Map.of(
                "subjectId", "sub-new-subject",
                "question", "What are the three cloud service models?"
        );

        Map<String, Object> response = knowledgeService.serveChatQuery(studentRequest);

        // System does not throw 500 error; falls back gracefully to general tutor
        assertNotNull(response);
        assertEquals("GENERAL_TUTOR", response.get("source"));
    }

    @Test
    @DisplayName("Scenario 4: High revision traffic -> Active student requests keep idle gate closed -> Batch defers to protect latency")
    void testScenario4_HighTrafficIdleGateDefense() {
        // High traffic during exam revision period
        activityTracker.onRequestStart();
        activityTracker.onRequestStart();
        activityTracker.onRequestStart();

        assertEquals(3, activityTracker.getActiveCount());

        // Batch scheduled runner checks idle gate
        boolean isIdle = activityTracker.isIdle(30 * 60 * 1000L);
        assertFalse(isIdle, "Batch job deferred while 3 active student requests are in-flight");

        // Requests complete over time
        activityTracker.onRequestEnd();
        activityTracker.onRequestEnd();
        activityTracker.onRequestEnd();

        assertEquals(0, activityTracker.getActiveCount());
        // Threshold not elapsed yet (0 ms elapsed since last request completion)
        assertFalse(activityTracker.isIdle(30 * 60 * 1000L), "Must wait for 30 minutes of continuous idle before batch starts");
    }

    @Test
    @DisplayName("Scenario 5: Note update & re-compilation -> Updated frontmatter syllabus topics instantly reflected in query results")
    void testScenario5_NoteUpdateAndRecompilation() {
        // Original note
        OkfQueryServingE2ETest.OkfDocument v1 = new OkfQueryServingE2ETest.OkfDocument(
                "sub-os", "note-os-1", "Unit 1", "OS Architecture",
                List.of("kernel"), List.of("Monolithic Kernel"), "Monolithic vs Microkernel architecture."
        );
        knowledgeService.loadBundle("sub-os", List.of(v1));

        Map<String, Object> resp1 = knowledgeService.serveChatQuery(Map.of("subjectId", "sub-os", "question", "Explain Monolithic Kernel"));
        assertTrue(((String) resp1.get("contextSnippet")).contains("Monolithic Kernel"));

        // Faculty updates notes with Hybrid Kernel details
        OkfQueryServingE2ETest.OkfDocument v2 = new OkfQueryServingE2ETest.OkfDocument(
                "sub-os", "note-os-1", "Unit 1", "OS Architecture (Revised)",
                List.of("kernel", "hybrid"), List.of("Monolithic Kernel", "Hybrid Kernel Architecture"),
                "Hybrid Kernel combines monolithic speed with microkernel modularity."
        );
        // Cache refreshed
        knowledgeService.loadBundle("sub-os", List.of(v2));

        Map<String, Object> resp2 = knowledgeService.serveChatQuery(Map.of("subjectId", "sub-os", "question", "Explain Hybrid Kernel"));
        assertTrue(((String) resp2.get("contextSnippet")).contains("Hybrid Kernel"));
    }

    @Test
    @DisplayName("Scenario 6: Off-topic query with subject selected -> Anti-hallucination defense maintains academic grounding")
    void testScenario6_OffTopicQueryAntiHallucination() {
        OkfQueryServingE2ETest.OkfDocument osDoc = new OkfQueryServingE2ETest.OkfDocument(
                "sub-os", "note-1", "Unit 1", "OS Kernel",
                List.of("kernel"), List.of("Kernel Basics"), "OS kernel manages hardware resources."
        );
        knowledgeService.loadBundle("sub-os", List.of(osDoc));

        // Off-topic question
        Map<String, String> request = Map.of(
                "subjectId", "sub-os",
                "question", "Who won the 2022 World Cup?"
        );
        Map<String, Object> response = knowledgeService.serveChatQuery(request);

        assertNotNull(response);
        assertEquals("OKF_KNOWLEDGE", response.get("source"));
        // Provides syllabus context overview rather than hallucinating football facts
        assertTrue(((String) response.get("contextSnippet")).contains("General Context"));
    }
}
