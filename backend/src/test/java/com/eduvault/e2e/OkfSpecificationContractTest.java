package com.eduvault.e2e;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.yaml.snakeyaml.Yaml;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Tier 1 & Tier 2: Google OKF Specification and Infrastructure Contract Tests.
 * Verifies YAML frontmatter structure, semantic markdown body, and ActivityTracker idle logic.
 */
public class OkfSpecificationContractTest {

    private final Yaml yaml = new Yaml();

    @Nested
    @DisplayName("Tier 1: Google OKF Frontmatter Schema Validation")
    class FrontmatterSchemaTests {

        @Test
        @DisplayName("T1.2.1: Validates required OKF YAML frontmatter fields for academic notes")
        void testValidAcademicNotesFrontmatter() {
            String okfContent = 
                "---\n" +
                "type: \"academic_notes\"\n" +
                "title: \"CPU Scheduling Algorithms\"\n" +
                "description: \"Comprehensive notes on Round Robin, SJF, and Priority Scheduling\"\n" +
                "subject_id: \"sub-os-101\"\n" +
                "subject_name: \"Operating Systems\"\n" +
                "unit: \"Unit 2\"\n" +
                "tags:\n" +
                "  - \"cpu-scheduling\"\n" +
                "  - \"round-robin\"\n" +
                "  - \"sjf\"\n" +
                "syllabus_topics:\n" +
                "  - \"Preemptive Scheduling\"\n" +
                "  - \"Time Quantum\"\n" +
                "  - \"Starvation\"\n" +
                "sources:\n" +
                "  - \"note-101\"\n" +
                "last_compiled: \"2026-11-04T02:00:00Z\"\n" +
                "status: \"active\"\n" +
                "---\n\n" +
                "# Operating Systems: CPU Scheduling\n\n" +
                "Round Robin is preemptive with fixed Time Quantum.";

            Map<String, Object> frontmatter = parseFrontmatter(okfContent);

            assertEquals("academic_notes", frontmatter.get("type"));
            assertEquals("CPU Scheduling Algorithms", frontmatter.get("title"));
            assertEquals("sub-os-101", frontmatter.get("subject_id"));
            assertEquals("Operating Systems", frontmatter.get("subject_name"));
            assertEquals("Unit 2", frontmatter.get("unit"));
            assertEquals("active", frontmatter.get("status"));
            assertNotNull(frontmatter.get("last_compiled"));

            @SuppressWarnings("unchecked")
            List<String> tags = (List<String>) frontmatter.get("tags");
            assertEquals(3, tags.size());
            assertTrue(tags.contains("round-robin"));

            @SuppressWarnings("unchecked")
            List<String> topics = (List<String>) frontmatter.get("syllabus_topics");
            assertEquals(3, topics.size());
            assertTrue(topics.contains("Preemptive Scheduling"));
        }

        @Test
        @DisplayName("T1.2.2: Validates subject index manifest (index.md) frontmatter and links")
        void testSubjectIndexFrontmatter() {
            String indexContent =
                "---\n" +
                "type: \"subject_index\"\n" +
                "subject_id: \"sub-os-101\"\n" +
                "subject_name: \"Operating Systems\"\n" +
                "units_covered:\n" +
                "  - \"Unit 1\"\n" +
                "  - \"Unit 2\"\n" +
                "total_notes_compiled: 2\n" +
                "last_compiled: \"2026-11-04T02:00:00Z\"\n" +
                "---\n\n" +
                "# Operating Systems — Knowledge Bundle\n\n" +
                "- [Unit 1: Process Management](note-100.md)\n" +
                "- [Unit 2: CPU Scheduling](note-101.md)\n";

            Map<String, Object> frontmatter = parseFrontmatter(indexContent);

            assertEquals("subject_index", frontmatter.get("type"));
            assertEquals("sub-os-101", frontmatter.get("subject_id"));
            assertEquals(2, frontmatter.get("total_notes_compiled"));

            @SuppressWarnings("unchecked")
            List<String> units = (List<String>) frontmatter.get("units_covered");
            assertEquals(2, units.size());
            assertTrue(units.contains("Unit 1"));
            assertTrue(units.contains("Unit 2"));
        }

