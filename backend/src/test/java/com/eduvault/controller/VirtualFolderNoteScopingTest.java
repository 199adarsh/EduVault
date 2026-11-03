package com.eduvault.controller;

import com.eduvault.model.Note;
import com.eduvault.model.StudentProfile;
import com.eduvault.model.Subject;
import com.eduvault.util.AcademicNormalizer;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;

public class VirtualFolderNoteScopingTest {

    private List<Subject> testSubjects;
    private List<Note> testNotes;
    private StudentProfile aidsStudent;
    private StudentProfile cseStudent;

    @BeforeEach
    void setUp() {
        testSubjects = List.of(
                Subject.builder().id("sub-aids-501").name("Database Engineering").department("B.Tech-UAD").semester("SEM 05").build(),
                Subject.builder().id("sub-aids-502").name("Machine Learning").department("B.Tech-UAD").semester("SEM 05").build(),
                Subject.builder().id("sub-aids-401").name("Computer Algorithms").department("B.Tech-UAD").semester("SEM 04").build(),
                Subject.builder().id("sub-cse-501").name("Computer Networks").department("CSE").semester("SEM 05").build(),
                Subject.builder().id("sub-cse-401").name("Data Structures").department("CSE").semester("SEM 04").build()
        );

        testNotes = List.of(
                Note.builder().id("note-1").title("DB Indexing").subjectId("sub-aids-501").department("B.Tech-UAD").semester("SEM 05").unit("Unit 1").status("ready").build(),
                Note.builder().id("note-2").title("ML Regression").subjectId("sub-aids-502").department("B.Tech-UAD").semester("SEM 05").unit("Unit 2").status("ready").build(),
                Note.builder().id("note-3").title("Algo Divide & Conquer").subjectId("sub-aids-401").department("B.Tech-UAD").semester("Sem 4").unit("Unit 1").status("ready").build(),
                Note.builder().id("note-4").title("TCP/IP Stack").subjectId("sub-cse-501").department("CSE").semester("SEM 05").unit("Unit 1").status("ready").build(),
                Note.builder().id("note-5").title("Trees & Graphs").subjectId("sub-cse-401").department("CSE").semester("Sem 4").unit("Unit 2").status("ready").build()
        );

        aidsStudent = new StudentProfile("24UAD022", "Adarsh", null, "24UAD022", "123", "B.Tech-UAD", "SEM 05", "SEC A", "2006-11-22");
        cseStudent = new StudentProfile("24CSE045", "Rohan", null, "24CSE045", "456", "CSE", "SEM 04", "SEC B", "2006-05-15");
    }

    @Test
    void testDynamicFolderDerivation() {
        // Folder IDs derived dynamically using AcademicNormalizer
        List<String> folderKeys = testSubjects.stream()
                .map(s -> AcademicNormalizer.getFolderKey(s.getDepartment(), s.getSemester()))
                .distinct()
                .sorted()
                .collect(Collectors.toList());

        assertEquals(4, folderKeys.size());
        assertTrue(folderKeys.contains("AIDS-S05"));
        assertTrue(folderKeys.contains("AIDS-S04"));
        assertTrue(folderKeys.contains("CSE-S05"));
        assertTrue(folderKeys.contains("CSE-S04"));
    }

    @Test
    void testStudentProfileScopingForAids() {
        String studentDept = aidsStudent.getDepartment();
        String studentSem = aidsStudent.getSemester();
        String targetFolder = AcademicNormalizer.getFolderKey(studentDept, studentSem);

        assertEquals("AIDS-S05", targetFolder);

        // Student in AIDS-S05 should only see notes matching AIDS-S05
        List<Note> scopedNotes = testNotes.stream()
                .filter(n -> AcademicNormalizer.isDepartmentMatch(n.getDepartment(), studentDept) &&
                             AcademicNormalizer.isSemesterMatch(n.getSemester(), studentSem))
                .collect(Collectors.toList());

        assertEquals(2, scopedNotes.size());
        assertTrue(scopedNotes.stream().anyMatch(n -> n.getId().equals("note-1")));
        assertTrue(scopedNotes.stream().anyMatch(n -> n.getId().equals("note-2")));
        // Must NOT see CSE or past semester notes by default
        assertFalse(scopedNotes.stream().anyMatch(n -> n.getId().equals("note-3")));
        assertFalse(scopedNotes.stream().anyMatch(n -> n.getId().equals("note-4")));
        assertFalse(scopedNotes.stream().anyMatch(n -> n.getId().equals("note-5")));
    }

