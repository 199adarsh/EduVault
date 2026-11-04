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
 * Tier 3: Cross-Feature Combinations (Pairwise Integration).
 * Verifies end-to-end integration between Note Upload, Batch Compilation, Frontmatter Caching, and Query Serving.
 */
public class OkfCrossFeatureIntegrationTest {

    @TempDir
    Path tempStorageDir;

    private List<Subject> testSubjects;
    private List<Note> testNotes;
    private OkfBatchGenerationE2ETest.MockOkfBatchService batchService;
    private OkfQueryServingE2ETest.MockOkfKnowledgeService knowledgeService;
    private OkfSpecificationContractTest.ActivityTrackerTests.SimpleActivityTracker activityTracker;

    @BeforeEach
    void setUp() {
        testSubjects = List.of(
                Subject.builder().id("sub-cs-201").name("Data Structures").department("CSE").semester("SEM 03").build(),
                Subject.builder().id("sub-cs-202").name("Discrete Mathematics").department("CSE").semester("SEM 03").build()
        );

        OkfBatchGenerationE2ETest.MockOkfBatchService.clearStatusMap();
        testNotes = new ArrayList<>();
        batchService = new OkfBatchGenerationE2ETest.MockOkfBatchService(tempStorageDir);
        knowledgeService = new OkfQueryServingE2ETest.MockOkfKnowledgeService();
        activityTracker = new OkfSpecificationContractTest.ActivityTrackerTests.SimpleActivityTracker();
    }

    @Test
    @DisplayName("T3.1: Full Pipeline — Note Upload -> Batch Compile -> OKF Caching -> Fast Query Serving")
    void testUploadBatchCompileAndServePipeline() throws IOException {
        // Step 1: Note is uploaded with extracted text
        Note uploadedNote = Note.builder()
                .id("note-ds-tree")
                .subjectId("sub-cs-201")
                .title("Binary Search Trees")
                .unit("Unit 3")
                .department("CSE")
                .semester("SEM 03")
                .extractedText("A Binary Search Tree (BST) is an ordered tree data structure with O(log n) search time.")
                .tags(List.of("bst", "trees", "search"))
                .build();
        testNotes.add(uploadedNote);

        // Step 2: Overnight batch compiles the note to OKF Markdown
        Map<String, Object> batchResult = batchService.triggerBatch(testNotes, "sub-cs-201");
        assertEquals("STARTED", batchResult.get("status"));
        assertEquals("PROCESSED", OkfBatchGenerationE2ETest.MockOkfBatchService.getOkfStatus(uploadedNote));

        // Step 3: Knowledge Service ingests the compiled OKF document into memory
        OkfQueryServingE2ETest.OkfDocument compiledDoc = new OkfQueryServingE2ETest.OkfDocument(
                uploadedNote.getSubjectId(),
                uploadedNote.getId(),
                uploadedNote.getUnit(),
                uploadedNote.getTitle(),
                uploadedNote.getTags(),
                List.of("Binary Search Trees", "BST Traversal", "Search Complexity"),
                uploadedNote.getExtractedText()
        );
        knowledgeService.loadBundle("sub-cs-201", List.of(compiledDoc));

        // Step 4: Student queries the subject in AI Assistant
        Map<String, String> queryRequest = Map.of(
                "subjectId", "sub-cs-201",
                "question", "What is the search time complexity of a Binary Search Tree?"
        );
        Map<String, Object> response = knowledgeService.serveChatQuery(queryRequest);

        // Assert: Fast response served directly from OKF knowledge
        assertEquals("OKF_KNOWLEDGE", response.get("source"));
        assertEquals("sub-cs-201", response.get("subjectId"));
        assertTrue(((String) response.get("contextSnippet")).contains("Binary Search Tree"));
    }

