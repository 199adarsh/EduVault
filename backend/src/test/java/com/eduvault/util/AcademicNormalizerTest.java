package com.eduvault.util;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

public class AcademicNormalizerTest {

    @Test
    public void testDepartmentNormalization() {
        assertEquals("AIDS", AcademicNormalizer.normalizeDepartment("B.Tech-UAD"));
        assertEquals("AIDS", AcademicNormalizer.normalizeDepartment("UAD"));
        assertEquals("AIDS", AcademicNormalizer.normalizeDepartment("AIDS"));
        assertEquals("AIDS", AcademicNormalizer.normalizeDepartment("AI&DS"));
        assertEquals("AIDS", AcademicNormalizer.normalizeDepartment("Artificial Intelligence"));
        assertEquals("CSE", AcademicNormalizer.normalizeDepartment("B.Tech-CSE"));
        assertEquals("CSE", AcademicNormalizer.normalizeDepartment("CSE"));
        assertEquals("CSE", AcademicNormalizer.normalizeDepartment("Computer Science"));
        assertEquals("ECE", AcademicNormalizer.normalizeDepartment("ECE"));
        assertEquals("GENERAL", AcademicNormalizer.normalizeDepartment(null));
        assertEquals("GENERAL", AcademicNormalizer.normalizeDepartment(""));
    }

    @Test
    public void testSemesterNormalization() {
        assertEquals("S05", AcademicNormalizer.normalizeSemesterCode("SEM 05"));
        assertEquals("S05", AcademicNormalizer.normalizeSemesterCode("Sem 5"));
        assertEquals("S05", AcademicNormalizer.normalizeSemesterCode("Semester 5"));
        assertEquals("S05", AcademicNormalizer.normalizeSemesterCode("S05"));
        assertEquals("S05", AcademicNormalizer.normalizeSemesterCode("5"));
        assertEquals("S04", AcademicNormalizer.normalizeSemesterCode("SEM 04"));
        assertEquals("S04", AcademicNormalizer.normalizeSemesterCode("Sem 4"));
        assertEquals("S04", AcademicNormalizer.normalizeSemesterCode("4"));
        assertEquals(5, AcademicNormalizer.getSemesterNumber("SEM 05"));
        assertEquals(4, AcademicNormalizer.getSemesterNumber("Sem 4"));
    }

    @Test
    public void testDynamicFolderKey() {
        assertEquals("AIDS-S05", AcademicNormalizer.getFolderKey("B.Tech-UAD", "SEM 05"));
        assertEquals("AIDS-S04", AcademicNormalizer.getFolderKey("UAD", "Sem 4"));
        assertEquals("CSE-S05", AcademicNormalizer.getFolderKey("CSE", "SEM 05"));
        assertEquals("CSE-S04", AcademicNormalizer.getFolderKey("B.Tech-CSE", "Sem 4"));
    }

    @Test
    public void testMatchingLogic() {
        assertTrue(AcademicNormalizer.isDepartmentMatch("B.Tech-UAD", "AIDS"));
        assertTrue(AcademicNormalizer.isDepartmentMatch("UAD", "B.Tech-UAD"));
        assertTrue(AcademicNormalizer.isSemesterMatch("SEM 04", "Sem 4"));
        assertTrue(AcademicNormalizer.isSemesterMatch("Semester 5", "SEM 05"));
        assertFalse(AcademicNormalizer.isDepartmentMatch("CSE", "AIDS"));
        assertFalse(AcademicNormalizer.isSemesterMatch("SEM 04", "SEM 05"));
    }
}