    @Test
    void testStudentProfileScopingForCse() {
        String studentDept = cseStudent.getDepartment();
        String studentSem = cseStudent.getSemester();
        String targetFolder = AcademicNormalizer.getFolderKey(studentDept, studentSem);

        assertEquals("CSE-S04", targetFolder);

        List<Note> scopedNotes = testNotes.stream()
                .filter(n -> AcademicNormalizer.isDepartmentMatch(n.getDepartment(), studentDept) &&
                             AcademicNormalizer.isSemesterMatch(n.getSemester(), studentSem))
                .collect(Collectors.toList());

        assertEquals(1, scopedNotes.size());
        assertEquals("note-5", scopedNotes.get(0).getId());
    }

    @Test
    void testFacultyCanAccessAnyFolderExplicitly() {
        // Faculty querying CSE-S05 folder
        String queryFolder = "CSE-S05";
        String[] parts = queryFolder.split("-");
        String qDept = parts[0];
        String qSem = parts[1];

        List<Note> folderNotes = testNotes.stream()
                .filter(n -> AcademicNormalizer.isDepartmentMatch(n.getDepartment(), qDept) &&
                             AcademicNormalizer.isSemesterMatch(n.getSemester(), qSem))
                .collect(Collectors.toList());

        assertEquals(1, folderNotes.size());
        assertEquals("note-4", folderNotes.get(0).getId());
    }

    @Test
    void testCrossSemesterStringNormalizationInMatching() {
        // Note 3 has semester "Sem 4", query is "SEM 04"
        assertTrue(AcademicNormalizer.isSemesterMatch("Sem 4", "SEM 04"));
        // Note 3 has dept "B.Tech-UAD", query is "AIDS"
        assertTrue(AcademicNormalizer.isDepartmentMatch("B.Tech-UAD", "AIDS"));

        List<Note> matched = testNotes.stream()
                .filter(n -> AcademicNormalizer.isDepartmentMatch(n.getDepartment(), "AIDS") &&
                             AcademicNormalizer.isSemesterMatch(n.getSemester(), "SEM 04"))
                .collect(Collectors.toList());

        assertEquals(1, matched.size());
        assertEquals("note-3", matched.get(0).getId());
    }

    @Test
    void testApiControllerStudentCannotBypassScopingWithFolderParam() {
        com.eduvault.repository.LocalJsonDatabase mockDb = org.mockito.Mockito.mock(com.eduvault.repository.LocalJsonDatabase.class);
        org.mockito.Mockito.when(mockDb.getProfile("24UAD022")).thenReturn(aidsStudent);
        org.mockito.Mockito.when(mockDb.getAllNotes()).thenReturn(testNotes);
        org.mockito.Mockito.when(mockDb.getAllSubjects()).thenReturn(testSubjects);

        ApiController controller = new ApiController();
        org.springframework.test.util.ReflectionTestUtils.setField(controller, "database", mockDb);

        // Student tries to request CSE-S05 folder
        org.springframework.http.ResponseEntity<List<Note>> res = controller.getNotes(
                null, null, null, null, null, null, null, "CSE-S05", null, "24UAD022", "student"
        );

        assertNotNull(res.getBody());
        assertEquals(0, res.getBody().size(), "Student must receive empty list when attempting cross-department query");
    }

