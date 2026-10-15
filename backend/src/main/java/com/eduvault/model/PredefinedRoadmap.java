package com.eduvault.model;

import lombok.Data;
import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.io.Serializable;
import java.util.List;

@Data
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

    public PredefinedRoadmap() {
    }

    public PredefinedRoadmap(String id, String title, String subject, String totalHours, List<Phase> phases) {
        this.id = id;
        this.title = title;
        this.subject = subject;
        this.totalHours = totalHours;
        this.phases = phases;
    }

    @Data
    public static class Phase implements Serializable {
        private String title;
        private boolean critical;
        private List<String> topics;
        private List<Resource> resources;

        public Phase() {
        }

        public Phase(String title, boolean critical, List<String> topics, List<Resource> resources) {
            this.title = title;
            this.critical = critical;
            this.topics = topics;
            this.resources = resources;
        }
    }

    @Data
    public static class Resource implements Serializable {
        private String name;
        private String url;

        public Resource() {
        }

        public Resource(String name, String url) {
            this.name = name;
            this.url = url;
        }
    }
}
