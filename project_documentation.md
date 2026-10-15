# EduVault - Comprehensive Technical Documentation

## 1. Project Name
**EduVault** (Sovereign Edition)

## 2. Project Overview
EduVault is an advanced academic platform and student dashboard designed to integrate Notes, Previous Year Questions (PYQs), dynamic Roadmaps, AI-driven Assistance, Announcements, and Attendance forecasting into a single, unified interface. It follows a "Sovereign" design aesthetic—a premium, minimal, clean, and data-dense UI.

## 3. Problem Statement
Students often struggle with fragmented academic resources—managing notes on one platform, checking attendance on an outdated university portal, and using separate AI tools for doubt resolution. Furthermore, planning attendance to meet university thresholds (e.g., 75%) without failing is often a manual, error-prone guessing game.

## 4. Objective
To create a centralized, deterministic, and highly analytical platform that:
- Consolidates all academic documents (Notes, PYQs).
- Automates attendance forecasting and safe-Skip calculations.
- Provides contextual AI assistance (tutor, study guides, roadmaps) utilizing advanced LLMs and RAG (Retrieval-Augmented Generation).
- Offers a premium, high-density, dark-mode user experience.

## 5. Target Users
University students, educators, and academic professionals who require a data-dense, highly analytical tool to manage their academic lifecycle, track attendance scientifically, and interact with study materials via AI.

## 6. My Role and Responsibilities
*Note: Adapt this section based on your specific contributions.*
- **Full-Stack Architect & Lead Developer**: Designed the end-to-end system architecture.
- **Backend Engineering**: Built the Spring Boot REST API, implemented the RAG pipeline using LangChain4j, integrated Groq API for LLM processing, and developed the web scraping service for the university portal.
- **Frontend Engineering**: Developed the React.js UI using Vite, Tailwind CSS, and Shadcn UI, adhering to the strict "Sovereign" design system. Built the custom Fractional Knapsack algorithm for attendance optimization.
- **AI Integration**: Designed prompts and LLM fallback strategies for doubt resolution, roadmap generation, and automated study guides.

## 7. Project Workflow
1. **User Authentication**: User enters their PRN (Permanent Registration Number) and DOB.
2. **Data Ingestion**: The backend scrapes the university portal to fetch attendance, subjects, and profile data in real-time.
3. **Dashboard Rendering**: The frontend displays a Bento-grid dashboard with high-contrast metrics.
4. **Document Interaction**: Users upload or view Notes/PYQs. The backend parses PDFs/DOCXs, chunks them, and stores vector embeddings.
5. **AI Tutor**: Users ask doubts in the frontend. The backend retrieves relevant chunks (RAG) and queries the Groq LLM to provide a contextual answer.
6. **Attendance Optimization**: Users input their target attendance, and the frontend executes a local algorithm to project "Safe Skips" and required attendances.

## 8. System Architecture
The application follows a Client-Server Microservices-inspired architecture:
- **Presentation Layer (Frontend)**: React.js application running on Vite, providing a highly responsive SPA (Single Page Application).
- **Application Layer (Backend)**: Java Spring Boot application exposing RESTful APIs. It handles business logic, portal scraping, AI orchestration, and file parsing.
- **Data Persistence Layer**: A `LocalJsonDatabase` (for MVP) handling JSON-based storage of notes, doubts, and metadata.
- **AI / Embedding Layer**: LangChain4j integrates a local embedding model (`AllMiniLmL6V2`) for vectorizing documents and calls the Groq API (Llama 3.1) for generation.

## 9. Technology Stack

### Frontend
- **Framework**: React 19, Vite
- **Styling**: Tailwind CSS v4, Framer Motion, GSAP (for animations)
- **UI Components**: Shadcn UI, Radix UI, Lucide React
- **Document Rendering**: React-PDF, Microsoft Office Viewer (via local tunneling for DOCX/PPTX)
- **Routing**: React Router DOM

### Backend
- **Framework**: Java 17, Spring Boot 3.2.4
- **AI/LLM**: LangChain4j, Groq API (Llama 3.1 8B), Local ONNX Embeddings (AllMiniLmL6V2)
- **Document Processing**: Apache PDFBox (PDF), Apache POI (PPTX), XDocReport (DOCX to PDF), Jsoup (HTML)
- **Web Scraping**: Java `HttpClient` with custom CSRF extraction and session management

### Database
- **Primary Store**: Local JSON Database (MVP approach).
- **Vector Store**: In-Memory Embedding Store serialized to `vector_store.json`.
- *(Optional/Future)*: Firebase Admin SDK (dependency exists for future scalability).

### APIs
- **LLM Provider**: Groq API (`https://api.groq.com/openai/v1/`)

