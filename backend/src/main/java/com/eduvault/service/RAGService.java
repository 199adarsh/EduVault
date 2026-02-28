package com.eduvault.service;

import com.eduvault.model.Note;
import com.eduvault.repository.LocalJsonDatabase;
import dev.langchain4j.data.document.Metadata;
import java.io.File;
import dev.langchain4j.data.document.Document;
import dev.langchain4j.data.document.DocumentSplitter;
import dev.langchain4j.data.document.splitter.DocumentSplitters;
import dev.langchain4j.data.embedding.Embedding;
import dev.langchain4j.data.segment.TextSegment;
import dev.langchain4j.model.chat.ChatLanguageModel;
import dev.langchain4j.model.embedding.EmbeddingModel;
import dev.langchain4j.model.openai.OpenAiChatModel;
import dev.langchain4j.model.embedding.onnx.allminilml6v2.AllMiniLmL6V2EmbeddingModel;
import dev.langchain4j.store.embedding.EmbeddingMatch;
import dev.langchain4j.store.embedding.EmbeddingStore;
import dev.langchain4j.store.embedding.inmemory.InMemoryEmbeddingStore;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class RAGService {

    private static final Logger logger = LoggerFactory.getLogger(RAGService.class);

    @Value("${app.groq.api-key:}")
    private String apiKey;

    @Value("${app.storage.local-dir}")
    private String storageDir;

    private EmbeddingModel embeddingModel;
    private ChatLanguageModel chatModel;
    private EmbeddingStore<TextSegment> embeddingStore;

    @Autowired
    private LocalJsonDatabase database;

    @PostConstruct
    public void init() {
        try {
            String effectiveApiKey = getEffectiveApiKey();
            logger.info("Groq API key configured successfully");
            
            // Use local embedding model since Groq doesn't provide one
            this.embeddingModel = new AllMiniLmL6V2EmbeddingModel();

            this.chatModel = OpenAiChatModel.builder()
                    .baseUrl("https://api.groq.com/openai/v1/")
                    .apiKey(effectiveApiKey)
                    .modelName("llama-3.1-8b-instant")
                    .temperature(0.2)
                    .build();

            this.embeddingStore = new InMemoryEmbeddingStore<>();
            loadStore();

            try {
                Embedding dummy = embeddingModel.embed("test").content();
                if (embeddingStore.findRelevant(dummy, 1).isEmpty()) {
                    logger.info("RAG store empty, auto-ingesting existing notes...");
                    List<Note> allNotes = database.getAllNotes();
                    for (int i = 0; i < Math.min(allNotes.size(), 3); i++) {
                        ingestNote(allNotes.get(i).getId());
                    }
                }
            } catch (Exception e) {
                logger.warn("Auto-ingestion failed: {}", e.getMessage());
            }
        } catch (IllegalStateException e) {
            logger.warn("Groq API key not configured - RAG features will be disabled. Set GROQ_API_KEY environment variable.");
            this.embeddingModel = null;
            this.chatModel = null;
            this.embeddingStore = new InMemoryEmbeddingStore<>();
            loadStore();
        }
    }

    private String getEffectiveApiKey() {
        if (apiKey != null && !apiKey.trim().isEmpty() && !apiKey.equals("${GROQ_API_KEY:}")) {
            return apiKey;
        }
        throw new IllegalStateException("GROQ_API_KEY is not configured.");
    }

    private void loadStore() {
        try {
            Path path = Paths.get(storageDir, "vector_store.json");
            File file = path.toFile();
            if (file.exists()) {
                this.embeddingStore = InMemoryEmbeddingStore.fromFile(path);
                logger.info("Loaded vector store from {}", path);
            }
        } catch (Exception e) {
            logger.warn("Could not load vector store, starting fresh: {}", e.getMessage());
        }
    }

    private void saveStore() {
        try {
            Path path = Paths.get(storageDir, "vector_store.json");
            ((InMemoryEmbeddingStore<TextSegment>) embeddingStore).serializeToFile(path);
        } catch (Exception e) {
            logger.error("Failed to save vector store", e);
        }
    }

    @Async("ragTaskExecutor")
    public void ingestNote(String noteId) {
        if (embeddingModel == null) {
            logger.warn("RAG ingestion skipped for note {} - no embedding model available", noteId);
            return;
        }
        
        database.getNoteById(noteId).ifPresent(note -> {
            String text = note.getExtractedText();
            if (text == null || text.trim().isEmpty()) return;

            logger.info("Starting RAG ingestion for note: {}", note.getTitle());
            
            Document document = Document.from(text, Metadata.from("noteId", noteId));
            DocumentSplitter splitter = DocumentSplitters.recursive(400, 50);
            List<TextSegment> segments = splitter.split(document);
            
            int successCount = 0;
            int failedCount = 0;

            for (TextSegment segment : segments) {
                try {
                    Embedding embedding = embeddingModel.embed(segment).content();
                    embeddingStore.add(embedding, segment);
                    successCount++;
                } catch (Exception e) {
                    logger.error("Failed to embed segment for note {} (segment {}/{})", noteId, successCount + failedCount + 1, segments.size(), e);
                    failedCount++;
                }
            }
            
            saveStore();
            logger.info("Completed RAG ingestion for note {}. Success: {}, Failed: {}", noteId, successCount, failedCount);
        });
    }

    public String askChapter(String question, String noteId) {
        logger.info("RAG query for noteId {}: {}", noteId, question);
        
        if (embeddingModel == null || chatModel == null) {
            return "{\"answer\": \"AI features are not available. Please configure GROQ_API_KEY environment variable.\", \"confidence\": 0.0}";
        }
        
        try {
            Embedding questionEmbedding;
            try {
                questionEmbedding = embeddingModel.embed(question).content();
            } catch (Exception e) {
                logger.error("Failed to embed question: {}", question, e);
                return "{\"answer\": \"Sorry, the AI embedding service is currently unavailable.\", \"confidence\": 0.0}";
            }

            if (embeddingStore == null) {
                return "{\"answer\": \"AI Knowledge base not initialized.\", \"confidence\": 0.0}";
            }
            
            List<EmbeddingMatch<TextSegment>> matches = embeddingStore.findRelevant(questionEmbedding, 20);
            
            boolean hasEmbeddings = matches.stream()
                    .anyMatch(m -> noteId.equals(m.embedded().metadata().getString("noteId")));
            
            if (!hasEmbeddings) {
                logger.info("NoteId {} not indexed. Ingesting now...", noteId);
                ingestNote(noteId);
                matches = embeddingStore.findRelevant(questionEmbedding, 20);
            }

            // High-confidence matches (score > 0.55) — return directly without LLM
            List<EmbeddingMatch<TextSegment>> noteMatches = matches.stream()
                    .filter(m -> noteId.equals(m.embedded().metadata().getString("noteId")))
                    .limit(5)
                    .collect(Collectors.toList());

            if (noteMatches.isEmpty()) {
                return "{\"answer\": \"I couldn't find relevant information in this chapter.\", \"confidence\": 0.0}";
            }

            double topScore = noteMatches.get(0).score();
            logger.info("Top match score for '{}': {}", question, topScore);

            List<TextSegment> filtered = noteMatches.stream()
                    .filter(m -> m.score() > 0.3)
                    .limit(3)
                    .map(EmbeddingMatch::embedded)
                    .collect(Collectors.toList());

            if (filtered.isEmpty()) {
                return "{\"answer\": \"I couldn't find relevant information in this chapter.\", \"confidence\": 0.0}";
            }

            // If top score is high enough, skip LLM and return raw chunks directly
            if (topScore > 0.55) {
                StringBuilder directAnswer = new StringBuilder();
                for (TextSegment segment : filtered) {
                    directAnswer.append(segment.text()).append("\n\n");
                }
                String escapedAnswer = directAnswer.toString().trim()
                    .replace("\\", "\\\\")
                    .replace("\"", "\\\"")
                    .replace("\n", "\\n")
                    .replace("\r", "\\r")
                    .replace("\t", "\\t");
                return "{\"answer\": \"" + escapedAnswer + "\", \"confidence\": " + String.format("%.2f", topScore) + "}";
            }

            // Low-confidence matches — use LLM to synthesize a proper answer
            StringBuilder context = new StringBuilder();
            for (TextSegment segment : filtered) {
                context.append(segment.text()).append("\n\n");
            }

            String prompt = "Answer ONLY from the context below. If not found, say 'Not found in notes.'\n\n" +
                    "Context:\n" + context + "\nQuestion: " + question +
                    "\n\nReturn JSON: {\"answer\": \"...\", \"confidence\": 0.0-1.0}";

            try {
                String response = chatModel.generate(prompt);
                String cleaned = response.trim();
                if (cleaned.contains("```json")) {
                    cleaned = cleaned.substring(cleaned.indexOf("```json") + 7);
                    if (cleaned.contains("```")) cleaned = cleaned.substring(0, cleaned.indexOf("```"));
                } else if (cleaned.startsWith("```")) {
                    cleaned = cleaned.substring(3);
                    if (cleaned.contains("```")) cleaned = cleaned.substring(0, cleaned.indexOf("```"));
                }
                return cleaned.trim();
            } catch (Exception e) {
                logger.warn("LLM fallback failed, returning raw chunks: {}", e.getMessage());
                StringBuilder fallback = new StringBuilder();
                for (TextSegment segment : filtered) {
                    fallback.append(segment.text()).append("\n\n");
                }
                String escapedAnswer = fallback.toString().trim()
                    .replace("\\", "\\\\")
                    .replace("\"", "\\\"")
                    .replace("\n", "\\n")
                    .replace("\r", "\\r")
                    .replace("\t", "\\t");
                return "{\"answer\": \"" + escapedAnswer + "\", \"confidence\": 0.5}";
            }
        } catch (Exception e) {
            logger.error("Critical error in askChapter", e);
            return "{\"answer\": \"Internal error processing your question.\", \"confidence\": 0.0}";
        }
    }
}
