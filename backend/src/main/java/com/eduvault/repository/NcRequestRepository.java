package com.eduvault.repository;

import com.eduvault.model.NcRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NcRequestRepository extends JpaRepository<NcRequest, String> {
    List<NcRequest> findByStudentPrnOrderByCreatedAtDesc(String studentPrn);
    List<NcRequest> findAllByOrderByCreatedAtDesc();
}
