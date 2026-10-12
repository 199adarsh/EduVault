package com.eduvault.repository;

import com.eduvault.model.PredefinedRoadmap;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PredefinedRoadmapRepository extends JpaRepository<PredefinedRoadmap, String> {
}
