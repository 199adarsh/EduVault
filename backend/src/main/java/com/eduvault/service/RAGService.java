package com.eduvault.service;

import com.eduvault.model.Note;
import com.eduvault.repository.LocalJsonDatabase;
import dev.langchain4j.data.document.Document;
import dev.langchain4j.data.document.DocumentSplitter;
import dev.langchain4j.data.document.Metadata;
import dev.langchain4j.data.document.splitter.DocumentSplitters;
import dev.langchain4j.data.embedding.Embedding;
import dev.langchain4j.data.segment.TextSegment;
import dev.langchain4j.model.embedding.EmbeddingModel;
import dev.langchain4j.model.embedding.onnx.allminilml6v2.AllMiniLmL6V2EmbeddingModel;
import dev.langchain4j.store.embedding.EmbeddingMatch;
import dev.langchain4j.store.embedding.EmbeddingStore;
import dev.langchain4j.store.embedding.inmemory.InMemoryEmbeddingStore;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.io.File;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class RAGService {

    private static final Logger logger = LoggerFactory.getLogger(RAGService.class);

    @Value("${app.storage.local-dir}")
    private String storageDir;

    private EmbeddingModel embeddingModel;
    private EmbeddingStore<TextSegment> embeddingStore;

    @Autowired
    private GeminiService geminiService;

    @Autowired
    private LocalJsonDatabase database;

    @PostConstruct
    public void init() {
        try {
            logger.info("Initializing RAGService with local ONNX embeddings and Gemini Web2API inference");
            this.embeddingModel = new AllMiniLmL6V2EmbeddingModel();
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
        } catch (Exception e) {
            logger.warn("RAG initialization encountered an issue: {}", e.getMessage());
            this.embeddingModel = null;
            this.embeddingStore = new InMemoryEmbeddingStore<>();
            loadStore();
        }
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

        if (embeddingModel == null) {
            return "{\"answer\": \"AI features are not available. Embedding model not initialized.\", \"confidence\": 0.0}";
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

            StringBuilder context = new StringBuilder();
            for (TextSegment segment : filtered) {
                context.append(segment.text()).append("\n\n");
            }

            String systemInstruction = "You are an expert AI tutor. Answer the student's question based on the provided chapter notes context. Synthesize a clear, detailed, and structured response using markdown formatting. Return JSON: {\"answer\": \"...\", \"confidence\": " + String.format(java.util.Locale.US, "%.2f", Math.max(0.7, topScore)) + "}";
            String prompt = "Context:\n" + context + "\nQuestion: " + question;

            try {
                String response = geminiService.chat(systemInstruction, prompt, 0.2);
                if (response != null && !response.trim().isEmpty()) {
                    return response.trim();
                }
            } catch (Exception e) {
                logger.warn("Gemini Web2API RAG inference failed, falling back to formatted context chunks: {}", e.getMessage());
            }

            // Fallback: Format extracted context clearly
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
            return "{\"answer\": \"" + escapedAnswer + "\", \"confidence\": " + String.format(java.util.Locale.US, "%.2f", Math.min(topScore, 0.85)) + "}";
        } catch (Exception e) {
            logger.error("Critical error in askChapter", e);
            return "{\"answer\": \"Internal error processing your question.\", \"confidence\": 0.0}";
        }
    }
}