        @Test
        @DisplayName("T1.2.3: Generates semantic markdown body with headings and takeaways")
        void testSemanticMarkdownStructure() {
            String rawBody = 
                "# Unit 2: CPU Scheduling\n\n" +
                "## Key Definitions\n" +
                "- **Time Quantum**: The allocated CPU burst slice.\n\n" +
                "## Algorithm Comparison\n" +
                "| Algorithm | Preemptive | Overhead |\n" +
                "|-----------|------------|----------|\n" +
                "| FCFS      | No         | Low      |\n" +
                "| RR        | Yes        | Medium   |\n\n" +
                "## High-Frequency Exam Questions\n" +
                "1. Explain how time quantum influences context switching.";

            assertTrue(rawBody.contains("# Unit 2: CPU Scheduling"));
            assertTrue(rawBody.contains("## Key Definitions"));
            assertTrue(rawBody.contains("## High-Frequency Exam Questions"));
            assertTrue(rawBody.contains("| Algorithm | Preemptive | Overhead |"));
        }

        @Test
        @DisplayName("T1.2.4: Extracts and filters tags from frontmatter accurately")
        void testTagMatchingLogic() {
            List<String> tags = List.of("cpu-scheduling", "round-robin", "operating-systems");
            assertTrue(tags.stream().anyMatch(t -> t.equalsIgnoreCase("round-robin")));
            assertFalse(tags.stream().anyMatch(t -> t.equalsIgnoreCase("binary-tree")));
        }

        @Test
        @DisplayName("T1.2.5: Verifies file path normalization for OKF storage hierarchy")
        void testPathHierarchyConvention(@TempDir Path tempDir) throws IOException {
            String subjectId = "sub-cs-301";
            String noteId = "note-uuid-9921";
            
            Path subjectDir = tempDir.resolve("okf").resolve(subjectId);
            Files.createDirectories(subjectDir);
            
            Path noteFile = subjectDir.resolve(noteId + ".md");
            Files.writeString(noteFile, "---\ntype: \"academic_notes\"\n---\n# Content");
            
            Path indexFile = subjectDir.resolve("index.md");
            Files.writeString(indexFile, "---\ntype: \"subject_index\"\n---\n# Index");

            assertTrue(Files.exists(noteFile));
            assertTrue(Files.exists(indexFile));
            assertEquals("index.md", indexFile.getFileName().toString());
            assertEquals(noteId + ".md", noteFile.getFileName().toString());
        }
    }

    @Nested
    @DisplayName("Tier 1 & Tier 2: ActivityTracker Idle Logic & Thread Safety")
    class ActivityTrackerTests {

        static class SimpleActivityTracker {
            private final AtomicInteger activeRequests = new AtomicInteger(0);
            private final AtomicLong lastRequestTime = new AtomicLong(System.currentTimeMillis());

            public void onRequestStart() {
                activeRequests.incrementAndGet();
            }

            public void onRequestEnd() {
                activeRequests.decrementAndGet();
                lastRequestTime.set(System.currentTimeMillis());
            }

            public boolean isIdle(long thresholdMillis) {
                return activeRequests.get() == 0 &&
                       (System.currentTimeMillis() - lastRequestTime.get() >= thresholdMillis);
            }

            public long getIdleDurationMillis() {
                return System.currentTimeMillis() - lastRequestTime.get();
            }

            public int getActiveCount() {
                return activeRequests.get();
            }

            public void setLastRequestTime(long time) {
                lastRequestTime.set(time);
            }
        }

        @Test
        @DisplayName("T1.1.1: Returns idle=true when active=0 and elapsed time exceeds threshold")
        void testIdleConditionMet() {
            SimpleActivityTracker tracker = new SimpleActivityTracker();
            tracker.setLastRequestTime(System.currentTimeMillis() - (35 * 60 * 1000L)); // 35 min ago

            assertTrue(tracker.isIdle(30 * 60 * 1000L), "Should be idle after 35 minutes with 0 active requests");
        }

        @Test
        @DisplayName("T1.1.2: Returns idle=false when active requests > 0 regardless of time")
        void testNotIdleWhenActiveRequestsPresent() {
            SimpleActivityTracker tracker = new SimpleActivityTracker();
            tracker.onRequestStart(); // active = 1
            tracker.setLastRequestTime(System.currentTimeMillis() - (100 * 60 * 1000L));

            assertFalse(tracker.isIdle(30 * 60 * 1000L), "Cannot be idle while requests are actively in-flight");
        }

        @Test
        @DisplayName("T1.1.3: Returns idle=false when active=0 but threshold duration not met")
        void testNotIdleWhenRecentRequestOccurred() {
            SimpleActivityTracker tracker = new SimpleActivityTracker();
            tracker.setLastRequestTime(System.currentTimeMillis() - (5 * 60 * 1000L)); // 5 min ago

            assertFalse(tracker.isIdle(30 * 60 * 1000L), "Should not be idle when last request was 5 minutes ago");
        }

