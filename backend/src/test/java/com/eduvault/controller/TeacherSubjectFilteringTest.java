package com.eduvault.controller;

import com.eduvault.util.TeacherSubjectMatcher;
import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

public class TeacherSubjectFilteringTest {

    @Test
    public void testParseSubjectListJsonArray() {
        String json = "[\"Machine Learning\", \"Cloud Computing\", \"Operating Systems\"]";
        Set<String> set = TeacherSubjectMatcher.parseSubjectList(json, null);
        assertEquals(3, set.size());
        assertTrue(set.contains("Machine Learning"));
        assertTrue(set.contains("Cloud Computing"));
        assertTrue(set.contains("Operating Systems"));
    }

    @Test
    public void testParseSubjectListCommaDelimited() {
        String csv = "Machine Learning, Cloud Computing, Operating Systems";
        Set<String> set = TeacherSubjectMatcher.parseSubjectList(null, csv);
        assertEquals(3, set.size());
        assertTrue(set.contains("Machine Learning"));
        assertTrue(set.contains("Cloud Computing"));
        assertTrue(set.contains("Operating Systems"));
    }

    @Test
    public void testParseEmptyOrNull() {
        Set<String> set1 = TeacherSubjectMatcher.parseSubjectList(null, null);
        assertTrue(set1.isEmpty());

        Set<String> set2 = TeacherSubjectMatcher.parseSubjectList("[]", "");
        assertTrue(set2.isEmpty());
    }

    @Test
    public void testMatchesAnySubjectExactAndCode() {
        Set<String> teacherSubs = Set.of("Machine Learning", "Cloud Computing");

        // Exact name match
        assertTrue(TeacherSubjectMatcher.matchesAnySubject(teacherSubs, "sub_01", "Machine Learning", "ML"));

        // Match by code/name in candidates
        assertTrue(TeacherSubjectMatcher.matchesAnySubject(teacherSubs, "Machine Learning"));

        // Substring match e.g. "Cloud Computing Lab" or "Cloud Computing (CC)"
        assertTrue(TeacherSubjectMatcher.matchesAnySubject(teacherSubs, "Cloud Computing (CC)"));

        // Disjoint subject should not match
        assertFalse(TeacherSubjectMatcher.matchesAnySubject(teacherSubs, "sub_99", "Compiler Design", "CD"));
    }

    @Test
    public void testMatchesSubjectWithIdOrCode() {
        Set<String> teacherSubs = Set.of("sub_ml_101", "CS301");

        assertTrue(TeacherSubjectMatcher.matchesAnySubject(teacherSubs, "sub_ml_101", "Artificial Intelligence", "AI"));
        assertTrue(TeacherSubjectMatcher.matchesAnySubject(teacherSubs, "sub_other", "Algorithms", "CS301"));

        assertFalse(TeacherSubjectMatcher.matchesAnySubject(teacherSubs, "sub_diff", "Database Systems", "CS302"));
    }

    @Test
    public void testEmptySelectedSubjectsReturnsFalse() {
        Set<String> empty = Set.of();
        assertFalse(TeacherSubjectMatcher.matchesAnySubject(empty, "sub_ml_101", "Artificial Intelligence", "AI"));
        assertFalse(TeacherSubjectMatcher.matchesAnySubject(null, "sub_ml_101"));
    }

    @Test
    public void testCaseInsensitiveAndWhitespaceTrim() {
        Set<String> teacherSubs = Set.of("  machine learning  ");
        assertTrue(TeacherSubjectMatcher.matchesAnySubject(teacherSubs, "MACHINE LEARNING"));
        assertTrue(TeacherSubjectMatcher.matchesAnySubject(teacherSubs, "Machine Learning (ML)"));
    }

    @Test
    public void testMissedSubjectMatchingLogic() {
        Set<String> teacherSubs = Set.of("Cloud Computing", "sub_ds_200");

        // Missed subject 1: Cloud Computing (match by name)
        assertTrue(TeacherSubjectMatcher.matchesAnySubject(teacherSubs, "sub_cc_01", "Cloud Computing", "CC-301"));

        // Missed subject 2: Data Structures (match by ID)
        assertTrue(TeacherSubjectMatcher.matchesAnySubject(teacherSubs, "sub_ds_200", "Data Structures", "CS-201"));

        // Missed subject 3: Unselected subject
        assertFalse(TeacherSubjectMatcher.matchesAnySubject(teacherSubs, "sub_os_999", "Operating Systems", "CS-401"));
    }
}
