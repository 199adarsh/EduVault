package com.eduvault.repository;

import com.eduvault.model.Subject;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SubjectRepository extends JpaRepository<Subject, String> {
    java.util.Optional<Subject> findByCode(String code);
}
