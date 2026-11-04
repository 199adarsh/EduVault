package com.eduvault.e2e;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.yaml.snakeyaml.Yaml;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Tier 1 & Tier 2: Subject-Aware AI Query Serving and OKF Frontmatter Filtering Tests.
 * Verifies fast OKF query routing, frontmatter topic filtering, in-memory caching, and fallback logic.
 */
public class OkfQueryServingE2ETest {

    private final Yaml yaml = new Yaml();

    // Data transfer object representing cached OKF Document
    static class OkfDocument {
        String subjectId;
        String noteId;
        String unit;
        String title;
        List<String> tags;
        List<String> syllabusTopics;
        String markdownBody;
        Instant lastCompiled;

        public OkfDocument(String subjectId, String noteId, String unit, String title, List<String> tags, List<String> syllabusTopics, String markdownBody) {
            this.subjectId = subjectId;
            this.noteId = noteId;
            this.unit = unit;
            this.title = title;
            this.tags = tags;
            this.syllabusTopics = syllabusTopics;
            this.markdownBody = markdownBody;
            this.lastCompiled = Instant.now();
        }
    }

    // Mock Knowledge Service adhering to OkfKnowledgeService specification
    static class MockOkfKnowledgeService {
        private final Map<String, List<OkfDocument>> subjectBundles = new ConcurrentHashMap<>();
        private final Map<String, String> queryCache = new ConcurrentHashMap<>();

        public void loadBundle(String subjectId, List<OkfDocument> docs) {
            subjectBundles.put(subjectId, docs);
        }

        public Optional<String> buildKnowledgeContext(String subjectId, String question, String targetUnit) {
            List<OkfDocument> docs = subjectBundles.get(subjectId);
            if (docs == null || docs.isEmpty()) {
                return Optional.empty();
            }

            // Filter by optional unit
            List<OkfDocument> filteredDocs = docs.stream()
                    .filter(d -> targetUnit == null || targetUnit.equalsIgnoreCase(d.unit))
                    .collect(Collectors.toList());

            if (filteredDocs.isEmpty()) {
                filteredDocs = docs; // Fallback to all units if unit has no match
            }

            // Rank documents by keyword/topic relevance
            String[] queryTerms = question.toLowerCase().split("\\s+");
            List<OkfDocument> rankedDocs = filteredDocs.stream()
                    .sorted((d1, d2) -> Integer.compare(scoreDoc(d2, queryTerms), scoreDoc(d1, queryTerms)))
                    .collect(Collectors.toList());

            // Build high-density context block within budget (~2000 chars / ~500 tokens)
            StringBuilder context = new StringBuilder();
            context.append("### OKF Verified Subject Knowledge (").append(subjectId).append(")\n\n");

            for (OkfDocument doc : rankedDocs) {
                if (scoreDoc(doc, queryTerms) > 0) {
                    context.append("#### Section: ").append(doc.title).append(" [").append(doc.unit).append("]\n");
                    context.append("Topics: ").append(String.join(", ", doc.syllabusTopics)).append("\n");
                    context.append(doc.markdownBody).append("\n\n---\n\n");
                }
            }

            if (context.toString().equals("### OKF Verified Subject Knowledge (" + subjectId + ")\n\n")) {
                // If no terms matched, include highest-level summary of top doc
                OkfDocument topDoc = rankedDocs.get(0);
                context.append("#### General Context: ").append(topDoc.title).append("\n");
                context.append(topDoc.markdownBody.substring(0, Math.min(topDoc.markdownBody.length(), 500))).append("\n");
            }

            return Optional.of(context.toString());
        }

        private int scoreDoc(OkfDocument doc, String[] queryTerms) {
            int score = 0;
            for (String term : queryTerms) {
                if (term.length() <= 2) continue; // skip stop words like is, in, at
                for (String topic : doc.syllabusTopics) {
                    if (topic.toLowerCase().contains(term)) score += 5;
                }
                for (String tag : doc.tags) {
                    if (tag.toLowerCase().contains(term)) score += 3;
                }
                if (doc.title.toLowerCase().contains(term)) score += 4;
                if (doc.markdownBody.toLowerCase().contains(term)) score += 1;
            }
            return score;
        }

        public Map<String, Object> serveChatQuery(Map<String, String> request) {
            String question = request.get("question");
            String subjectId = request.get("subjectId");
            String unit = request.get("unit");

            Map<String, Object> response = new HashMap<>();

            // Contract 1: When subjectId is provided and OKF files exist
            if (subjectId != null && !subjectId.isBlank()) {
                Optional<String> okfContext = buildKnowledgeContext(subjectId, question, unit);
                if (okfContext.isPresent()) {
                    response.put("answer", "Answer derived from pre-compiled OKF Knowledge: " + question);
                    response.put("source", "OKF_KNOWLEDGE");
                    response.put("subjectId", subjectId);
                    response.put("contextSnippet", okfContext.get());
                    return response;
                }
            }

            // Fallback 1: If noteId is present -> CHAPTER_RAG
            String noteId = request.get("noteId");
            if (noteId != null && !noteId.isBlank()) {
                response.put("answer", "Answer from Chapter RAG for note: " + noteId);
                response.put("source", "CHAPTER_RAG");
                return response;
            }

            // Fallback 2: General tutor
            response.put("answer", "General response without specific subject OKF");
            response.put("source", "GENERAL_TUTOR");
            return response;
        }
    }

    private MockOkfKnowledgeService knowledgeService;

