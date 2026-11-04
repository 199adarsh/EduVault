package com.eduvault.util;

import com.eduvault.model.Subject;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Utility for normalizing academic departments, semesters, and computing
 * dynamic virtual folder keys (e.g. AIDS-S05, CSE-S05, CSE-S04).
 */
public class AcademicNormalizer {

    private static final Pattern SEM_NUMBER_PATTERN = Pattern.compile("(?i)(?:sem|semester|s)?\\s*0?([1-8])");

    /**
     * Canonical department code: "AIDS", "CSE", "ECE", "MECH", etc.
     */
    public static String normalizeDepartment(String dept) {
        if (dept == null || dept.isBlank()) {
            return "GENERAL";
        }
        String clean = dept.trim();
        // Strip B.Tech- or B.E. prefixes
        clean = clean.replaceAll("(?i)^b\\.?tech\\s*[-_]?\\s*", "")
                     .replaceAll("(?i)^b\\.?e\\.?\\s*[-_]?\\s*", "")
                     .trim();

        String upper = clean.toUpperCase();
        if (upper.contains("UAD") || upper.contains("AIDS") || upper.contains("AI&DS") || upper.contains("AI & DS") || upper.contains("ARTIFICIAL")) {
            return "AIDS";
        }
        if (upper.contains("CSE") || upper.contains("COMPUTER")) {
            return "CSE";
        }
        if (upper.contains("ECE") || upper.contains("ELECTRONIC")) {
            return "ECE";
        }
        if (upper.contains("MECH")) {
            return "MECH";
        }
        if (upper.contains("CIVIL")) {
            return "CIVIL";
        }
        return upper.replaceAll("[^A-Z0-9]", "");
    }

    /**
     * Canonical semester code: "S01" to "S08"
     */
    public static String normalizeSemesterCode(String sem) {
        if (sem == null || sem.isBlank()) {
            return "S01";
        }
        Matcher matcher = SEM_NUMBER_PATTERN.matcher(sem.trim());
        if (matcher.find()) {
            int num = Integer.parseInt(matcher.group(1));
            return String.format("S%02d", num);
        }
        return sem.trim().toUpperCase();
    }

    /**
     * Extracts integer semester number (1 to 8).
     */
    public static int getSemesterNumber(String sem) {
        if (sem == null || sem.isBlank()) {
            return 1;
        }
        Matcher matcher = SEM_NUMBER_PATTERN.matcher(sem.trim());
        if (matcher.find()) {
            return Integer.parseInt(matcher.group(1));
        }
        return 1;
    }

    /**
     * Dynamic folder key combining department + semester (e.g. "AIDS-S05", "CSE-S04").
     */
    public static String getFolderKey(String dept, String sem) {
        String d = normalizeDepartment(dept);
        String s = normalizeSemesterCode(sem);
        return d + "-" + s;
    }

    /**
     * Check if two department strings represent the same canonical department.
     */
    public static boolean isDepartmentMatch(String d1, String d2) {
        if (d1 == null || d2 == null) return false;
        return normalizeDepartment(d1).equalsIgnoreCase(normalizeDepartment(d2));
    }

    /**
     * Check if two departments are allied (share cross-listed subjects).
     * AIDS and CSE share many subjects like Software Engineering, Data Structures, etc.
     */
    public static boolean isAlliedDepartment(String d1, String d2) {
        if (d1 == null || d2 == null) return false;
        String n1 = normalizeDepartment(d1);
        String n2 = normalizeDepartment(d2);
        if (n1.equalsIgnoreCase(n2)) return true;
        java.util.Set<String> csAllied = java.util.Set.of("AIDS", "CSE", "AIML");
        return csAllied.contains(n1.toUpperCase()) && csAllied.contains(n2.toUpperCase());
    }

    /**
     * Check if two semester strings represent the same canonical semester.
     */
    public static boolean isSemesterMatch(String s1, String s2) {
        if (s1 == null || s2 == null) return false;
        return normalizeSemesterCode(s1).equalsIgnoreCase(normalizeSemesterCode(s2));
    }

