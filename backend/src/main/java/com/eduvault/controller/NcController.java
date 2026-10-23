package com.eduvault.controller;

import com.eduvault.model.NcNotification;
import com.eduvault.model.NcRequest;
import com.eduvault.model.StudentProfile;
import com.eduvault.model.Subject;
import com.eduvault.repository.LocalJsonDatabase;
import com.eduvault.service.NcBackblazeStorageService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/nc")
@CrossOrigin(origins = "*")
public class NcController {

    private static final Logger logger = LoggerFactory.getLogger(NcController.class);

    @Autowired
    private LocalJsonDatabase database;

    @Autowired
    private NcBackblazeStorageService ncStorageService;

    @Autowired
    private ObjectMapper mapper;

    /**
     * Retrieves all absent dates for the student linked to their missed subjects.
     */
    @GetMapping("/absent-dates")
    public ResponseEntity<?> getAbsentDates(@RequestParam(required = false) String prn) {
        StudentProfile profile = database.getProfile();
        List<Subject> subjects = database.getAllSubjects();

        if (profile != null && profile.getDepartment() != null && profile.getSemester() != null) {
            subjects = subjects.stream()
                    .filter(s -> s.getDepartment() != null && s.getDepartment().equalsIgnoreCase(profile.getDepartment())
                            && s.getSemester() != null && s.getSemester().equalsIgnoreCase(profile.getSemester()))
                    .collect(Collectors.toList());
        }

        Map<String, List<NcRequest.NcMissedSubject>> map = new LinkedHashMap<>();

        for (Subject sub : subjects) {
            if (sub.getDetailedAttendance() != null) {
                for (var rec : sub.getDetailedAttendance()) {
                    if ("Absent".equalsIgnoreCase(rec.getStatus())) {
                        String date = rec.getDate();
                        if (date != null && !date.isBlank()) {
                            map.computeIfAbsent(date, d -> new ArrayList<>())
                                    .add(NcRequest.NcMissedSubject.builder()
                                            .subjectId(sub.getId())
                                            .subjectName(sub.getName())
                                            .subjectCode(sub.getCode())
                                            .date(date)
                                            .slot(rec.getSlot())
                                            .build());
                        }
                    }
                }
            }
        }

        List<Map<String, Object>> response = new ArrayList<>();
        map.forEach((date, missed) -> {
            Map<String, Object> item = new HashMap<>();
            item.put("date", date);
            item.put("missedSubjects", missed);
            response.add(item);
        });

        // Sort dates descending
        response.sort((a, b) -> String.valueOf(b.get("date")).compareTo(String.valueOf(a.get("date"))));

        return ResponseEntity.ok(response);
    }