## 10. Folder Structure
```text
EduVault/
├── frontend/                 # React UI
│   ├── src/
│   │   ├── components/       # Reusable UI components (Sovereign aesthetic)
│   │   ├── ...               # Hooks, Utilities, Assets
│   ├── package.json
│   └── tailwind.config.js
├── backend/                  # Spring Boot API
│   ├── src/main/java/com/eduvault/
│   │   ├── controller/       # API endpoint definitions (AiController, ApiController, etc.)
│   │   ├── model/            # Data entities (Note, Subject, StudentProfile, etc.)
│   │   ├── repository/       # LocalJsonDatabase implementation
│   │   ├── service/          # Business logic (GroqService, RAGService, PortalScraperService)
│   ├── data/                 # Local JSON storage directory
│   └── pom.xml               # Maven dependencies
├── DESIGN.md                 # UI/UX guidelines
└── SECURITY_SETUP.md         # API key and environment security guidelines
```

## 11. Database Schema (JSON Models)
- **StudentProfile**: `prn`, `name`, `branch`, `semester`
- **Subject**: `id`, `code`, `name`, `attendance`, `totalAttended`, `totalConducted`, `credit`
- **Note / PYQ**: `id`, `title`, `subjectId`, `url`, `extractedText`, `status`, `aiImportantTopics`, `aiGeneratedQuestions`
- **Doubt**: `id`, `noteId`, `question`, `answer`, `timestamp`
- **PredefinedRoadmap**: `id`, `title`, `description`, `topics`, `resources`

## 12. API Endpoints
- **Portal & Auth**:
  - `POST /api/portal/dashboard`: Authenticates via PRN/DOB, scrapes portal, returns dashboard data.
- **Core API (`/api/*`)**:
  - `GET /subjects`, `POST /subjects`: Manage subjects.
  - `GET /notes`, `POST /notes/upload`, `GET /notes/{id}`: Document management.
  - `GET /pyqs`, `POST /pyqs`: PYQ management.
  - `GET /announcements`, `GET /timeline`: Academic updates.
- **AI Integrations (`/api/ai/*`)**:
  - `POST /chat`: RAG-based document Q&A.
  - `POST /study-guide`: Generates a study guide from PYQ and Notes.
  - `POST /roadmap`: Generates a day-by-day exam roadmap.

## 13. Core Features
1. **Portal Scraping & Synchronization**: Automatically logs into the university portal using PRN and DOB, bypassing CSRF tokens, to fetch live attendance and subject data.
2. **RAG-Powered AI Tutor**: Users can ask questions about specific uploaded documents. The system embeds the document locally, performs vector search, and uses Groq to synthesize an answer.
3. **Attendance Optimization Engine (Layer-5)**: A frontend algorithm that calculates exactly how many classes a student needs to attend or can afford to miss (Safe Skips) to hit a target percentage, utilizing a fractional knapsack approach based on subject credits and remaining weeks.
4. **Automated Study Guides & Roadmaps**: The backend parses text from PDFs/PPTXs and asks the LLM to identify top exam topics, generate practice questions, and formulate a day-by-day study schedule before an exam.

## 14. Authentication & Authorization
- **MVP Approach**: Simulated authentication via the university's actual portal. The `PortalScraperService` takes the user's PRN and DOB, fetches the login page to extract the `CSRF token`, and executes a POST request to authenticate against the university server. If successful, it grants access to EduVault.

## 15. Security Measures
- **Environment Variables**: API Keys (Groq) are strictly managed via `.env` files and injected using Spring's `@Value`.
- **Secrets Revocation Handling**: Implemented fail-fast mechanisms and HTTP 403 checks to immediately halt AI processing if the API key is revoked or rate-limited.
- **Input Validation**: Backend guards against empty file uploads and invalid PRN formats.

## 16. State Management
- **Frontend**: Utilizes React Hooks (`useState`, `useEffect`, `useMemo`) for local component state. Persistent user preferences (like target attendance % and excluded subjects) are synchronized with `localStorage` for continuity across sessions.

## 17. Performance Optimizations
- **Local Embeddings**: Instead of sending large text to a cloud embedding API, embeddings are calculated locally using the `AllMiniLmL6V2` ONNX model, saving bandwidth and API costs.
- **Asynchronous Processing**: Note ingestion (text extraction and embedding) is handled asynchronously via Spring's `@Async` (`ragTaskExecutor`, `groqTaskExecutor`) so the user interface isn't blocked during heavy processing.
- **Rate Limit Handling**: Exponential backoff (1s → 2s → 4s) is implemented in `GroqService` to handle HTTP 429 (Too Many Requests) gracefully.
- **Font Caching**: PDFBox font caching is enabled to drastically reduce startup times and log noise during PDF parsing.

## 18. Challenges Faced
1. **Groq API Limitations**: Groq does not currently provide an embedding model, making standard cloud-based RAG impossible out-of-the-box.
2. **Portal Scraping Instability**: The university portal utilizes dynamic CSRF tokens and session expirations.
3. **Attendance Math Complexity**: Calculating future attendance requirements dynamically when the total number of future classes is a moving target.

## 19. Solutions Implemented
1. **Hybrid RAG Pipeline**: Implemented a local ONNX embedding model (`AllMiniLmL6V2`) via LangChain4j for vector math, while utilizing Groq solely for the high-speed Chat completion.
2. **Resilient Scraper**: Built a multi-step HTTP client that first visits the login page, parses the HTML via Jsoup to extract the hidden CSRF token, manages the session cookies, and handles expired session retries.
3. **Fractional Knapsack Algorithm**: Developed `computeEngine` in React, which sorts subjects by "efficiency" (percentage gain per class attended weighted by credit) to mathematically guarantee the optimal path to the target attendance.

