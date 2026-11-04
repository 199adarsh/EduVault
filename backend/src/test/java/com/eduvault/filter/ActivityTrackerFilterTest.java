package com.eduvault.filter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.io.IOException;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ActivityTrackerFilterTest {

    private ActivityTrackerFilter filter;
    private HttpServletRequest request;
    private HttpServletResponse response;
    private FilterChain filterChain;

    @BeforeEach
    void setUp() {
        filter = new ActivityTrackerFilter();
        request = mock(HttpServletRequest.class);
        response = mock(HttpServletResponse.class);
        filterChain = mock(FilterChain.class);
    }

    @Test
    @DisplayName("Tracks active request during filter execution and resets upon completion")
    void testActiveRequestTracking() throws ServletException, IOException {
        when(request.getMethod()).thenReturn("POST");
        when(request.getRequestURI()).thenReturn("/api/ai/chat");

        doAnswer(invocation -> {
            assertEquals(1, filter.getActiveRequestsCount());
            assertFalse(filter.isIdle(0));
            return null;
        }).when(filterChain).doFilter(request, response);

        filter.doFilter(request, response, filterChain);

        assertEquals(0, filter.getActiveRequestsCount());
        assertEquals(1, filter.getTotalRequestsCount());
    }

    @Test
    @DisplayName("Decrements active requests counter when chain throws an exception")
    void testExceptionSafety() throws ServletException, IOException {
        when(request.getMethod()).thenReturn("GET");
        when(request.getRequestURI()).thenReturn("/api/notes/all");

        doThrow(new RuntimeException("Simulated controller error"))
                .when(filterChain).doFilter(request, response);

        assertThrows(RuntimeException.class, () -> filter.doFilter(request, response, filterChain));
        assertEquals(0, filter.getActiveRequestsCount());
        assertEquals(1, filter.getTotalRequestsCount());
    }

    @Test
    @DisplayName("Idle calculation reflects elapsed duration and active requests")
    void testIdleDurationAndState() {
        filter.setLastCompletedTimestamp(System.currentTimeMillis() - 2000);

        assertTrue(filter.isIdle(1000));
        assertFalse(filter.isIdle(5000));
        assertTrue(filter.getIdleDurationMillis() >= 2000);

        filter.resetIdleTimer();
        assertFalse(filter.isIdle(1000));
    }

    @Test
    @DisplayName("Excludes health checks, static assets, and batch status polling")
    void testExclusions() throws ServletException, IOException {
        // OPTIONS request
        when(request.getMethod()).thenReturn("OPTIONS");
        when(request.getRequestURI()).thenReturn("/api/notes/upload");
        filter.doFilter(request, response, filterChain);
        assertEquals(0, filter.getTotalRequestsCount());

        // Health check
        reset(request);
        when(request.getMethod()).thenReturn("GET");
        when(request.getRequestURI()).thenReturn("/api/health");
        filter.doFilter(request, response, filterChain);
        assertEquals(0, filter.getTotalRequestsCount());

        // Batch status polling
        reset(request);
        when(request.getMethod()).thenReturn("GET");
        when(request.getRequestURI()).thenReturn("/api/batch/okf/status");
        filter.doFilter(request, response, filterChain);
        assertEquals(0, filter.getTotalRequestsCount());

        // Static resource
        reset(request);
        when(request.getMethod()).thenReturn("GET");
        when(request.getRequestURI()).thenReturn("/static/bundle.js");
        filter.doFilter(request, response, filterChain);
        assertEquals(0, filter.getTotalRequestsCount());

        // Standard tracked request
        reset(request);
        when(request.getMethod()).thenReturn("POST");
        when(request.getRequestURI()).thenReturn("/api/notes/upload");
        filter.doFilter(request, response, filterChain);
        assertEquals(1, filter.getTotalRequestsCount());
    }
}
