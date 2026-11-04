package com.eduvault.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.async.AsyncRequestNotUsableException;

import java.io.IOException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(AsyncRequestNotUsableException.class)
    public void handleAsyncRequestNotUsable(AsyncRequestNotUsableException ex) {
        // Client closed browser / network socket while data was in transit (broken pipe)
        log.debug("Async request client disconnected: {}", ex.getMessage());
    }

    @ExceptionHandler(IOException.class)
    public ResponseEntity<Void> handleIOException(IOException ex) {
        String msg = ex.getMessage();
        if (msg != null && (msg.contains("Broken pipe") || msg.contains("Connection reset") || msg.contains("connection was aborted"))) {
            log.debug("Client stream connection dropped: {}", msg);
            return null;
        }
        log.warn("I/O error during request processing: {}", msg);
        return ResponseEntity.internalServerError().build();
    }
}