    @Test
    void testApiControllerStudentScopedOnlyToTheirProfileFolder() {
        com.eduvault.repository.LocalJsonDatabase mockDb = org.mockito.Mockito.mock(com.eduvault.repository.LocalJsonDatabase.class);
        org.mockito.Mockito.when(mockDb.getProfile("24UAD022")).thenReturn(aidsStudent);
        org.mockito.Mockito.when(mockDb.getAllNotes()).thenReturn(testNotes);
        org.mockito.Mockito.when(mockDb.getAllSubjects()).thenReturn(testSubjects);

        ApiController controller = new ApiController();
        org.springframework.test.util.ReflectionTestUtils.setField(controller, "database", mockDb);

        // AIDS-S05 student queries without params
        org.springframework.http.ResponseEntity<List<Note>> res = controller.getNotes(
                null, null, null, null, null, null, null, null, "24UAD022", null, "student"
        );

        assertNotNull(res.getBody());
        // AIDS-S05 student sees own AIDS-S05 notes + allied CSE-S05 notes (cross-department subjects like Software Engineering)
        assertEquals(3, res.getBody().size());
        assertTrue(res.getBody().stream().anyMatch(n -> n.getId().equals("note-1")));
        assertTrue(res.getBody().stream().anyMatch(n -> n.getId().equals("note-2")));
        assertTrue(res.getBody().stream().anyMatch(n -> n.getId().equals("note-4"))); // CSE-S05 allied
    }

    @Test
    void testApiControllerNullDepartmentNotesDoNotLeakToDepartmentQueries() {
        List<Note> notesWithOrphans = new ArrayList<>(testNotes);
        notesWithOrphans.add(Note.builder().id("orphan-1").title("Unknown Note").subjectId(null).department(null).semester(null).build());

        com.eduvault.repository.LocalJsonDatabase mockDb = org.mockito.Mockito.mock(com.eduvault.repository.LocalJsonDatabase.class);
        org.mockito.Mockito.when(mockDb.getProfile("24UAD022")).thenReturn(aidsStudent);
        org.mockito.Mockito.when(mockDb.getAllNotes()).thenReturn(notesWithOrphans);
        org.mockito.Mockito.when(mockDb.getAllSubjects()).thenReturn(testSubjects);

        ApiController controller = new ApiController();
        org.springframework.test.util.ReflectionTestUtils.setField(controller, "database", mockDb);

        // AIDS-S05 student notes query
        org.springframework.http.ResponseEntity<List<Note>> res = controller.getNotes(
                null, null, null, null, null, null, null, null, "24UAD022", null, "student"
        );

        assertNotNull(res.getBody());
        // Must NOT contain orphan note with null department/semester
        assertFalse(res.getBody().stream().anyMatch(n -> n.getId().equals("orphan-1")));
    }

    @Test
    void testApiControllerFacultyCanAccessAnyFolderExplicitly() {
        com.eduvault.repository.LocalJsonDatabase mockDb = org.mockito.Mockito.mock(com.eduvault.repository.LocalJsonDatabase.class);
        org.mockito.Mockito.when(mockDb.getAllNotes()).thenReturn(testNotes);
        org.mockito.Mockito.when(mockDb.getAllSubjects()).thenReturn(testSubjects);

        ApiController controller = new ApiController();
        org.springframework.test.util.ReflectionTestUtils.setField(controller, "database", mockDb);

        // Faculty querying CSE-S05
        org.springframework.http.ResponseEntity<List<Note>> res = controller.getNotes(
                null, null, null, null, null, null, null, "CSE-S05", null, null, "teacher"
        );

        assertNotNull(res.getBody());
        // CSE-S05 folder returns CSE-S05 notes + allied AIDS-S05 notes
        assertEquals(3, res.getBody().size());
        assertTrue(res.getBody().stream().anyMatch(n -> n.getId().equals("note-4")));
        assertTrue(res.getBody().stream().anyMatch(n -> n.getId().equals("note-1")));
        assertTrue(res.getBody().stream().anyMatch(n -> n.getId().equals("note-2")));

        // Faculty querying AIDS-S04
        org.springframework.http.ResponseEntity<List<Note>> resAids4 = controller.getNotes(
                null, null, null, null, null, null, null, "AIDS-S04", null, null, "faculty"
        );

        assertNotNull(resAids4.getBody());
        assertEquals(2, resAids4.getBody().size());
        assertTrue(resAids4.getBody().stream().anyMatch(n -> n.getId().equals("note-3")));
        assertTrue(resAids4.getBody().stream().anyMatch(n -> n.getId().equals("note-5")));
    }
}

