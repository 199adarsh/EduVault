package com.eduvault.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.io.Serializable;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "predefined_roadmaps")
public class PredefinedRoadmap {
    @Id
    private String id;
    
    private String title;
    private String subject;
    
    @Column(name = "total_hours")
    private String totalHours;
    
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "phases", columnDefinition = "jsonb")
    private List<Phase> phases;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Phase implements Serializable {
        private String title;
        private boolean critical;
        private List<String> topics;
        private List<Resource> resources;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Resource implements Serializable {
        private String name;
        private String url;
    }
}
