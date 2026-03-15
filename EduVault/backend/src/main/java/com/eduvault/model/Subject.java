package com.eduvault.model;

import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Subject {
    private String id;
    private String name;
    private String department;
    private String semester;
    private String createdAt;
    private int noteCount; // Derived field for convenience
}
