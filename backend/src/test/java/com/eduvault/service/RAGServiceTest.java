package com.eduvault.service;

import com.eduvault.model.Note;
import com.eduvault.repository.LocalJsonDatabase;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class RAGServiceTest {

    @Mock
    private LocalJsonDatabase database;

    @Mock
    private GeminiService geminiService;

    @InjectMocks
    private RAGService ragService;

    private Note sampleNote;

    @BeforeEach
    void setUp() {
        ragService.init();

        sampleNote = new Note();
        sampleNote.setId("note-101");
        sampleNote.setTitle("Operating Systems: CPU Scheduling");
        sampleNote.setDepartment("Computer Science");
        sampleNote.setUnit("Unit 2");
        sampleNote.setExtractedText(
            "# Chapter 2: CPU Scheduling Algorithms\n\n" +
            "CPU scheduling is the process of deciding which process will own CPU to execute while another process is on hold. " +
            "The main purpose of CPU scheduling is to make the system fast, fair, and efficient.\n\n" +
            "## Round Robin Scheduling:\n" +
            "Round Robin is a preemptive scheduling algorithm where each process is assigned a fixed time slot called a Time Quantum. " +
            "If the process does not complete within the time quantum, it is preempted and put at the end of the ready queue. " +
            "Advantages include fairness and avoidance of starvation.\n\n" +
            "## Shortest Job First (SJF):\n" +
            "SJF selects the waiting process with the smallest execution time to execute next. " +
            "It gives the minimum average waiting time among all scheduling algorithms."
        );
    }

    @Test
    void testAskChapterWithDirectContextMatch() throws Exception {
        when(database.getNoteById("note-101")).thenReturn(Optional.of(sampleNote));
        when(geminiService.chat(anyString(), anyString(), anyDouble(), any())).thenReturn(
            "{\"answer\": \"Round Robin assigns each process a fixed Time Quantum.\", \"confidence\": 0.90}"
        );

        String result = ragService.askChapter("What is Round Robin time quantum?", "note-101");

        assertNotNull(result);
        assertTrue(result.contains("Round Robin"));
        assertTrue(result.contains("confidence"));
        verify(geminiService, times(1)).chat(anyString(), anyString(), anyDouble(), any());
    }

    @Test
    void testCacheHitAvoidsDuplicateLLMCall() throws Exception {
        when(database.getNoteById("note-101")).thenReturn(Optional.of(sampleNote));
        when(geminiService.chat(anyString(), anyString(), anyDouble(), any())).thenReturn(
            "{\"answer\": \"SJF provides minimum average waiting time.\", \"confidence\": 0.92}"
        );

        // 1st call - hits LLM
        String result1 = ragService.askChapter("Tell me about SJF", "note-101");
        // 2nd call - identical question from another student -> must hit 20-day in-memory cache
        String result2 = ragService.askChapter("Tell me about SJF", "note-101");

        assertEquals(result1, result2);
        // LLM called only once!
        verify(geminiService, times(1)).chat(anyString(), anyString(), anyDouble(), any());
    }

    @Test
    void testUnrelatedQuestionTriggersAntiHallucination() throws Exception {
        when(database.getNoteById("note-101")).thenReturn(Optional.of(sampleNote));

        // Question completely absent from note
        String result = ragService.askChapter("How does photosynthesis work in chloroplasts?", "note-101");

        assertNotNull(result);
        assertTrue(result.contains("not covered in the provided notes") || result.contains("could not find information"));
        // LLM should not even be called when passage score threshold is 0
        verify(geminiService, never()).chat(anyString(), anyString(), anyDouble(), any());
    }

    @Test
    void testFallbackWhenLLMFails() throws Exception {
        when(database.getNoteById("note-101")).thenReturn(Optional.of(sampleNote));
        when(geminiService.chat(anyString(), anyString(), anyDouble(), any())).thenThrow(new RuntimeException("API quota exceeded"));

        String result = ragService.askChapter("Explain preemptive scheduling", "note-101");

        assertNotNull(result);
        assertTrue(result.contains("Excerpt from College Notes") || result.contains("answer"));
        assertTrue(result.contains("confidence"));
    }
}