    /**
     * Infers department from course code or title.
     */
    public static String inferDepartmentFromCourse(String code, String fullname) {
        String combined = ((code != null ? code : "") + " " + (fullname != null ? fullname : "")).toUpperCase();
        if (combined.contains("UAD") || combined.contains("AIDS") || combined.contains("AI&DS") || combined.contains("AI & DS") || combined.contains("01AD")) {
            return "B.Tech-UAD";
        }
        if (combined.contains("UAM") || combined.contains("01AM") || (combined.contains("CSE") && combined.contains("AIML"))) {
            return "B.Tech-UAM";
        }
        if (combined.contains("UCS") || combined.contains("01CS") || combined.contains("COMPUTER") || combined.contains("CSE")) {
            return "CSE";
        }
        if (combined.contains("UTC") || combined.contains("TEXTILE") || combined.contains("03DT") || combined.contains("03TC")) {
            return "B.Tech Textile-UTC";
        }
        if (combined.contains("UET") || combined.contains("01ET") || combined.contains("ELECTRONIC")) {
            return "ECE";
        }
        if (combined.contains("UME") || combined.contains("01ME") || combined.contains("MECHANICAL")) {
            return "MECH";
        }
        if (combined.contains("UCE") || combined.contains("01CE") || combined.contains("CIVIL")) {
            return "CIVIL";
        }
        return "GENERAL";
    }

    /**
     * Infers semester code (e.g. "SEM 01", "SEM 03", "SEM 04", "SEM 05") from course code or title.
     */
    public static String inferSemesterFromCourse(String code, String fullname) {
        String combined = ((code != null ? code : "") + " " + (fullname != null ? fullname : "")).toUpperCase();
        
        Matcher semMatcher = Pattern.compile("(?i)(?:sem|semester|s)[\\s-_]*0?([1-8])").matcher(combined);
        if (semMatcher.find()) {
            return String.format("SEM %02d", Integer.parseInt(semMatcher.group(1)));
        }

        if (combined.contains("FY") || combined.contains("FIRST YEAR") || combined.contains("1ST YEAR")) {
            return "SEM 01";
        }
        if (combined.contains("SY") || combined.contains("SECOND YEAR") || combined.contains("2ND YEAR")) {
            return "SEM 03";
        }
        if (combined.contains("TY") || combined.contains("THIRD YEAR") || combined.contains("3RD YEAR")) {
            return "SEM 05";
        }
        if (combined.contains("FINAL YEAR") || combined.contains("4TH YEAR") || combined.contains("B.TECH FINAL")) {
            return "SEM 07";
        }

        if (code != null) {
            Matcher codeNumMatcher = Pattern.compile("[A-Z]+([1-8])\\d{2}").matcher(code.toUpperCase());
            if (codeNumMatcher.find()) {
                int digit = Integer.parseInt(codeNumMatcher.group(1));
                if (digit == 1) return "SEM 01";
                if (digit == 2) return "SEM 04";
                if (digit == 3) return "SEM 05";
                if (digit == 4) return "SEM 07";
                if (digit >= 5 && digit <= 8) return String.format("SEM %02d", digit);
            }
        }

        return "SEM 01";
    }

    public static String cleanCourseName(String raw) {
        if (raw == null) return "Untitled Course";
        String s = raw.replaceAll("(?i)\\([0-9A-Z]+\\)|[0-9]{2}[A-Z]{2,6}[0-9]{3,4}[A-Z]?|[0-9]{2}-[0-9]{2}", "")
                      .replaceAll("[-_:]", " ")
                      .replaceAll("\\s+", " ")
                      .trim();
        return s.isEmpty() ? raw.trim() : s;
    }

