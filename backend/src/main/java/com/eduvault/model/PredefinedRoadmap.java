package com.eduvault.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PredefinedRoadmap {
    private String id;
    private String title;
    private String subject;
    private String totalHours;
    private List<Phase> phases;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Phase {
        private String title;
        private boolean critical;
        private List<String> topics;
        private List<Resource> resources;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Resource {
        private String name;
        private String url;
    }
}
