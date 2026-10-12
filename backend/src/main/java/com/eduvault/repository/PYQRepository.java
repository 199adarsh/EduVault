package com.eduvault.repository;

import com.eduvault.model.PYQ;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface PYQRepository extends JpaRepository<PYQ, String> {
    
    @Query("SELECT p FROM PYQ p WHERE " +
           "(:subjectId IS NULL OR :subjectId = '' OR p.subjectId = :subjectId) AND " +
           "(:examType IS NULL OR :examType = '' OR LOWER(p.examType) = LOWER(:examType))")
    List<PYQ> findByFilters(@Param("subjectId") String subjectId, @Param("examType") String examType);
}