    /**
     * Normalizes a subject name for exact matching:
     * Removes parenthetical / bracketed text (e.g. course codes like (01CS502)),
     * removes non-alphanumeric punctuation, collapses internal spaces, and lowercases.
     */
    public static String normalizeSubjectName(String name) {
        if (name == null || name.isBlank()) return "";
        String stripped = name.replaceAll("\\s*\\([^)]*\\)\\s*", " ")
                              .replaceAll("\\s*\\[[^]]*\\]\\s*", " ")
                              .replaceAll("[^a-zA-Z0-9\\s]", " ")
                              .trim()
                              .replaceAll("\\s+", " ")
                              .toLowerCase();
        return stripped;
    }

    /**
     * Extracts a course code from text (e.g., "01CS502", "01ADL201", "02ADL204").
     */
    public static String extractCourseCode(String text) {
        if (text == null || text.isBlank()) return null;
        Matcher m = Pattern.compile("([0-9]{2}[A-Za-z]{2,6}[0-9]{3,4}[A-Za-z]?)").matcher(text);
        if (m.find()) return m.group(1).toUpperCase();
        return null;
    }

    /**
     * Resolves a subject from a catalog using the strict 3-tier matching rule:
     * 1. Exact subject code match first
     * 2. Canonical ID match second
     * 3. Normalized exact name match third
     * 
     * Rejects ambiguous matches (> 1 match) and never uses fuzzy guessing.
     */
    public static Subject resolveSubject(String identifierOrName, String targetCode, String targetId, List<Subject> catalog) {
        if (catalog == null || catalog.isEmpty()) return null;

        // Extract code if not explicitly given
        String codeToMatch = targetCode;
        if ((codeToMatch == null || codeToMatch.isBlank()) && identifierOrName != null) {
            codeToMatch = extractCourseCode(identifierOrName);
        }

        // Tier 1: Match by exact subject code
        if (codeToMatch != null && !codeToMatch.isBlank()) {
            final String code = codeToMatch.trim();
            List<Subject> codeMatches = catalog.stream()
                    .filter(s -> s.getCode() != null && s.getCode().equalsIgnoreCase(code))
                    .collect(java.util.stream.Collectors.toList());
            if (codeMatches.size() == 1) {
                return codeMatches.get(0);
            } else if (codeMatches.size() > 1) {
                // Ambiguous match on code - reject automatic resolution
                return null;
            }
        }

        // Tier 2: Match by exact canonical ID
        if (targetId != null && !targetId.isBlank()) {
            final String id = targetId.trim();
            List<Subject> idMatches = catalog.stream()
                    .filter(s -> s.getId() != null && s.getId().equalsIgnoreCase(id))
                    .collect(java.util.stream.Collectors.toList());
            if (idMatches.size() == 1) {
                return idMatches.get(0);
            } else if (idMatches.size() > 1) {
                // Ambiguous match on ID - reject
                return null;
            }
        }

        // Tier 3: Match by normalized exact name
        if (identifierOrName != null && !identifierOrName.isBlank()) {
            String normTarget = normalizeSubjectName(identifierOrName);
            if (!normTarget.isBlank()) {
                List<Subject> nameMatches = catalog.stream()
                        .filter(s -> s.getName() != null && normalizeSubjectName(s.getName()).equalsIgnoreCase(normTarget))
                        .collect(java.util.stream.Collectors.toList());
                if (nameMatches.size() == 1) {
                    return nameMatches.get(0);
                } else if (nameMatches.size() > 1) {
                    // Check if all matches represent identical duplicate courses in the catalog
                    boolean allSameCourse = nameMatches.stream().allMatch(s ->
                            AcademicNormalizer.isDepartmentMatch(s.getDepartment(), nameMatches.get(0).getDepartment()) &&
                            AcademicNormalizer.isSemesterMatch(s.getSemester(), nameMatches.get(0).getSemester()));
                    if (allSameCourse) {
                        return nameMatches.stream()
                                .max(java.util.Comparator.comparingInt(s -> s.getNoteCount() != null ? s.getNoteCount() : 0))
                                .orElse(nameMatches.get(0));
                    }
                    // Truly ambiguous across different departments/semesters -> reject
                    return null;
                }
            }
        }

        return null;
    }
}

