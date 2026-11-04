# Project: EduVault Overnight OKF Markdown Batch Generation & Fast AI Query Serving

## Architecture
- **Backend (Spring Boot 3.2.4, Java 17/21)**:
  - `com.eduvault.config`: `SchedulingConfig` with `@EnableScheduling` and dedicated task scheduler.
  - `com.eduvault.filter`: `ActivityTrackerFilter` to record HTTP activity and determine idle state.
  - `com.eduvault.service`:
    - `OkfGeneratorService`: Converts raw note text/metadata into Google OKF standard Markdown with YAML frontmatter and builds subject `index.md`.
    - `OkfBatchService`: Coordinates overnight cron (`0 0 2 * * ?`) and idle-triggered batch jobs; provides manual trigger and status monitoring.
    - `OkfKnowledgeService`: Parses and caches OKF Markdown bundles, performs YAML frontmatter topic/tag filtering, and serves high-density context.
  - `com.eduvault.controller`:
    - `OkfBatchController`: Admin endpoints `POST /api/batch/okf/trigger`, `GET /api/batch/okf/status`.
    - `AiController`: Enhanced `POST /api/ai/chat` accepting `subjectId`, routing to `OkfKnowledgeService`.
  - `com.eduvault.model` & `LocalJsonDatabase`:
    - `Note` entity additions: `okfStatus`, `okfFilePath`, `okfCompiledAt`.
- **Frontend (React, Vite, Tailwind CSS)**:
  - `AIAssistant.jsx`: Consumes `subjects` from outlet context, mounts Subject Selector and OKF status badge in Context Header Strip, passes `subjectId` to `/api/ai/chat`.
  - `NotesLibrary.jsx`: Deep-link button to AI Assistant with pre-selected subject.
- **Storage Layer**:
  - Filesystem: `${app.storage.local-dir}/okf/{subjectId}/{noteId}.md` and `index.md`.
  - Optional B2 Sync: `okf/{subjectId}/{noteId}.md`.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Scheduling & Idle Detection Infrastructure | Enable Spring scheduling and in-memory activity tracking for idle execution (>30m no active requests) | M1 | Survey |
| 2 | Google OKF Markdown Generator | Transform extracted note text & metadata into Google OKF standard Markdown with YAML frontmatter and subject index.md | M1 | Survey |
| 3 | Overnight / Idle Batch Processor & Admin API | Background runner with cron + idle trigger, plus POST /api/batch/okf/trigger and GET /api/batch/okf/status | M1 | Survey |
| 4 | Note OKF Status Tracking & Schema Persistence | Add okfStatus, okfFilePath, and okfCompiledAt fields to Note entity and database | M1 | Survey |
| 5 | OKF Frontmatter Filter & Knowledge Service | Parse OKF YAML frontmatter, cache markdown sections in memory, filter by syllabus topics/tags | M2 | Survey |
| 6 | Subject-Aware AI Query Routing | Update POST /api/ai/chat to accept subjectId and route directly to pre-generated OKF Markdown files | M2 | Survey |
| 7 | Frontend Subject Selector & OKF Status Badge | Mount Subject dropdown and OKF readiness pill in AIAssistant.jsx Context Header Strip, pass subjectId | M3 | Survey |
| 8 | Deep-Link Navigation from Notes Library | Link subject cards and note views to AI Assistant with subjectId query parameter | M3 | Survey |
| 9 | Comprehensive E2E Testing Suite | Tiers 1-4 tests verifying upload, batch compilation, frontmatter parsing, query serving, and UI flows | M4 | Survey |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Batch Scheduling, Activity Tracking & OKF Generator | SchedulingConfig, ActivityTrackerFilter, OkfGeneratorService, OkfBatchService, OkfBatchController, Note model updates | none | DONE |
| M2 | Fast OKF Query Routing & Knowledge Service | OkfKnowledgeService, AiController enhancement for subjectId, frontmatter caching and context builder | M1 | DONE |
| M3 | Frontend Subject Selection & UI Integration | AIAssistant.jsx subject selector in Context Header Strip, OKF badge, subjectId API wiring | M2 | DONE |
| M4 | E2E Integration Testing & System Verification | End-to-end tests for batch compilation, query routing, frontmatter validation, and failure handling | M1, M2, M3 | DONE |

## Interface Contracts
### OkfGeneratorService ↔ OkfBatchService
- `OkfGenerationResult generateOkfForNote(Note note, Subject subject)`
- `OkfBundleResult compileSubjectBundle(String subjectId)`
- Error Handling: Catches generation exceptions, marks `okfStatus = "FAILED"`, logs diagnostic error without aborting entire batch.

### OkfBatchController ↔ OkfBatchService
- `POST /api/batch/okf/trigger?subjectId={optional}`: Returns `{ "status": "STARTED" | "QUEUED", "jobId": "..." }`
- `GET /api/batch/okf/status`: Returns `{ "isRunning": boolean, "lastRun": timestamp, "pendingNotes": int, "completedNotes": int, "failedNotes": int }`

### OkfKnowledgeService ↔ AiController
- `Optional<String> buildSubjectKnowledgeContext(String subjectId, String question)`: Parses YAML frontmatter of subject's OKF files, extracts top relevant markdown sections, formats context block.
- Error Handling: If OKF files missing or uncompiled, gracefully falls back to existing note context.

### Frontend AIAssistant ↔ Backend AiController
- Payload: `{ "question": string, "subjectId": string, "unit"?: string, "prn"?: string, "customApiKey"?: string }`
- Response: `{ "answer": string, "source": "OKF_KNOWLEDGE" | "CHAPTER_RAG" | "GENERAL_TUTOR", "subjectId": string }`

## Code Layout
- Backend Source:
  - `backend/src/main/java/com/eduvault/config/SchedulingConfig.java`
  - `backend/src/main/java/com/eduvault/filter/ActivityTrackerFilter.java`
  - `backend/src/main/java/com/eduvault/service/OkfGeneratorService.java`
  - `backend/src/main/java/com/eduvault/service/OkfBatchService.java`
  - `backend/src/main/java/com/eduvault/service/OkfKnowledgeService.java`
  - `backend/src/main/java/com/eduvault/controller/OkfBatchController.java`
  - `backend/src/main/java/com/eduvault/controller/AiController.java`
  - `backend/src/main/java/com/eduvault/model/Note.java`
  - `backend/src/main/java/com/eduvault/repository/LocalJsonDatabase.java`
  - `backend/src/test/java/com/eduvault/service/OkfBatchAndKnowledgeServiceTest.java`
- Frontend Source:
  - `frontend/src/components/Sovereign/AIAssistant.jsx`
  - `frontend/src/components/Sovereign/NotesLibrary.jsx`
