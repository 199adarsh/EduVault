package com.eduvault.service;

import com.eduvault.repository.LocalJsonDatabase;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.lang.reflect.Method;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@ExtendWith(MockitoExtension.class)
public class GeminiServiceTest {

    @Mock
    private LocalJsonDatabase database;

    @InjectMocks
    private GeminiService geminiService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(geminiService, "baseUrl", "http://localhost:8000/v1");
        ReflectionTestUtils.setField(geminiService, "apiKey", "test-api-key");
        ReflectionTestUtils.setField(geminiService, "model", "gemini-3.5-flash");
    }

    @Test
    void testGetCompletionsUrlNormalization() throws Exception {
        Method method = GeminiService.class.getDeclaredMethod("getCompletionsUrl");
        method.setAccessible(true);

        assertEquals("http://localhost:8000/v1/chat/completions", method.invoke(geminiService));

        ReflectionTestUtils.setField(geminiService, "baseUrl", "http://localhost:8000/v1/");
        assertEquals("http://localhost:8000/v1/chat/completions", method.invoke(geminiService));
    }

    @Test
    void testCleanJsonHandling() throws Exception {
        Method cleanMethod = GeminiService.class.getDeclaredMethod("cleanJson", String.class);
        cleanMethod.setAccessible(true);

        String markdownJson = "```json\n{\"answer\": \"Hello\", \"confidence\": 0.95}\n```";
        String cleaned = (String) cleanMethod.invoke(geminiService, markdownJson);
        assertEquals("{\"answer\": \"Hello\", \"confidence\": 0.95}", cleaned);

        String textWithPrefix = "Here is the response: [\"Topic 1\", \"Topic 2\"] Thank you!";
        String cleanedList = (String) cleanMethod.invoke(geminiService, textWithPrefix);
        assertEquals("[\"Topic 1\", \"Topic 2\"]", cleanedList);
    }
}
