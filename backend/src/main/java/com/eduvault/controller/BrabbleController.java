package com.eduvault.controller;

import com.eduvault.service.BrabbleService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/hackathons")
@CrossOrigin(origins = "*")
public class BrabbleController {

    @Autowired
    private BrabbleService brabbleService;

    @GetMapping(produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> getHackathons(
            @RequestParam(required = false, defaultValue = "hackathons") String hub,
            @RequestParam(required = false) String city,
            @RequestParam(required = false) String platform,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String mode,
            @RequestParam(required = false) Boolean free,
            @RequestParam(required = false) String search,
            @RequestParam(required = false, defaultValue = "10") Integer limit,
            @RequestParam(required = false, defaultValue = "0") Integer offset) {

        String resultJson = brabbleService.getHackathons(hub, city, platform, type, mode, free, search, limit, offset);
        return ResponseEntity.ok(resultJson);
    }
}
