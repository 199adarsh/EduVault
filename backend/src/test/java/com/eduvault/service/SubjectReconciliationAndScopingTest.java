package com.eduvault.service;

import com.eduvault.controller.ApiController;
import com.eduvault.model.DashboardSubject;
import com.eduvault.model.Note;
import com.eduvault.model.StudentProfile;
import com.eduvault.model.Subject;
import com.eduvault.repository.LocalJsonDatabase;
import com.eduvault.util.AcademicNormalizer;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

public class SubjectReconciliationAndScopingTest {

    private List<Subject> catalog;
    private StudentProfile sem4Student;

    @BeforeEach
    void setUp() {
        catalog = new ArrayList<>(List.of(
                Subject.builder().id("c502-cse-softeng").name("Software Engineering").code("01CS502").department("CSE").semester("SEM 05").build(),
                Subject.builder().id("sub-uad-maths-ai").name("Mathematics for Artificial Intelligence and Data Science").code("01ADL201").department("B.Tech-UAD").semester("SEM 04").build(),
                Subject.builder().id("sub-uad-mp").name("Microprocessors").code("02ADL204").department("B.Tech-UAD").semester("SEM 04").build(),
                Subject.builder().id("sub-dup-1").name("Algorithms").code("01CS101").department("CSE").semester("SEM 03").build(),
                Subject.builder().id("sub-dup-2").name("Algorithms").code("01AD101").department("B.Tech-UAD").semester("SEM 03").build()
        ));

        sem4Student = new StudentProfile("23UAD001", "Student", null, "23UAD001", "123", "B.Tech-UAD", "SEM 04", "A", "2005-01-01");
    }

    @Test
    void testSubjectMatchingExactCodeFirst() {
        // Exact code takes precedence
        Subject match = AcademicNormalizer.resolveSubject("Different Name", "01CS502", null, catalog);
        assertNotNull(match);
        assertEquals("c502-cse-softeng", match.getId());
    }

    @Test
    void testSubjectMatchingCanonicalIdSecond() {
        // Canonical ID takes precedence over name
        Subject match = AcademicNormalizer.resolveSubject("Wrong Name", null, "sub-uad-maths-ai", catalog);
        assertNotNull(match);
        assertEquals("sub-uad-maths-ai", match.getId());
    }

    @Test
    void testSubjectMatchingNormalizedExactNameWithAndWithoutCode() {
        // Both "Software Engineering (01CS502)" and "Software Engineering" match normalized exact name
        Subject matchWithCode = AcademicNormalizer.resolveSubject("Software Engineering (01CS502)", null, null, catalog);
        assertNotNull(matchWithCode);
        assertEquals("c502-cse-softeng", matchWithCode.getId());

        Subject matchWithoutCode = AcademicNormalizer.resolveSubject("Software Engineering", null, null, catalog);
        assertNotNull(matchWithoutCode);
        assertEquals("c502-cse-softeng", matchWithoutCode.getId());
    }

    @Test
    void testSubjectMatchingRejectsAmbiguousMatches() {
        // "Algorithms" has 2 entries in catalog -> ambiguous -> must reject (return null)
        Subject match = AcademicNormalizer.resolveSubject("Algorithms", null, null, catalog);
        assertNull(match, "Ambiguous normalized name match must be rejected to prevent incorrect binding");
    }

    @Test
    void testSubjectMatchingReturnsNullForUnmatchedWithoutDetachedId() {
        // Unmatched subject must return null, never auto-generate a detached ID
        Subject match = AcademicNormalizer.resolveSubject("Completely Unknown Subject", "99XYZ999", "unknown-id", catalog);
        assertNull(match);
    }

    @Test
    void testSemesterMismatchAllowsAccessForEnrolledSubject() {
        LocalJsonDatabase mockDb = mock(LocalJsonDatabase.class);
        when(mockDb.getProfile("23UAD001")).thenReturn(sem4Student);
        when(mockDb.getAllSubjects()).thenReturn(catalog);

        // Note is cataloged as SEM 05 and CSE, but student is SEM 04 and AIDS
        Note seNote = Note.builder()
                .id("note-se-1")
                .title("Software Eng Unit 1")
                .subjectId("c502-cse-softeng")
                .department("CSE")
                .semester("SEM 05")
                .status("ready")
                .build();
        when(mockDb.getAllNotes()).thenReturn(List.of(seNote));

        ApiController controller = new ApiController();
        ReflectionTestUtils.setField(controller, "database", mockDb);

        // Student passes enrolled subject ID "c502-cse-softeng"
        ResponseEntity<List<Note>> response = controller.getNotes(
                null, null, null, null, null, null, null, null, "23UAD001", null, "student", "c502-cse-softeng"
        );

        assertNotNull(response.getBody());
        assertEquals(1, response.getBody().size(), "Enrolled student must receive notes despite semester mismatch");
        assertEquals("note-se-1", response.getBody().get(0).getId());
    }

    @Test
    void testFailedScrapeDoesNotDeactivateExistingCatalog() {
        LocalJsonDatabase database = new LocalJsonDatabase();
        com.eduvault.repository.SubjectRepository mockRepo = mock(com.eduvault.repository.SubjectRepository.class);
        when(mockRepo.findAll()).thenReturn(new ArrayList<>(catalog));
        ReflectionTestUtils.setField(database, "subjectRepository", mockRepo);

        // Partial or empty scraped subjects
        List<DashboardSubject> emptyScrape = new ArrayList<>();
        database.registerSubjectsCatalog(emptyScrape, "B.Tech-UAD", "SEM 04");

        // Verify no deletes or clear operations were invoked on existing catalog
        verify(mockRepo, never()).deleteAll();
        verify(mockRepo, never()).delete(any());
        verify(mockRepo, never()).deleteById(any());
    }
}

