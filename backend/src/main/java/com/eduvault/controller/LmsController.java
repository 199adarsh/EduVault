package com.eduvault.controller;

import com.eduvault.model.LmsCredentials;
import com.eduvault.model.LmsSyncResponse;
import com.eduvault.service.LmsScraperService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/lms")
@CrossOrigin(origins = "*")
public class LmsController {

    private static final Logger logger = LoggerFactory.getLogger(LmsController.class);

    @Autowired
    private LmsScraperService lmsScraperService;

    @Autowired
    private com.eduvault.repository.LocalJsonDatabase database;

    @DeleteMapping("/clean-test-imports")
    public ResponseEntity<?> deleteDisposableTestImports() {
        int deleted = database.deleteDisposableTestImportNotes();
        return ResponseEntity.ok(Map.of("message", "Safely deleted disposable test-import notes", "deletedCount", deleted));
    }

    @GetMapping("/progress")
    public ResponseEntity<?> getSyncProgress(@RequestParam(required = false) String username) {
        if (username == null || username.isBlank()) {
            return ResponseEntity.ok(Map.of("status", "IDLE", "percent", 0));
        }
        return ResponseEntity.ok(lmsScraperService.getProgress(username));
    }

    @PostMapping("/discover")
    public ResponseEntity<?> discoverCourses(
            @RequestHeader(value = "X-User-Role", required = false) String roleHeader,
            @RequestBody LmsCredentials credentials) {
        if (roleHeader != null && !roleHeader.equalsIgnoreCase("teacher") && !roleHeader.equalsIgnoreCase("faculty") && !roleHeader.equalsIgnoreCase("admin")) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access Denied: Only teachers/faculty can discover LMS courses"));
        }
        if (credentials.getUsername() == null || credentials.getPassword() == null ||
            credentials.getUsername().trim().isEmpty() || credentials.getPassword().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Username and password are required"));
        }

        try {
            List<LmsSyncResponse.DiscoveredCourseInfo> courses = lmsScraperService.discoverCourses(
                    credentials.getUsername().trim(), credentials.getPassword().trim()
            );
            return ResponseEntity.ok(courses);
        } catch (Exception e) {
            logger.error("LMS Discovery error: {}", e.getMessage(), e);
            if (e.getMessage() != null && e.getMessage().contains("Invalid LMS credentials")) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", e.getMessage()));
            }
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "LMS Discovery failed: " + e.getMessage()));
        }
    }

    @PostMapping("/sync")
    public ResponseEntity<?> syncNotes(
            @RequestHeader(value = "X-User-Role", required = false) String roleHeader,
            @RequestBody LmsCredentials credentials) {
        if (roleHeader != null && !roleHeader.equalsIgnoreCase("teacher") && !roleHeader.equalsIgnoreCase("faculty") && !roleHeader.equalsIgnoreCase("admin")) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access Denied: Only teachers/faculty can trigger LMS notes synchronization"));
        }
        if (credentials.getUsername() == null || credentials.getPassword() == null ||
            credentials.getUsername().trim().isEmpty() || credentials.getPassword().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Username and password are required"));
        }

        try {
            LmsSyncResponse response = lmsScraperService.syncNotes(credentials);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("LMS Sync error: {}", e.getMessage(), e);
            if (e.getMessage() != null && e.getMessage().contains("Invalid LMS credentials")) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", e.getMessage()));
            }
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "LMS Sync failed: " + e.getMessage()));
        }
    }
}