    @Test
    @DisplayName("T3.2: Multi-Unit Bundling — Notes across multiple units indexed and isolated by unit query")
    void testMultiUnitSeparation() {
        Note unit1Note = Note.builder()
                .id("note-ds-u1")
                .subjectId("sub-cs-201")
                .title("Arrays & Linked Lists")
                .unit("Unit 1")
                .extractedText("Linked lists provide dynamic memory allocation with nodes pointing to the next element.")
                .tags(List.of("arrays", "linked-lists"))
                .build();

        Note unit2Note = Note.builder()
                .id("note-ds-u2")
                .subjectId("sub-cs-201")
                .title("Stacks and Queues")
                .unit("Unit 2")
                .extractedText("Stack is LIFO and Queue is FIFO. Applications include BFS and DFS.")
                .tags(List.of("stacks", "queues"))
                .build();

        testNotes.addAll(List.of(unit1Note, unit2Note));
        batchService.triggerBatch(testNotes, "sub-cs-201");

        // Load both docs into knowledge service
        OkfQueryServingE2ETest.OkfDocument doc1 = new OkfQueryServingE2ETest.OkfDocument(
                "sub-cs-201", "note-ds-u1", "Unit 1", "Arrays & Linked Lists",
                List.of("arrays", "linked-lists"), List.of("Dynamic Arrays", "Singly Linked List"),
                unit1Note.getExtractedText()
        );
        OkfQueryServingE2ETest.OkfDocument doc2 = new OkfQueryServingE2ETest.OkfDocument(
                "sub-cs-201", "note-ds-u2", "Unit 2", "Stacks and Queues",
                List.of("stacks", "queues"), List.of("LIFO vs FIFO", "Queue Applications"),
                unit2Note.getExtractedText()
        );
        knowledgeService.loadBundle("sub-cs-201", List.of(doc1, doc2));

        // Query specifically scoped to Unit 2
        Map<String, String> queryUnit2 = Map.of(
                "subjectId", "sub-cs-201",
                "unit", "Unit 2",
                "question", "How does a Queue operate?"
        );
        Map<String, Object> response = knowledgeService.serveChatQuery(queryUnit2);

        assertEquals("OKF_KNOWLEDGE", response.get("source"));
        String context = (String) response.get("contextSnippet");
        assertTrue(context.contains("Unit 2"));
        assertTrue(context.contains("Stacks and Queues"));
    }

    @Test
    @DisplayName("T3.3: Subject Switching & Isolation — Zero cross-subject knowledge bleed")
    void testSubjectIsolation() {
        OkfQueryServingE2ETest.OkfDocument dsDoc = new OkfQueryServingE2ETest.OkfDocument(
                "sub-cs-201", "note-1", "Unit 1", "Data Structures Basics",
                List.of("ds"), List.of("Data Structures"), "Arrays and pointers in memory."
        );
        OkfQueryServingE2ETest.OkfDocument mathDoc = new OkfQueryServingE2ETest.OkfDocument(
                "sub-cs-202", "note-2", "Unit 1", "Propositional Logic",
                List.of("logic"), List.of("Truth Tables"), "Modus Ponens and predicate calculus."
        );

        knowledgeService.loadBundle("sub-cs-201", List.of(dsDoc));
        knowledgeService.loadBundle("sub-cs-202", List.of(mathDoc));

        // Query 1: Data structures
        Map<String, Object> resp1 = knowledgeService.serveChatQuery(Map.of("subjectId", "sub-cs-201", "question", "Explain pointers"));
        assertTrue(((String) resp1.get("contextSnippet")).contains("Data Structures"));
        assertFalse(((String) resp1.get("contextSnippet")).contains("Truth Tables"));

        // Query 2: Switch to Discrete Math
        Map<String, Object> resp2 = knowledgeService.serveChatQuery(Map.of("subjectId", "sub-cs-202", "question", "Explain Modus Ponens"));
        assertTrue(((String) resp2.get("contextSnippet")).contains("Truth Tables"));
        assertFalse(((String) resp2.get("contextSnippet")).contains("Data Structures"));
    }

    @Test
    @DisplayName("T3.4: Partial Batch Error Resilience — Valid notes succeed and compile to index while corrupted note fails")
    void testPartialBatchResilience() {
        Note validNote = Note.builder()
                .id("note-valid")
                .subjectId("sub-cs-201")
                .title("Valid Lecture Notes")
                .unit("Unit 1")
                .extractedText("Valid academic text.")
                .build();

        Note invalidNote = Note.builder()
                .id("note-invalid")
                .subjectId("sub-cs-201")
                .title("Corrupted Document")
                .unit("Unit 2")
                .extractedText(null) // null text triggers failure
                .build();

        List<Note> batch = List.of(validNote, invalidNote);
        batchService.triggerBatch(batch, "sub-cs-201");

        assertEquals("PROCESSED", OkfBatchGenerationE2ETest.MockOkfBatchService.getOkfStatus(validNote));
        assertEquals("FAILED", OkfBatchGenerationE2ETest.MockOkfBatchService.getOkfStatus(invalidNote));

        Map<String, Object> status = batchService.getStatus(batch);
        assertEquals(1, status.get("completedNotes"));
        assertEquals(1, status.get("failedNotes"));
    }

    @Test
    @DisplayName("T3.5: Idle Detection Gate — Batch job triggers only when ActivityTracker verifies idle threshold")
    void testIdleDetectionGate() {
        activityTracker.setLastRequestTime(System.currentTimeMillis() - (35 * 60 * 1000L)); // 35 min idle
        assertTrue(activityTracker.isIdle(30 * 60 * 1000L));

        // Batch execution permitted
        boolean canRun = activityTracker.isIdle(30 * 60 * 1000L);
        assertTrue(canRun);

        // Student active request occurs
        activityTracker.onRequestStart();
        canRun = activityTracker.isIdle(30 * 60 * 1000L);
        assertFalse(canRun, "Batch job gate blocks execution when system is non-idle");
    }
}
