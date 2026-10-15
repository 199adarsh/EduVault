package com.eduvault.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data

@NoArgsConstructor
@AllArgsConstructor
public class LmsCredentials {
    private String username;
    private String password;
    private boolean testImport; // if true, only imports 1 course for quick testing
    private List<String> courseIds; // optional list of specific course IDs to import
}
