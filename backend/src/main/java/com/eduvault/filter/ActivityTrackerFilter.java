package com.eduvault.filter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Lazy;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 10)
@Lazy(false)
public class ActivityTrackerFilter extends OncePerRequestFilter {

    private static final Logger logger = LoggerFactory.getLogger(ActivityTrackerFilter.class);

    private final AtomicInteger activeRequests = new AtomicInteger(0);
    private final AtomicLong lastCompletedTimestamp = new AtomicLong(System.currentTimeMillis());
    private final AtomicLong totalRequestsTracked = new AtomicLong(0);

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        boolean track = !shouldExcludeFromTracking(request);

        if (track) {
            activeRequests.incrementAndGet();
            totalRequestsTracked.incrementAndGet();
        }

        try {
            filterChain.doFilter(request, response);
        } finally {
            if (track) {
                activeRequests.decrementAndGet();
                lastCompletedTimestamp.set(System.currentTimeMillis());
            }
        }
    }

    public boolean isIdle(long thresholdMillis) {
        if (activeRequests.get() > 0) {
            return false;
        }
        long elapsed = System.currentTimeMillis() - lastCompletedTimestamp.get();
        return elapsed >= thresholdMillis;
    }

    public long getIdleDurationMillis() {
        if (activeRequests.get() > 0) {
            return 0L;
        }
        long elapsed = System.currentTimeMillis() - lastCompletedTimestamp.get();
        return Math.max(0L, elapsed);
    }

    public int getActiveRequestsCount() {
        return activeRequests.get();
    }

    public long getLastCompletedTimestamp() {
        return lastCompletedTimestamp.get();
    }

    public void setLastCompletedTimestamp(long timestamp) {
        this.lastCompletedTimestamp.set(timestamp);
    }

    public long getTotalRequestsCount() {
        return totalRequestsTracked.get();
    }

    public void resetIdleTimer() {
        lastCompletedTimestamp.set(System.currentTimeMillis());
    }

    public boolean shouldExcludeFromTracking(HttpServletRequest request) {
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return true;
        }

        String uri = request.getRequestURI();
        if (uri == null) {
            return false;
        }

        // Exclude health checks & actuators
        if (uri.equals("/health") || uri.equals("/api/health") || uri.startsWith("/actuator")) {
            return true;
        }

        // Exclude batch status polling
        if (uri.equals("/api/batch/okf/status")) {
            return true;
        }

        // Exclude static assets
        if (uri.equals("/favicon.ico") || uri.equals("/favicon.png") || uri.equals("/robots.txt")
                || uri.startsWith("/assets/") || uri.startsWith("/static/") || uri.startsWith("/webjars/")) {
            return true;
        }

        String lowerUri = uri.toLowerCase();
        return lowerUri.endsWith(".ico") || lowerUri.endsWith(".png") || lowerUri.endsWith(".jpg")
                || lowerUri.endsWith(".jpeg") || lowerUri.endsWith(".gif") || lowerUri.endsWith(".svg")
                || lowerUri.endsWith(".css") || lowerUri.endsWith(".js") || lowerUri.endsWith(".map")
                || lowerUri.endsWith(".woff") || lowerUri.endsWith(".woff2") || lowerUri.endsWith(".ttf");
    }
}
