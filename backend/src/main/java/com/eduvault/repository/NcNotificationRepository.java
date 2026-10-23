package com.eduvault.repository;

import com.eduvault.model.NcNotification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NcNotificationRepository extends JpaRepository<NcNotification, String> {
    List<NcNotification> findByRecipientPrnOrRecipientRoleOrderByCreatedAtDesc(String recipientPrn, String recipientRole);
}