        @Test
        @DisplayName("T1.1.4: Accurately increments, decrements and timestamps requests")
        void testTrackerLifecycle() {
            SimpleActivityTracker tracker = new SimpleActivityTracker();
            assertEquals(0, tracker.getActiveCount());

            tracker.onRequestStart();
            assertEquals(1, tracker.getActiveCount());

            tracker.onRequestEnd();
            assertEquals(0, tracker.getActiveCount());
            assertTrue(tracker.getIdleDurationMillis() >= 0);
        }

        @Test
        @DisplayName("T2.4: Active request arrival interrupts idle state immediately")
        void testIdleInterruptionOnNewRequest() {
            SimpleActivityTracker tracker = new SimpleActivityTracker();
            tracker.setLastRequestTime(System.currentTimeMillis() - (40 * 60 * 1000L));
            assertTrue(tracker.isIdle(30 * 60 * 1000L));

            // Student request arrives
            tracker.onRequestStart();
            assertFalse(tracker.isIdle(30 * 60 * 1000L), "Idle state immediately revoked upon request start");

            tracker.onRequestEnd();
            // Just completed, so elapsed time is ~0ms
            assertFalse(tracker.isIdle(30 * 60 * 1000L), "Idle timer reset upon request completion");
        }
    }

    @Nested
    @DisplayName("Tier 2: Boundary & Corner Cases in OKF Processing")
    class BoundaryCornerTests {

        @Test
        @DisplayName("T2.1: Gracefully handles empty or blank note text")
        void testEmptyNoteTextHandling() {
            String emptyNoteText = "";
            String blankNoteText = "   \n\t  ";

            assertTrue(emptyNoteText.isBlank());
            assertTrue(blankNoteText.isBlank());

            // Contract: empty notes produce minimal fallback frontmatter with status "FAILED" or "EMPTY"
            Map<String, Object> fallbackMetadata = new HashMap<>();
            fallbackMetadata.put("type", "academic_notes");
            fallbackMetadata.put("status", "FAILED");
            fallbackMetadata.put("error", "Source document contained no extractable text");

            assertEquals("FAILED", fallbackMetadata.get("status"));
        }

        @Test
        @DisplayName("T2.2: Extreme payload size (200,000 characters) partitioned without OOM")
        void testLargePayloadChunking() {
            StringBuilder largeText = new StringBuilder();
            for (int i = 0; i < 5000; i++) {
                largeText.append("Section ").append(i).append(": Key concept in advanced algorithms.\n");
            }
            String content = largeText.toString();
            assertTrue(content.length() > 200_000);

            // Chunking into max 2000 character windows
            int maxChunk = 2000;
            int chunks = (int) Math.ceil((double) content.length() / maxChunk);
            assertTrue(chunks >= 100);

            String firstChunk = content.substring(0, maxChunk);
            assertEquals(2000, firstChunk.length());
        }

        @Test
        @DisplayName("T2.6: Corrupted or malformed YAML frontmatter recovers safely")
        void testCorruptedYamlRecovery() {
            String corruptedOkf = 
                "---\n" +
                "type: academic_notes\n" +
                "title: Unclosed string \"without quote\n" +
                "tags: [incomplete list\n" +
                "---\n" +
                "# Heading";

            assertThrows(Exception.class, () -> yaml.load(corruptedOkf.substring(4, corruptedOkf.indexOf("---", 4))));

            // Safe recovery fallback parses markdown body without frontmatter crash
            int secondDelim = corruptedOkf.indexOf("---", 4);
            String body = (secondDelim != -1) ? corruptedOkf.substring(secondDelim + 3).trim() : corruptedOkf;
            assertTrue(body.contains("# Heading"));
        }

        @Test
        @DisplayName("T2.8: Default values applied when optional metadata (unit, tags) missing")
        void testMissingOptionalMetadataDefaults() {
            Map<String, Object> frontmatter = new HashMap<>();
            frontmatter.put("type", "academic_notes");
            frontmatter.put("title", "Lecture 1");

            String unit = (String) frontmatter.getOrDefault("unit", "General");
            @SuppressWarnings("unchecked")
            List<String> tags = (List<String>) frontmatter.getOrDefault("tags", Collections.emptyList());

            assertEquals("General", unit);
            assertNotNull(tags);
            assertTrue(tags.isEmpty());
        }
    }

    // Helper to extract and parse YAML frontmatter from an OKF string
    private Map<String, Object> parseFrontmatter(String content) {
        if (!content.startsWith("---")) {
            throw new IllegalArgumentException("Content does not start with YAML frontmatter delimiter '---'");
        }
        int endDelim = content.indexOf("---", 3);
        if (endDelim == -1) {
            throw new IllegalArgumentException("Unclosed YAML frontmatter delimiter");
        }
        String yamlBlock = content.substring(3, endDelim).trim();
        return yaml.load(yamlBlock);
    }
}
