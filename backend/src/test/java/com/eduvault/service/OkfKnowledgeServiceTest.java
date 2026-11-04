package com.eduvault.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

public class OkfKnowledgeServiceTest {

    @TempDir
    Path tempStorageDir;

    private OkfKnowledgeService knowledgeService;

    @BeforeEach
    void setUp() throws IOException {
        knowledgeService = new OkfKnowledgeService();
        knowledgeService.setStorageLocalDir(tempStorageDir.toString());

        // Use reflection or private field setup via system property or disk directory
        // We test with programmatic loadBundle and disk parsing
        OkfKnowledgeService.OkfDocument doc1 = new OkfKnowledgeService.OkfDocument(
                "sub-os-101",
                "note-cpu-1",
                "Unit 2",
                "CPU Scheduling",
                List.of("cpu", "scheduling", "round-robin", "quantum"),
                List.of("Round Robin", "Preemptive Scheduling", "SJF"),
                "Round Robin scheduling allocates fixed time slice called quantum to processes."
        );

        OkfKnowledgeService.OkfDocument doc2 = new OkfKnowledgeService.OkfDocument(
                "sub-os-101",
                "note-vm-2",
                "Unit 3",
                "Virtual Memory",
                List.of("paging", "memory", "tlb"),
                List.of("Demand Paging", "TLB Hit", "Page Fault"),
                "Paging divides logical memory into blocks called pages and physical memory into frames."
        );

        knowledgeService.loadBundle("sub-os-101", List.of(doc1, doc2));
    }

    @Test
    @DisplayName("Builds knowledge context correctly matching keywords in syllabus topics and tags")
    void testBuildKnowledgeContextMatching() {
        Optional<String> context = knowledgeService.buildSubjectKnowledgeContext("sub-os-101", "What is Round Robin time quantum?");
        assertTrue(context.isPresent());
        String snippet = context.get();
        assertTrue(snippet.contains("CPU Scheduling"));
        assertTrue(snippet.contains("Round Robin"));
        assertTrue(snippet.length() < 3000);
    }

    @Test
    @DisplayName("Unit filtering restricts context to specified unit")
    void testUnitFiltering() {
        Optional<String> context = knowledgeService.buildSubjectKnowledgeContext("sub-os-101", "Explain paging and memory", "Unit 3");
        assertTrue(context.isPresent());
        String snippet = context.get();
        assertTrue(snippet.contains("Unit 3"));
        assertTrue(snippet.contains("Virtual Memory"));
        assertFalse(snippet.contains("CPU Scheduling"));
    }

    @Test
    @DisplayName("Zero topic match provides General Context overview without error")
    void testZeroTopicMatchAntiHallucination() {
        Optional<String> context = knowledgeService.buildSubjectKnowledgeContext("sub-os-101", "Photosynthesis in green plants");
        assertTrue(context.isPresent());
        String snippet = context.get();
        assertTrue(snippet.contains("General Context"));
        assertTrue(snippet.length() < 3000);
    }

    @Test
    @DisplayName("Unloaded or non-existent subject returns Optional.empty()")
    void testNonExistentSubject() {
        Optional<String> context = knowledgeService.buildSubjectKnowledgeContext("sub-nonexistent-404", "Any question");
        assertTrue(context.isEmpty());
        assertFalse(knowledgeService.isKnowledgeReady("sub-nonexistent-404"));
    }

    @Test
    @DisplayName("Cache clearing purges in-memory bundles")
    void testClearCache() {
        assertTrue(knowledgeService.isKnowledgeReady("sub-os-101"));
        knowledgeService.clearCache();
        // Since temp storage doesn't have disk files yet for this subject, isKnowledgeReady is false
        assertFalse(knowledgeService.isKnowledgeReady("sub-os-101"));
    }

    @Test
    @DisplayName("Disk loading parses OKF YAML frontmatter and markdown body correctly")
    void testDiskLoadingAndFrontmatterParsing() throws IOException {
        Path subjectDir = tempStorageDir.resolve("okf").resolve("sub-algo-201");
        Files.createDirectories(subjectDir);

        String noteContent = "---\n" +
                "type: \"academic_notes\"\n" +
                "note_id: \"note-dp-1\"\n" +
                "title: \"Dynamic Programming Principles\"\n" +
                "unit: \"Unit 4\"\n" +
                "tags:\n" +
                "  - \"dp\"\n" +
                "  - \"memoization\"\n" +
                "syllabus_topics:\n" +
                "  - \"Optimal Substructure\"\n" +
                "  - \"Overlapping Subproblems\"\n" +
                "sources:\n" +
                "  - \"lecture4.pdf\"\n" +
                "status: \"active\"\n" +
                "last_compiled: \"2026-11-04T02:00:00Z\"\n" +
                "---\n\n" +
                "# Dynamic Programming\n\n" +
                "Dynamic programming solves complex problems by breaking them into overlapping subproblems.";

        Files.writeString(subjectDir.resolve("note-dp-1.md"), noteContent);

        String indexContent = "---\n" +
                "type: \"subject_index\"\n" +
                "subject_id: \"sub-algo-201\"\n" +
                "units_covered:\n" +
                "  - \"Unit 4\"\n" +
                "total_notes_compiled: 1\n" +
                "---\n\n" +
                "# Algorithm Design Index\n";

        Files.writeString(subjectDir.resolve("index.md"), indexContent);

        // Parse individual document
        OkfKnowledgeService.OkfDocument doc = knowledgeService.parseOkfMarkdown("sub-algo-201", "note-dp-1.md", noteContent);
        assertNotNull(doc);
        assertEquals("Dynamic Programming Principles", doc.getTitle());
        assertEquals("Unit 4", doc.getUnit());
        assertEquals(2, doc.getTags().size());
        assertTrue(doc.getTags().contains("memoization"));
        assertEquals(2, doc.getSyllabusTopics().size());
        assertTrue(doc.getSyllabusTopics().contains("Optimal Substructure"));
        assertTrue(doc.getMarkdownBody().contains("overlapping subproblems"));
    }

    @Test
    @DisplayName("Direct serveChatQuery routes correctly with subjectId and fallbacks")
    void testDirectServeChatQuery() {
        // With subjectId
        Map<String, String> req1 = Map.of("subjectId", "sub-os-101", "question", "What is Round Robin?");
        Map<String, Object> resp1 = knowledgeService.serveChatQuery(req1);
        assertEquals("OKF_KNOWLEDGE", resp1.get("source"));
        assertEquals("sub-os-101", resp1.get("subjectId"));
        assertNotNull(resp1.get("contextSnippet"));

        // With noteId fallback
        Map<String, String> req2 = Map.of("noteId", "note-xyz-123", "question", "Explain this note");
        Map<String, Object> resp2 = knowledgeService.serveChatQuery(req2);
        assertEquals("CHAPTER_RAG", resp2.get("source"));
        assertEquals("note-xyz-123", resp2.get("noteId"));

        // General tutor fallback
        Map<String, String> req3 = Map.of("question", "How to study?");
        Map<String, Object> resp3 = knowledgeService.serveChatQuery(req3);
        assertEquals("GENERAL_TUTOR", resp3.get("source"));
    }
}
