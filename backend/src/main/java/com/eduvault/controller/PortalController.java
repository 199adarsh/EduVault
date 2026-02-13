package com.eduvault.controller;

import com.eduvault.model.DashboardCredentials;
import com.eduvault.service.PortalScraperService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/portal")
@CrossOrigin(origins = "*") // Allows calls from frontend
public class PortalController {

    private final PortalScraperService portalScraperService;
    private final com.eduvault.repository.LocalJsonDatabase database;

    @Autowired
    public PortalController(PortalScraperService portalScraperService, com.eduvault.repository.LocalJsonDatabase database) {
        this.portalScraperService = portalScraperService;
        this.database = database;
    }

    @PostMapping("/dashboard")
    public ResponseEntity<?> getDashboardData(@RequestBody DashboardCredentials credentials) {
        System.out.println("Received request: " + credentials);
        
        if (credentials.getPrn() == null || credentials.getDob() == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "PRN and DOB are required"));
        }

        try {
            System.out.println("Calling scraper service...");
            com.eduvault.model.PortalDashboardResponse response = portalScraperService.fetchDashboard(credentials.getPrn(), credentials.getDob());
            
            // Persist the synced data automatically
            if (response != null) {
                // 1. Update Profile (Preserve and add PRN/DOB)
                com.eduvault.model.StudentProfile profile = response.getProfile();
                profile.setPrn(credentials.getPrn());
                profile.setDob(credentials.getDob());
                database.updateProfile(profile);
                
                // 2. Update Subjects (Clear old and add new from portal)
                if (response.getSubjects() != null) {
                    List<com.eduvault.model.Subject> subjects = new java.util.ArrayList<>();
                    for (com.eduvault.model.DashboardSubject ds : response.getSubjects()) {
                        subjects.add(com.eduvault.model.Subject.builder()
                            .id(java.util.UUID.randomUUID().toString())
                            .name(ds.getName())
                            .department(profile.getDepartment())
                            .semester(profile.getSemester())
                            .attendance(String.valueOf(ds.getAttendance()))
                            .cie(String.valueOf(ds.getCie()))
                            .totalConducted(ds.getTotalConducted())
                            .totalAttended(ds.getTotalAttended())
                            .totalScheduled(ds.getTotalScheduled())
                            .stillToGo(ds.getStillToGo())
                            .createdAt(java.time.LocalDate.now().toString())
                            .detailedAttendance(ds.getDetailedAttendance())
                            .build());
                    }
                    database.setSubjects(subjects);
                }
            }
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            System.err.println("Portal Sync Error: " + e.getMessage());
            e.printStackTrace();
            
            if ("Invalid credentials".equals(e.getMessage())) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Invalid credentials"));
            }
            
            String errorMessage = e.getMessage() != null ? e.getMessage() : "An unexpected error occurred while syncing with the portal.";
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", errorMessage));
        }
    }
}
