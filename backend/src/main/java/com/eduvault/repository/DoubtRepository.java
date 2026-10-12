package com.eduvault.repository;

import com.eduvault.model.Doubt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface DoubtRepository extends JpaRepository<Doubt, String> {
    List<Doubt> findByNoteId(String noteId);
}
