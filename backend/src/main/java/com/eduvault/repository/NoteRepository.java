package com.eduvault.repository;

import com.eduvault.model.Note;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface NoteRepository extends JpaRepository<Note, String> {

    @Query("SELECT n FROM Note n WHERE " +
           "(:subjectId IS NULL OR :subjectId = '' OR n.subjectId = :subjectId) AND " +
           "(:department IS NULL OR :department = '' OR LOWER(n.department) = LOWER(:department)) AND " +
           "(:semester IS NULL OR :semester = '' OR n.semester = :semester) AND " +
           "(:unit IS NULL OR :unit = '' OR LOWER(n.unit) = LOWER(:unit)) AND " +
           "(:examType IS NULL OR :examType = '' OR n.examType = :examType) AND " +
           "(:keyword IS NULL OR :keyword = '' OR LOWER(n.title) LIKE LOWER(CONCAT('%', :keyword, '%'))) AND " +
           "(:search IS NULL OR :search = '' OR " +
           " LOWER(n.title) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           " LOWER(n.department) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           " LOWER(n.semester) LIKE LOWER(CONCAT('%', :search, '%')))")
    List<Note> findByFilters(
            @Param("subjectId") String subjectId,
            @Param("semester") String semester,
            @Param("examType") String examType,
            @Param("keyword") String keyword,
            @Param("search") String search,
            @Param("department") String department,
            @Param("unit") String unit
    );

    boolean existsByMoodleId(String moodleId);

    boolean existsBySourceUrl(String sourceUrl);

    boolean existsByFileUrl(String fileUrl);

    boolean existsByB2ObjectKey(String b2ObjectKey);

    java.util.Optional<Note> findByMoodleId(String moodleId);

    java.util.Optional<Note> findBySourceUrl(String sourceUrl);

    List<Note> findByUploadedBy(String uploadedBy);

    List<Note> findByImportBatchId(String importBatchId);

    void deleteByUploadedBy(String uploadedBy);
}
