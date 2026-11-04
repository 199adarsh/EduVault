package com.eduvault.service;

import com.eduvault.model.Note;
import com.eduvault.model.Subject;
import com.eduvault.repository.LocalJsonDatabase;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.test.util.ReflectionTestUtils;
import org.yaml.snakeyaml.Yaml;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class OkfGeneratorServiceTest {

    @TempDir
    Path tempDir;

    private OkfGeneratorService generatorService;
    private LocalJsonDatabase mockDatabase;
    private final Yaml yaml = new Yaml();

    @BeforeEach
    void setUp() {
        generatorService = new OkfGeneratorService();
        ReflectionTestUtils.setField(generatorService, "storageDir", tempDir.toString());

        mockDatabase = mock(LocalJsonDatabase.class);
        ReflectionTestUtils.setField(generatorService, "database", mockDatabase);
    }

    @Test
    @DisplayName("Generates valid OKF Markdown file with strict YAML frontmatter and pedagogical body")
    void testGenerateOkfForNoteSuccess() throws IOException {
        Subject subject = Subject.builder()
                .id("sub-cs-301")
                .name("Database Systems")
                .department("CSE")
                .semester("SEM 05")
                .build();

        Note note = Note.builder()
                .id("note-db-101")
                .subjectId("sub-cs-301")
                .title("Relational Algebra & Normalization")
                .unit("Unit 2")
                .department("CSE")
                .semester("SEM 05")
                .tags(List.of("databases", "normalization", "sql"))
                .aiImportantTopics(List.of("1NF and 2NF", "BCNF", "Lossless Join"))
                .aiGeneratedQuestions(List.of(
                        new Note.Question("What is BCNF?", "short", "medium"),
                        new Note.Question("Explain Lossless Join decomposition.", "long", "hard")
                ))
                .extractedText("Relational algebra provides the formal foundation for relational database operations. " +
                        "Selection is defined as picking rows satisfying a predicate. " +
                        "Projection refers to choosing specified columns. " +
                        "Boyce-Codd Normal Form (BCNF) eliminates all redundancy from functional dependencies.")
                .build();

        OkfGeneratorService.OkfGenerationResult result = generatorService.generateOkfForNote(note, subject);

        assertTrue(result.isSuccess());
        assertNotNull(result.getFilePath());
        assertTrue(Files.exists(result.getFilePath()));
        assertTrue(result.byteSize() > 0);

        String content = Files.readString(result.getFilePath());
        assertTrue(content.startsWith("---\n"));

        int endDelim = content.indexOf("---", 3);
        assertTrue(endDelim > 3);
        String yamlBlock = content.substring(3, endDelim).trim();
        Map<String, Object> frontmatter = yaml.load(yamlBlock);

        assertEquals("academic_notes", frontmatter.get("type"));
        assertEquals("Relational Algebra & Normalization", frontmatter.get("title"));
        assertEquals("sub-cs-301", frontmatter.get("subject_id"));
        assertEquals("Database Systems", frontmatter.get("subject_name"));
        assertEquals("Unit 2", frontmatter.get("unit"));
        assertEquals("active", frontmatter.get("status"));
        assertNotNull(frontmatter.get("last_compiled"));

        @SuppressWarnings("unchecked")
        List<String> tags = (List<String>) frontmatter.get("tags");
        assertTrue(tags.contains("normalization"));

        // Verify body sections
        String body = content.substring(endDelim + 3).trim();
        assertTrue(body.contains("# Relational Algebra & Normalization"));
        assertTrue(body.contains("## 1. Executive Summary & Overview"));
        assertTrue(body.contains("## 2. Key Concepts & Theory"));
        assertTrue(body.contains("## 3. Definitions & Core Principles"));
        assertTrue(body.contains("## 4. Practice Questions & Exam Focus"));
        assertTrue(body.contains("What is BCNF?"));
        assertTrue(body.contains("## 6. Primary Reference Excerpts"));
    }

    @Test
    @DisplayName("Handles unextractable or blank note text gracefully with failure frontmatter")
    void testGenerateOkfForBlankNote() throws IOException {
        Subject subject = Subject.builder().id("sub-cs-101").name("CS 101").build();
        Note blankNote = Note.builder()
                .id("note-corrupt-99")
                .subjectId("sub-cs-101")
                .title("Corrupted Document")
                .extractedText("   \n  ")
                .build();

        OkfGeneratorService.OkfGenerationResult result = generatorService.generateOkfForNote(blankNote, subject);

        assertFalse(result.isSuccess());
        assertEquals("Source document contained no extractable text", result.getErrorMessage());

        Path expectedPath = generatorService.getNoteOkfPath("sub-cs-101", "note-corrupt-99");
        assertTrue(Files.exists(expectedPath));

        String content = Files.readString(expectedPath);
        assertTrue(content.contains("status: \"FAILED\""));
    }

    @Test
    @DisplayName("Compiles subject bundle index.md linking all notes in unit order")
    void testCompileSubjectBundle() throws IOException {
        String subjectId = "sub-cs-301";
        Subject subject = Subject.builder()
                .id(subjectId)
                .name("Database Systems")
                .department("CSE")
                .semester("SEM 05")
                .build();

        Note n1 = Note.builder()
                .id("note-1")
                .subjectId(subjectId)
                .title("Introduction to DBMS")
                .unit("Unit 1")
                .extractedText("Database management systems provide structured storage and ACID transaction guarantees.")
                .build();

        Note n2 = Note.builder()
                .id("note-2")
                .subjectId(subjectId)
                .title("SQL Queries & Joins")
                .unit("Unit 2")
                .extractedText("Structured Query Language enables declarative data manipulation and inner/outer joins.")
                .build();

        when(mockDatabase.getSubjectById(subjectId)).thenReturn(Optional.of(subject));
        when(mockDatabase.getAllNotes()).thenReturn(List.of(n1, n2));

        OkfGeneratorService.OkfBundleResult bundleResult = generatorService.compileSubjectBundle(subjectId);

        assertTrue(bundleResult.isSuccess());
        assertEquals(2, bundleResult.notesProcessed());
        assertEquals(2, bundleResult.notesSucceeded());
        assertEquals(0, bundleResult.notesFailed());

        Path indexPath = generatorService.getSubjectIndexPath(subjectId);
        assertTrue(Files.exists(indexPath));

        String indexContent = Files.readString(indexPath);
        assertTrue(indexContent.contains("type: \"subject_index\""));
        assertTrue(indexContent.contains("total_notes_compiled: 2"));
        assertTrue(indexContent.contains("- [Unit 1: Introduction to DBMS](note-1.md)"));
        assertTrue(indexContent.contains("- [Unit 2: SQL Queries & Joins](note-2.md)"));

        assertTrue(generatorService.isSubjectBundleReady(subjectId));
    }
}
