package com.eduvault.util;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.*;

/**
 * Utility for parsing and matching teacher assigned subjects
 * for authorization across Doubts and NC Requests.
 */
public class TeacherSubjectMatcher {

    private static final ObjectMapper mapper = new ObjectMapper();

    public static Set<String> parseSubjectList(String headerVal, String paramVal) {
        Set<String> set = new LinkedHashSet<>();
        addSubjectsFromString(set, headerVal);
        addSubjectsFromString(set, paramVal);
        return set;
    }

    public static void addSubjectsFromString(Set<String> set, String raw) {
        if (raw == null || raw.isBlank()) return;
        String trimmed = raw.trim();
        // Check if JSON array
        if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
            try {
                List<String> list = mapper.readValue(trimmed, new TypeReference<List<String>>() {});
                for (String s : list) {
                    if (s != null && !s.isBlank()) {
                        set.add(s.trim());
                    }
                }
                return;
            } catch (Exception ignored) {
            }
        }
        // Comma-delimited fallback
        for (String s : trimmed.split(",")) {
            String clean = s.trim().replaceAll("^\"|\"$", "");
            if (!clean.isEmpty()) {
                set.add(clean);
            }
        }
    }

    public static boolean matchesAnySubject(Set<String> teacherSubjects, String... candidates) {
        if (teacherSubjects == null || teacherSubjects.isEmpty()) return false;

        for (String cand : candidates) {
            if (cand == null || cand.isBlank()) continue;
            String trimmedCand = cand.trim().toLowerCase();
            String normCand = AcademicNormalizer.normalizeSubjectName(cand);

            for (String ts : teacherSubjects) {
                if (ts == null || ts.isBlank()) continue;
                String trimmedTs = ts.trim().toLowerCase();
                String normTs = AcademicNormalizer.normalizeSubjectName(ts);

                // Exact equality on raw strings or trimmed lowercase
                if (trimmedCand.equalsIgnoreCase(trimmedTs)) return true;

                // Match canonical normalized subject name
                if (!normCand.isEmpty() && !normTs.isEmpty() && normCand.equalsIgnoreCase(normTs)) return true;

                // Substring containment if length >= 3
                if (trimmedTs.length() >= 3 && trimmedCand.contains(trimmedTs)) return true;
                if (trimmedCand.length() >= 3 && trimmedTs.contains(trimmedCand)) return true;

                if (!normTs.isEmpty() && normTs.length() >= 3 && normCand.contains(normTs)) return true;
                if (!normCand.isEmpty() && normCand.length() >= 3 && normTs.contains(normCand)) return true;
            }
        }
        return false;
    }
}
