package com.eduvault.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class PgVectorService {

    private static final Logger log = LoggerFactory.getLogger(PgVectorService.class);

    @Autowired(required = false)
    private JdbcTemplate jdbcTemplate;

    public boolean isAvailable() {
        if (jdbcTemplate == null) return false;
        try {
            Integer count = jdbcTemplate.queryForObject("SELECT count(*) FROM pg_extension WHERE extname = 'vector'", Integer.class);
            return count != null && count > 0;
        } catch (Exception e) {
            return false;
        }
    }

    public void saveEmbedding(String noteId, int chunkIndex, String content, float[] vector) {
        if (!isAvailable() || vector == null) return;
        try {
            String vectorStr = formatVector(vector);
            jdbcTemplate.update(
                "INSERT INTO note_embeddings (note_id, chunk_index, content, embedding) VALUES (?, ?, ?, cast(? as vector))",
                noteId, chunkIndex, content, vectorStr
            );
        } catch (Exception e) {
            log.warn("Failed to store pgvector embedding for note {}: {}", noteId, e.getMessage());
        }
    }

    public List<String> searchSimilarChunks(String noteId, float[] queryVector, int limit) {
        List<String> results = new ArrayList<>();
        if (!isAvailable() || queryVector == null) return results;
        try {
            String vectorStr = formatVector(queryVector);
            List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT content FROM note_embeddings WHERE note_id = ? ORDER BY embedding <=> cast(? as vector) LIMIT ?",
                noteId, vectorStr, limit
            );
            for (Map<String, Object> row : rows) {
                Object val = row.get("content");
                if (val != null) results.add(val.toString());
            }
        } catch (Exception e) {
            log.warn("pgvector search failed for note {}: {}", noteId, e.getMessage());
        }
        return results;
    }

    public boolean hasEmbeddings(String noteId) {
        if (!isAvailable()) return false;
        try {
            Integer count = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM note_embeddings WHERE note_id = ?",
                Integer.class,
                noteId
            );
            return count != null && count > 0;
        } catch (Exception e) {
            return false;
        }
    }

    private String formatVector(float[] vector) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < vector.length; i++) {
            sb.append(vector[i]);
            if (i < vector.length - 1) sb.append(",");
        }
        sb.append("]");
        return sb.toString();
    }
}

