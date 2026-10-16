package com.eduvault.util;

import java.time.LocalDate;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class AcademicYearResolver {

    private static final Pattern PRN_PATTERN = Pattern.compile("^(\\d{2})([A-Za-z]{2,6})");

    /**
     * Resolves student academic year folder such as "TY-UAD", "SY-UAD", "FY-UAD", "FINAL-UAD".
     *
     * In Indian universities / DKTE, the academic year transition happens in June (month >= 6).
     *
     * Example:
     * Student with PRN 24UAD022:
     * - Admission batch: 2024
     * - Oct 2026 (month >= 6): Academic year start 2026.
     *   Year of study = 2026 - 2024 + 1 = 3 -> "TY-UAD"
     * - In June 2027 (month >= 6): Academic year start 2027.
     *   Year of study = 2027 - 2024 + 1 = 4 -> "FINAL-UAD"
     *
     * Student with PRN 25UADxxx:
     * - Admission batch: 2025
     * - Oct 2026: Year of study = 2026 - 2025 + 1 = 2 -> "SY-UAD"
     * - In June 2027: Year of study = 2027 - 2025 + 1 = 3 -> "TY-UAD"
     */
    public static String resolveYearFolder(String prn, String fallbackDepartment) {
        if (prn == null || prn.trim().isEmpty()) {
            return fallbackDepartment != null && !fallbackDepartment.isBlank() 
                    ? "TY-" + fallbackDepartment.replace("B.Tech-", "") 
                    : "TY-UAD";
        }

        String clean = prn.trim().toUpperCase();
        Matcher matcher = PRN_PATTERN.matcher(clean);
        if (!matcher.find()) {
            return fallbackDepartment != null && !fallbackDepartment.isBlank() 
                    ? "TY-" + fallbackDepartment.replace("B.Tech-", "") 
                    : "TY-UAD";
        }

        int batchYear = Integer.parseInt(matcher.group(1)); // 24 -> 2024
        int admissionYear = 2000 + batchYear;
        String branch = matcher.group(2).toUpperCase(); // UAD

        LocalDate now = LocalDate.now();
        int currentYear = now.getYear();
        int currentMonth = now.getMonthValue();

        // Academic year start: June (month 6) through Dec is currentYear, Jan through May is currentYear - 1
        int academicYearStart = (currentMonth >= 6) ? currentYear : (currentYear - 1);
        int yearOfStudy = academicYearStart - admissionYear + 1;

        String yearPrefix;
        switch (yearOfStudy) {
            case 1:
                yearPrefix = "FY";
                break;
            case 2:
                yearPrefix = "SY";
                break;
            case 3:
                yearPrefix = "TY";
                break;
            case 4:
                yearPrefix = "FINAL";
                break;
            default:
                if (yearOfStudy < 1) yearPrefix = "FY";
                else yearPrefix = "ALUMNI";
                break;
        }

        return yearPrefix + "-" + branch;
    }

    public static int getYearOfStudy(String prn) {
        if (prn == null || prn.trim().isEmpty()) return 3;
        Matcher matcher = PRN_PATTERN.matcher(prn.trim().toUpperCase());
        if (!matcher.find()) return 3;

        int batchYear = Integer.parseInt(matcher.group(1));
        int admissionYear = 2000 + batchYear;

        LocalDate now = LocalDate.now();
        int currentYear = now.getYear();
        int currentMonth = now.getMonthValue();
        int academicYearStart = (currentMonth >= 6) ? currentYear : (currentYear - 1);
        return Math.max(1, academicYearStart - admissionYear + 1);
    }
}