## 20. Testing Strategy
- **Backend**: Spring Boot Test framework for unit testing API endpoints and JSON serialization.
- **Scraper Testing**: Manual edge-case testing against various student profiles to ensure CSRF extraction holds up under different network conditions.
- **Frontend**: Component-driven testing, ensuring the optimization math calculates deficits correctly.

## 21. Deployment Process
- **Backend Deployment**: Packaged as a standard Java JAR. Configured to run on platforms like Railway or Render, utilizing Docker (`fc-cache -f -v` added to Dockerfile for PDFBox font caching).
- **Frontend Deployment**: Built using Vite (`npm run build`) and deployed to Vercel/Netlify.
- **Environment Setup**: Provisioning of `.env` files injected at runtime for `GEMINI_API_KEY` (legacy) / `GROQ_API_KEY`.

## 22. Scalability Considerations
- **Concurrency Control**: Defined strict thread pool limits (2 core, 4 max threads for API calls; 1 core, 2 max for embeddings) to prevent memory exhaustion on small server instances.
- **Vector Storage**: Currently utilizing `InMemoryEmbeddingStore` serialized to JSON. For scale, this will be migrated to a dedicated vector database like Pinecone or pgvector.
- **Stateless APIs**: The Spring Boot backend is primarily stateless (aside from the local JSON store), allowing horizontal scaling.

## 23. Future Enhancements
- **Migration to PostgreSQL/MongoDB**: Replace `LocalJsonDatabase` with a robust relational or document database.
- **Dedicated Vector DB**: Move embeddings from local JSON to Pinecone.
- **Push Notifications**: Integrate Firebase Cloud Messaging (FCM) for real-time class announcements and attendance warnings.
- **Social/Collaborative Features**: Allow students to share uploaded notes and custom roadmaps.

## 24. Key Learnings
- Mastered RAG (Retrieval-Augmented Generation) implementation using Java and LangChain4j.
- Gained deep insights into resilient web scraping and session management.
- Learned to handle strict rate limits and asynchronous programming in Spring Boot.
- Enhanced UI/UX skills by adhering strictly to a premium "Sovereign" design system.

## 25. Technical Concepts Used
- **RAG (Retrieval-Augmented Generation)**
- **Web Scraping & CSRF Bypass**
- **Asynchronous Thread Pools**
- **Exponential Backoff Strategy**
- **Fractional Knapsack Algorithm**
- **Glassmorphism UI Design**

## 26. Design Patterns and Best Practices
- **Singleton Pattern**: Used for Database and Service instances via Spring Dependency Injection.
- **Facade Pattern**: `AiController` acts as a facade, hiding the complex orchestration of `RAGService` and `GroqService`.
- **Fail-Fast Principle**: API keys are validated early, and services shut down feature branches rather than failing silently.

## 27. Complete Project Flow (from user action to backend response)
1. **Upload Note**: User uploads a PDF.
2. **API Call**: Frontend sends `multipart/form-data` to `POST /api/notes/upload`.
3. **Text Extraction**: Backend uses Apache PDFBox to extract raw text from the file.
4. **Async Ingestion**: 
   - Note is saved to `LocalJsonDatabase`.
   - Thread pool picks up the text, chunks it into 400-token segments.
   - Local ONNX model creates vectors for each chunk.
   - Vectors are saved to the In-Memory Store.
5. **AI Processing**: 
   - Another thread sends the raw text to Groq API to generate summary topics and questions.
6. **UI Update**: Frontend polls or refreshes to show the document status as "ready", displaying the generated questions and allowing the user to open the AI Chat.

## 28. Important Files and Their Purpose
- `backend/.../service/RAGService.java`: Handles local ONNX embeddings, vector storage, and similarity search for document Q&A.
- `backend/.../service/GroqService.java`: Manages communication with the Groq API, including exponential backoff and rate-limit handling.
- `backend/.../service/PortalScraperService.java`: Scrapes the university portal for attendance/profile data, managing CSRF and cookies.
- `frontend/src/components/OptimizationPanel.jsx`: The frontend engine that computes attendance safe-Skips and projected deficits.
- `DESIGN.md`: The single source of truth for all CSS, spacing, typography, and color tokens for the project.

## 29. Third-Party Services and Integrations
- **Groq API**: For lightning-fast LLM inference (Llama 3.1).
- **LangChain4j**: The orchestration framework for LLMs in Java.
- **Apache PDFBox & POI**: For parsing complex document formats locally.

## 30. Summary of the Entire Project
EduVault successfully modernizes the fragmented student experience by bringing critical data (attendance, subjects) and study materials (notes, PYQs) under one roof. By leveraging a hybrid local-embedding/cloud-LLM architecture, it offers powerful AI features like document Q&A and automated study guides with minimal latency and cost. The project demonstrates strong architectural decisions, resilient API error handling, and a deep focus on providing a premium, highly functional user interface.
