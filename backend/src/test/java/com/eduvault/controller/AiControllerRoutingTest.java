package com.eduvault.controller;

import com.eduvault.repository.LocalJsonDatabase;
import com.eduvault.service.GeminiService;
import com.eduvault.service.OkfKnowledgeService;
import com.eduvault.service.RAGService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

public class AiControllerRoutingTest {

    @InjectMocks
    private AiController aiController;

    @Mock
    private GeminiService geminiService;

    @Mock
    private RAGService ragService;

    @Mock
    private LocalJsonDatabase database;

    @Mock
    private OkfKnowledgeService okfKnowledgeService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        ReflectionTestUtils.setField(aiController, "okfKnowledgeService", okfKnowledgeService);
    }

    @Test
    @DisplayName("Routes subjectId query to OkfKnowledgeService and returns OKF_KNOWLEDGE source")
    void testChatWithSubjectIdRoutesToOkf() {
        when(okfKnowledgeService.buildSubjectKnowledgeContext(eq("sub-os-101"), anyString(), isNull()))
                .thenReturn(Optional.of("### OKF Verified Subject Knowledge (sub-os-101)\n#### Section: CPU Scheduling\nRound Robin scheduling..."));

        when(geminiService.askTutor(anyString(), anyString(), any()))
                .thenReturn("{\"answer\": \"Round Robin uses fixed time slices.\", \"confidence\": 0.95}");

        Map<String, String> request = Map.of(
                "subjectId", "sub-os-101",
                "question", "What is Round Robin time quantum?"
        );

        ResponseEntity<?> response = aiController.chat(null, request);
        assertEquals(200, response.getStatusCode().value());

        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) response.getBody();
        assertNotNull(body);
        assertEquals("OKF_KNOWLEDGE", body.get("source"));
        assertEquals("sub-os-101", body.get("subjectId"));
        assertEquals("Round Robin uses fixed time slices.", body.get("answer"));
        assertNotNull(body.get("contextSnippet"));
    }

    @Test
    @DisplayName("Falls back gracefully to General Tutor when OKF knowledge context is empty")
    void testChatWithUnreadySubjectFallsBackToGeneral() {
        when(okfKnowledgeService.buildSubjectKnowledgeContext(eq("sub-unready-999"), anyString(), isNull()))
                .thenReturn(Optional.empty());

        when(geminiService.askTutor(anyString(), anyString(), any()))
                .thenReturn("{\"answer\": \"Here is general guidance on your study inquiry.\", \"confidence\": 0.8}");

        Map<String, String> request = Map.of(
                "subjectId", "sub-unready-999",
                "question", "Tell me about this topic"
        );

        ResponseEntity<?> response = aiController.chat(null, request);
        assertEquals(200, response.getStatusCode().value());

        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) response.getBody();
        assertNotNull(body);
        assertEquals("GENERAL_TUTOR", body.get("source"));
    }

    @Test
    @DisplayName("Routes noteId query to RAGService and returns CHAPTER_RAG source")
    void testChatWithNoteIdRoutesToChapterRag() {
        when(ragService.askChapter(anyString(), eq("note-456"), any()))
                .thenReturn("{\"answer\": \"Note content summary from Chapter RAG.\", \"confidence\": 0.9}");

        Map<String, String> request = Map.of(
                "noteId", "note-456",
                "question", "Summarize this uploaded chapter"
        );

        ResponseEntity<?> response = aiController.chat(null, request);
        assertEquals(200, response.getStatusCode().value());

        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) response.getBody();
        assertNotNull(body);
        assertEquals("CHAPTER_RAG", body.get("source"));
        assertEquals("note-456", body.get("noteId"));
    }
}
