package com.eduvault.repository;

import com.eduvault.model.TimelineEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TimelineEventRepository extends JpaRepository<TimelineEvent, String> {
}