    /**
     * Submit a new NC (Absence Consideration) Request.
     */
    @PostMapping(value = "/requests", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> submitNcRequest(
            @RequestParam(value = "proofFile", required = false) MultipartFile proofFile,
            @RequestParam("absentDates") String absentDatesJson,
            @RequestParam("reason") String reason,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam(value = "missedSubjects", required = false) String missedSubjectsJson,
            @RequestParam(value = "studentPrn", required = false) String studentPrnParam
    ) {
        try {
            StudentProfile profile = database.getProfile();
            String studentPrn = (studentPrnParam != null && !studentPrnParam.isBlank())
                    ? studentPrnParam
                    : (profile != null ? profile.getPrn() : "UNKNOWN_STUDENT");

            List<String> absentDates = mapper.readValue(absentDatesJson, new TypeReference<List<String>>() {});
            if (absentDates == null || absentDates.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "At least one absent date must be selected."));
            }

            // Duplicate request check
            if (database.hasDuplicateNcDates(studentPrn, absentDates)) {
                return ResponseEntity.status(409).body(Map.of("error", "An active NC request already exists for one or more selected dates. Duplicate submissions are not allowed."));
            }

            List<NcRequest.NcMissedSubject> missedSubjects = new ArrayList<>();
            if (missedSubjectsJson != null && !missedSubjectsJson.isBlank()) {
                missedSubjects = mapper.readValue(missedSubjectsJson, new TypeReference<List<NcRequest.NcMissedSubject>>() {});
            }

            // Upload proof document to dedicated B2 bucket
            String proofFileKey = null;
            String proofFileName = null;
            String proofFileType = null;

            if (proofFile != null && !proofFile.isEmpty()) {
                proofFileName = proofFile.getOriginalFilename();
                proofFileType = proofFile.getContentType();
                proofFileKey = ncStorageService.uploadNcProof(proofFile);
            }

            NcRequest request = NcRequest.builder()
                    .id(UUID.randomUUID().toString())
                    .studentPrn(studentPrn)
                    .studentName(profile != null ? profile.getName() : "Student")
                    .rollNo(profile != null ? profile.getRollNo() : "")
                    .department(profile != null ? profile.getDepartment() : "AI & Data Science")
                    .semester(profile != null ? profile.getSemester() : "SEM 05")
                    .section(profile != null ? profile.getSection() : "")
                    .absentDates(absentDates)
                    .missedSubjects(missedSubjects)
                    .reason(reason)
                    .description(description)
                    .proofFileName(proofFileName)
                    .proofFileKey(proofFileKey)
                    .proofFileType(proofFileType)
                    .status("PENDING")
                    .createdAt(Instant.now().toString())
                    .build();

            NcRequest saved = database.addNcRequest(request);
            if (saved.getProofFileKey() != null) {
                saved.setProofPresignedUrl(ncStorageService.generatePresignedUrl(saved.getProofFileKey()));
            }

            return ResponseEntity.ok(saved);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(409).body(Map.of("error", ex.getMessage()));
        } catch (Exception ex) {
            logger.error("Failed to submit NC request", ex);
            return ResponseEntity.internalServerError().body(Map.of("error", "Submission error: " + ex.getMessage()));
        }
    }

    /**
     * Get student's submitted requests.
     */
    @GetMapping("/my-requests")
    public ResponseEntity<List<NcRequest>> getMyRequests(@RequestParam(required = false) String prn) {
        StudentProfile profile = database.getProfile();
        String studentPrn = (prn != null && !prn.isBlank())
                ? prn
                : (profile != null ? profile.getPrn() : null);

        if (studentPrn == null) {
            return ResponseEntity.ok(Collections.emptyList());
        }

        List<NcRequest> list = database.getNcRequestsByStudent(studentPrn);
        list.forEach(req -> {
            if (req.getProofFileKey() != null && (req.getProofPresignedUrl() == null || req.getProofPresignedUrl().isBlank())) {
                req.setProofPresignedUrl(ncStorageService.generatePresignedUrl(req.getProofFileKey()));
            }
        });
        return ResponseEntity.ok(list);
    }

    /**
     * Teacher view: Filter and list all authorized NC requests.
     */
    @GetMapping("/requests")
    public ResponseEntity<?> getAllRequests(
            @RequestHeader(value = "X-User-Role", required = false) String roleHeader,
            @RequestParam(required = false) String subject,
            @RequestParam(required = false) String student,
            @RequestParam(required = false) String date,
            @RequestParam(required = false) String status
    ) {
        List<NcRequest> all = database.getAllNcRequests();

        // Filter by status
        if (status != null && !status.isBlank() && !"ALL".equalsIgnoreCase(status)) {
            all = all.stream()
                    .filter(r -> r.getStatus() != null && r.getStatus().equalsIgnoreCase(status))
                    .collect(Collectors.toList());
        }

        // Filter by student name or PRN or roll number
        if (student != null && !student.isBlank()) {
            String q = student.toLowerCase().trim();
            all = all.stream()
                    .filter(r -> (r.getStudentName() != null && r.getStudentName().toLowerCase().contains(q))
                            || (r.getStudentPrn() != null && r.getStudentPrn().toLowerCase().contains(q))
                            || (r.getRollNo() != null && r.getRollNo().toLowerCase().contains(q)))
                    .collect(Collectors.toList());
        }

        // Filter by date
        if (date != null && !date.isBlank()) {
            String qDate = date.trim();
            all = all.stream()
                    .filter(r -> r.getAbsentDates() != null && r.getAbsentDates().stream().anyMatch(d -> d.contains(qDate)))
                    .collect(Collectors.toList());
        }

        // Filter by subject
        if (subject != null && !subject.isBlank() && !"ALL".equalsIgnoreCase(subject)) {
            String qSub = subject.toLowerCase().trim();
            all = all.stream()
                    .filter(r -> r.getMissedSubjects() != null && r.getMissedSubjects().stream().anyMatch(
                            s -> (s.getSubjectName() != null && s.getSubjectName().toLowerCase().contains(qSub))
                                    || (s.getSubjectCode() != null && s.getSubjectCode().toLowerCase().contains(qSub))
                    ))
                    .collect(Collectors.toList());
        }

        // Refresh presigned URLs from dedicated B2 bucket
        all.forEach(req -> {
            if (req.getProofFileKey() != null) {
                req.setProofPresignedUrl(ncStorageService.generatePresignedUrl(req.getProofFileKey()));
            }
        });

        return ResponseEntity.ok(all);
    }

    /**
     * Teacher review: Approve or reject NC request with comment.
     */
    @PutMapping("/requests/{id}/review")
    public ResponseEntity<?> reviewNcRequest(
            @PathVariable String id,
            @RequestHeader(value = "X-User-Role", required = false) String roleHeader,
            @RequestBody Map<String, String> payload
    ) {
        String newStatus = payload.get("status");
        String comment = payload.get("comment");
        String reviewerName = payload.get("reviewerName");

        if (newStatus == null || (!newStatus.equalsIgnoreCase("APPROVED") && !newStatus.equalsIgnoreCase("REJECTED"))) {
            return ResponseEntity.badRequest().body(Map.of("error", "Status must be APPROVED or REJECTED"));
        }

        Optional<NcRequest> opt = database.getNcRequestById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        NcRequest req = opt.get();
        req.setStatus(newStatus.toUpperCase());
        req.setReviewComment(comment);
        req.setReviewedBy(reviewerName != null ? reviewerName : "Faculty");
        req.setReviewedAt(Instant.now().toString());

        NcRequest updated = database.updateNcRequest(req);
        if (updated.getProofFileKey() != null) {
            updated.setProofPresignedUrl(ncStorageService.generatePresignedUrl(updated.getProofFileKey()));
        }

        return ResponseEntity.ok(updated);
    }

    /**
     * Delete all NC requests and notifications (reset to clean slate).
     */
    @DeleteMapping("/requests")
    public ResponseEntity<?> clearAllNcRequests() {
        database.deleteAllNcData();
        return ResponseEntity.ok(Map.of("message", "All NC requests and notifications have been deleted."));
    }

    /**
     * Stream proof file directly via backend proxy if needed.
     */
    @GetMapping("/proofs/{key}")
    public ResponseEntity<byte[]> getProofFile(@PathVariable String key) {
        byte[] data = ncStorageService.getProofBytes(key);
        if (data == null) {
            return ResponseEntity.notFound().build();
        }

        String ext = key.contains(".") ? key.substring(key.lastIndexOf('.')) : "";
        String contentType = ncStorageService.resolveContentTypeFromExt(ext);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + key + "\"")
                .contentType(MediaType.parseMediaType(contentType))
                .body(data);
    }

    /**
     * Notifications endpoint for NC events.
     */
    @GetMapping("/notifications")
    public ResponseEntity<List<NcNotification>> getNotifications(
            @RequestParam(required = false) String prn,
            @RequestParam(defaultValue = "student") String role
    ) {
        StudentProfile profile = database.getProfile();
        String recipientPrn = (prn != null && !prn.isBlank()) ? prn : (profile != null ? profile.getPrn() : "UNKNOWN");
        return ResponseEntity.ok(database.getNotifications(recipientPrn, role));
    }

    @PostMapping("/notifications/{id}/read")
    public ResponseEntity<Void> markNotificationRead(@PathVariable String id) {
        database.markNotificationRead(id);
        return ResponseEntity.ok().build();
    }
}