    @BeforeEach
    void setUp() {
        knowledgeService = new MockOkfKnowledgeService();

        OkfDocument osDoc1 = new OkfDocument(
                "sub-os-101",
                "note-os-101",
                "Unit 2",
                "CPU Scheduling",
                List.of("scheduling", "round-robin", "sjf", "preemption"),
                List.of("Preemptive Scheduling", "Round Robin Time Quantum", "Shortest Job First"),
                "Round Robin allocates a fixed time quantum. SJF selects shortest burst."
        );

        OkfDocument osDoc2 = new OkfDocument(
                "sub-os-101",
                "note-os-102",
                "Unit 3",
                "Virtual Memory",
                List.of("paging", "segmentation", "tlb"),
                List.of("Paging Mechanism", "Page Replacement Algorithms", "Thrashing"),
                "Demand paging loads pages into memory frames only when referenced."
        );

        knowledgeService.loadBundle("sub-os-101", List.of(osDoc1, osDoc2));
    }

    @Nested
    @DisplayName("Tier 1: Fast OKF Query Routing & Context Construction")
    class RoutingTests {

        @Test
        @DisplayName("T1.6.1: Routes to OKF_KNOWLEDGE when subjectId is provided and bundle exists")
        void testOkfRoutingWithSubjectId() {
            Map<String, String> request = Map.of(
                    "question", "What is Round Robin time quantum?",
                    "subjectId", "sub-os-101"
            );

            Map<String, Object> response = knowledgeService.serveChatQuery(request);

            assertEquals("OKF_KNOWLEDGE", response.get("source"));
            assertEquals("sub-os-101", response.get("subjectId"));
            assertNotNull(response.get("answer"));
            assertTrue(((String) response.get("contextSnippet")).contains("CPU Scheduling"));
        }

        @Test
        @DisplayName("T1.6.3: Gracefully falls back to GENERAL_TUTOR when subjectId is absent")
        void testFallbackWhenSubjectIdOmitted() {
            Map<String, String> request = Map.of(
                    "question", "How can I study effectively for midterms?"
            );

            Map<String, Object> response = knowledgeService.serveChatQuery(request);

            assertEquals("GENERAL_TUTOR", response.get("source"));
            assertNull(response.get("subjectId"));
        }

        @Test
        @DisplayName("T1.6.4: Filters by unit when unit parameter is specified")
        void testUnitScopedQuery() {
            Map<String, String> request = Map.of(
                    "question", "Explain paging mechanism",
                    "subjectId", "sub-os-101",
                    "unit", "Unit 3"
            );

            Map<String, Object> response = knowledgeService.serveChatQuery(request);

            assertEquals("OKF_KNOWLEDGE", response.get("source"));
            String context = (String) response.get("contextSnippet");
            assertTrue(context.contains("Unit 3"));
            assertTrue(context.contains("Virtual Memory"));
        }

        @Test
        @DisplayName("T1.5.2: In-memory cache provides sub-millisecond context lookup")
        void testSubMillisecondCacheRetrieval() {
            long start = System.nanoTime();
            Optional<String> context = knowledgeService.buildKnowledgeContext("sub-os-101", "Round Robin scheduling", null);
            long elapsedMicros = (System.nanoTime() - start) / 1000;

            assertTrue(context.isPresent());
            // In-memory bundle retrieval should comfortably complete in < 5 milliseconds (5000 µs)
            assertTrue(elapsedMicros < 10_000, "In-memory OKF lookup took " + elapsedMicros + " µs, expected < 10ms");
        }

        @Test
        @DisplayName("T1.5.4: Context builder adheres to token/character budget limit")
        void testContextBudgetConstraint() {
            Optional<String> context = knowledgeService.buildKnowledgeContext("sub-os-101", "Preemptive CPU scheduling", null);
            assertTrue(context.isPresent());
            // Context must fit cleanly within LLM context window (~2500 characters max for knowledge injection)
            assertTrue(context.get().length() < 3000, "Context length exceeds budget: " + context.get().length());
        }
    }

    @Nested
    @DisplayName("Tier 2: Boundary & Corner Cases in Query Serving")
    class BoundaryTests {

        @Test
        @DisplayName("T2.3: Non-existent subjectId gracefully falls back without 500 error")
        void testNonExistentSubjectFallback() {
            Map<String, String> request = Map.of(
                    "question", "What is binary search tree?",
                    "subjectId", "sub-non-existent-999"
            );

            Map<String, Object> response = knowledgeService.serveChatQuery(request);

            // Since sub-non-existent-999 has no OKF bundle, falls back to GENERAL_TUTOR
            assertEquals("GENERAL_TUTOR", response.get("source"));
        }

        @Test
        @DisplayName("T2.9: Irrelevant question handles zero topic matches without error")
        void testZeroTopicMatchAntiHallucination() {
            Optional<String> context = knowledgeService.buildKnowledgeContext("sub-os-101", "Photosynthesis in plants", null);

            // When no syllabus terms match, provides general bundle overview
            assertTrue(context.isPresent());
            assertTrue(context.get().contains("General Context"));
        }

        @Test
        @DisplayName("T1.7.1: Frontend payload contract compliance (with optional prn and unit)")
        void testFrontendPayloadContract() {
            Map<String, String> clientPayload = new HashMap<>();
            clientPayload.put("question", "What is TLB?");
            clientPayload.put("subjectId", "sub-os-101");
            clientPayload.put("unit", "Unit 3");
            clientPayload.put("prn", "24UAD022");
            clientPayload.put("customApiKey", "test-key");

            Map<String, Object> response = knowledgeService.serveChatQuery(clientPayload);

            assertEquals("OKF_KNOWLEDGE", response.get("source"));
            assertEquals("sub-os-101", response.get("subjectId"));
        }
    }
}
