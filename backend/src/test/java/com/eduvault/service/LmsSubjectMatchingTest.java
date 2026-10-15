package com.eduvault.service;

import com.eduvault.model.Subject;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

public class LmsSubjectMatchingTest {

    private LmsScraperService scraperService;
    private List<Subject> semester5Subjects;

    @BeforeEach
    void setUp() {
        scraperService = new LmsScraperService();

        semester5Subjects = List.of(
                Subject.builder().id("sub-db-theory").name("Database Engineering").code("01ADL301").semester("SEM 05").department("B.Tech-UAD").build(),
                Subject.builder().id("sub-db-lab").name("Database Engineering Lab").code("01ADP304").semester("SEM 05").department("B.Tech-UAD").build(),
                Subject.builder().id("sub-ml-theory").name("Machine Learning").code("01ADL302").semester("SEM 05").department("B.Tech-UAD").build(),
                Subject.builder().id("sub-ml-lab").name("Machine Learning using Python Lab").code("01ADP305").semester("SEM 05").department("B.Tech-UAD").build(),
                Subject.builder().id("sub-awt").name("Advanced Web Technology").code("01ADP303").semester("SEM 05").department("B.Tech-UAD").build(),
                Subject.builder().id("sub-fe-theory").name("Feature Engineering").code("01ADL333").semester("SEM 05").department("B.Tech-UAD").build(),
                Subject.builder().id("sub-fe-lab").name("Feature Engineering Lab").code("01ADP336").semester("SEM 05").department("B.Tech-UAD").build(),
                Subject.builder().id("sub-iot-theory").name("IoT Implementation Using Raspberry Pi Boards").code("01ETMDL2301").semester("SEM 05").department("B.Tech-UAD").build(),
                Subject.builder().id("sub-iot-lab").name("IoT Implementation Using Raspberry Pi Boards Lab").code("01ETMDP2302").semester("SEM 05").department("B.Tech-UAD").build()
        );
    }

    @Test
    void testExactCodeMatchPrecedence() {
        Subject s1 = scraperService.matchSubject("01ADL301", "01ADL301 Database Engineering 2024-25", semester5Subjects);
        assertNotNull(s1);
        assertEquals("sub-db-theory", s1.getId());
        assertEquals("01ADL301", s1.getCode());

        Subject s2 = scraperService.matchSubject("01ADP304", "01ADP304 Database Engineering Lab 2024-25", semester5Subjects);
        assertNotNull(s2);
        assertEquals("sub-db-lab", s2.getId());
        assertEquals("01ADP304", s2.getCode());
    }

    @Test
    void testLabVsLectureStrictSeparation() {
        // Even if fullname mentions "Database Engineering", code 01ADL301 must NOT match the lab
        Subject theory = scraperService.matchSubject("01ADL301", "Database Engineering", semester5Subjects);
        assertEquals("sub-db-theory", theory.getId());
        assertNotEquals("sub-db-lab", theory.getId());

        Subject lab = scraperService.matchSubject("01ADP304", "Database Engineering Lab", semester5Subjects);
        assertEquals("sub-db-lab", lab.getId());
        assertNotEquals("sub-db-theory", lab.getId());
    }

    @Test
    void testMachineLearningSeparation() {
        Subject mlTheory = scraperService.matchSubject("01ADL302", "01ADL302 Machine Learning", semester5Subjects);
        assertEquals("sub-ml-theory", mlTheory.getId());

        Subject mlLab = scraperService.matchSubject("01ADP305", "01ADP305 Machine Learning Lab", semester5Subjects);
        assertEquals("sub-ml-lab", mlLab.getId());
    }

    @Test
    void testOlderSemesterAndUnmatchedCoursesNeverForced() {
        // Second Year (SEM 03/04) courses like 02ADL202 (Software Engineering)
        Subject se = scraperService.matchSubject("02ADL202", "02ADL202 Software Engineering", semester5Subjects);
        assertNull(se, "Older semester course 02ADL202 must NOT be force-mapped to SEM 05 subjects");

        Subject ds = scraperService.matchSubject("02ADL203", "Data Structures", semester5Subjects);
        assertNull(ds, "Older semester course Data Structures must NOT be force-mapped");

        Subject unknown = scraperService.matchSubject("UNKNOWN_CODE", "Advanced Robotics", semester5Subjects);
        assertNull(unknown, "Unknown course must return null");
    }

    @Test
    void testLongerNamePrioritizationWhenCodeMissing() {
        // Without code, "Database Engineering Lab" should match Lab, not theory
        Subject labNoCode = scraperService.matchSubject(null, "Database Engineering Lab", semester5Subjects);
        assertNotNull(labNoCode);
        assertEquals("sub-db-lab", labNoCode.getId());

        // Without code, "Machine Learning using Python Lab" should match the lab
        Subject mlLabNoCode = scraperService.matchSubject(null, "Machine Learning using Python Lab", semester5Subjects);
        assertNotNull(mlLabNoCode);
        assertEquals("sub-ml-lab", mlLabNoCode.getId());
    }
}
