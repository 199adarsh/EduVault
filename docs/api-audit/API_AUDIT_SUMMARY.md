# EduVault Technical Architecture & API Audit Summary

> **Audit Type:** Read-Only Technical Architecture & Security Audit  
> **Prepared For:** Academic Project Technical Report & Faculty Review  
> **Date of Audit:** October 2026  
> **Repository:** EduVault Monorepo  

---

## 1. Key Metrics & Findings Dashboard

```
=============================================================================
                          EDUVAULT AUDIT DASHBOARD
=============================================================================
  Total Confirmed Internal Endpoints    :  34 (across 5 REST Controllers)
  Actively Used in Modern UI            :  24 endpoints
  Legacy / Unlinked Frontend Endpoints  :  5 endpoints
  Orphaned Backend Endpoints (No Caller):  5 endpoints
-----------------------------------------------------------------------------
  External Integrated Services          :  11 services identified
  Total Environment Variables Audited   :  13 root variables (+ 4 in-code properties)
  Fully Configured in Local .env        :  10 variables
  Placeholder / Unconfigured Secrets    :  3 variables (GROQ_API_KEY, B2 keys)
-----------------------------------------------------------------------------
  Security Status                       :  .env NOT committed (CLEAN)
  Privacy Vulnerability Flagged         :  backend/data/profile.json (Committed PRN/DOB)
  Frontend Configuration Status         :  Hardcoded localhost:8081 across 20+ files
=============================================================================
```

---

## 2. Total Confirmed Internal Endpoints Breakdown

| Controller | Source File | Route Prefix | Endpoints | Primary Responsibility |
|---|---|:---:|:---:|---|
| **ApiController** | [ApiController.java](file:///c:/Users/OMKAR/Desktop/EduVault/backend/src/main/java/com/eduvault/controller/ApiController.java) | `/api` | **27** | Subjects, student profiles, notes CRUD, secure presigned file streaming, student doubts, PYQ archives, announcements, curriculum roadmaps, and academic timeline. |
| **AiController** | [AiController.java](file:///c:/Users/OMKAR/Desktop/EduVault/backend/src/main/java/com/eduvault/controller/AiController.java) | `/api/ai` | **3** | AI Academic Tutor (dual-mode: grounded RAG chapter chat and general vault synthesis), study guide generation, and study roadmap synthesis. |
| **PortalController** | [PortalController.java](file:///c:/Users/OMKAR/Desktop/EduVault/backend/src/main/java/com/eduvault/controller/PortalController.java) | `/api/portal` | **1** | Automated web scraping of DKTE parent/student portal (attendance percentages, CIE marks, detailed attendance logs, and profile). |
| **LmsController** | [LmsController.java](file:///c:/Users/OMKAR/Desktop/EduVault/backend/src/main/java/com/eduvault/controller/LmsController.java) | `/api/lms` | **2** | Campus Moodle LMS course discovery and batch synchronization of lecture notes, question banks, and slides. |
| **OptimizationController** | [OptimizationController.java](file:///c:/Users/OMKAR/Desktop/EduVault/backend/src/main/java/com/eduvault/controller/OptimizationController.java) | `/api/optimization` | **1** | Greedy attendance optimization algorithm to compute minimal lecture attendance required for a target percentage. |
| **Grand Total** | | | **34** | |

*(For detailed parameter specifications, request/response bodies, and handler methods, refer to [API_ENDPOINTS.md](file:///c:/Users/OMKAR/Desktop/EduVault/docs/api-audit/API_ENDPOINTS.md)).*

---

## 3. External Services Identified

1. **DKTE Society Student/Parent Academic Portal (`https://online.dkte.ac.in/newparents/`)**:
   - Institutional ERP portal providing official attendance, CIE internal assessment scores, and student enrollment records.
   - Accessed via automated session scraping using student PRN and Date of Birth.
2. **Campus Moodle LMS (`http://150.129.156.169`)**:
   - Institutional learning management system hosting course materials.
   - Scraped via HTTP client with session key handling to download course PDFs, DOCX, and PPT files.
3. **Supabase PostgreSQL Database (`db.ydfyfvedgmlcraofwydt.supabase.co:5432`)**:
   - Managed cloud PostgreSQL instance storing all relational and JSONB entities.
4. **Groq Cloud AI Inference (`https://api.groq.com/openai/v1/chat/completions`)**:
   - High-throughput LLM provider hosting `llama-3.1-8b-instant` for topic extraction, question generation, and tutor responses.
5. **In-Process ONNX Vector Embeddings (`dev.langchain4j`)**:
   - In-JVM sentence-transformers model (`all-minilm-l6-v2`) generating 384-dimensional embeddings for RAG search. Runs locally without external API latency.
6. **Backblaze B2 Object Storage (`https://s3.us-east-005.backblazeb2.com`)**:
   - S3-compatible cloud bucket storing study documents and generating time-limited presigned URLs.
7. **Dicebear Avatars (`https://api.dicebear.com/7.x/avataaars/svg`)**:
   - Public deterministic SVG avatar generator for profile fallbacks.
8. **YouTube Player & NoCookie API (`https://www.youtube-nocookie.com/embed/`)**:
   - Embedded video player for structured topic roadmaps.
9. **Google Docs Viewer (`https://docs.google.com/gview`)**:
   - Document rendering fallback for Office document formats (DOCX/PPTX) in preview iframes.
10. **Google Fonts & Typography (`https://fonts.googleapis.com`)**:
    - Material Symbols Outlined and Inter font stylesheets.
11. **Localtunnel Proxy (`https://flat-llamas-sneeze.loca.lt`)**:
    - Historical testing artifact found in `backend/lt_url.txt`.

*(For complete authentication schemes, headers, and SDK details, refer to [EXTERNAL_APIS_AND_URLS.md](file:///c:/Users/OMKAR/Desktop/EduVault/docs/api-audit/EXTERNAL_APIS_AND_URLS.md)).*

---

## 4. Required Environment Variables & Current Status

| Variable | Role | Current Status | Required Action Before Launch |
|---|---|---|---|
| `SUPABASE_JDBC_URL` | PostgreSQL connection URL | **Configured** | None (active Supabase host present). |
| `SUPABASE_DB_USER` | Database username | **Configured** | None (`postgres`). |
| `SUPABASE_DB_PASSWORD` | Database password | **Configured** | Keep confidential. |
| `GROQ_API_KEY` | Groq LLM API Key | **Placeholder** (`your_groq_api_key_here`) | **Must provide real API key** from Groq Console (`https://console.groq.com`). AI features fail gracefully with warnings until set. |
| `B2_ACCESS_KEY_ID` | Backblaze Application Key ID | **Placeholder** (`your_b2_access_key_id_here`) | **Must provide real B2 Key ID**. Backend currently falls back to storing uploaded files on local disk (`./data`). |
| `B2_SECRET_ACCESS_KEY` | Backblaze Application Key Secret | **Placeholder** (`your_b2_secret_access_key_here`) | **Must provide real B2 Secret Key**. |
| `PORT` | Backend server port | **Configured** (`8081`) | Optional override. |
| `APP_STORAGE_LOCAL_DIR` | Local disk working directory | **Configured** (`./data`) | None. |

*(For the complete variable inventory and property details, refer to [ENVIRONMENT_VARIABLES.md](file:///c:/Users/OMKAR/Desktop/EduVault/docs/api-audit/ENVIRONMENT_VARIABLES.md)).*

---

## 5. Frontend & Backend Route Mismatches

Our cross-examination of backend `@RequestMapping` annotations against frontend `axios` and `fetch` invocations revealed several architectural discrepancies:

1. **Orphaned Optimization Endpoint:**
   - Backend implements `POST /api/optimization/calculate` in `OptimizationController.java` using `AttendanceOptimizationService.java`.
   - The active frontend (`OptimizationPage.jsx` and `OptimizationPanel.jsx`) implements the entire calculation engine client-side in JavaScript (`computeEngine()`), leaving the backend controller unused.
2. **Orphaned Timeline CRUD Endpoints:**
   - Backend provides complete CRUD: `GET /api/timeline`, `POST /api/timeline`, `PUT /api/timeline/{id}`, `DELETE /api/timeline/{id}`.
   - The frontend only reads data (`GET /api/timeline`); there is no UI component or modal for adding, updating, or deleting timeline milestones.
3. **Orphaned Roadmap Detail Endpoint:**
   - Backend provides `GET /api/roadmaps/{id}`.
   - The frontend (`Roadmaps.jsx`) calls `GET /api/roadmaps` once, caches the result, and selects roadmaps in memory.
4. **Legacy vs. Modern UI Disconnect:**
   - `PUT /api/notes/{id}/tags` and `DELETE /api/notes/{id}` are only wired inside [NoteInsightsPanel.jsx](file:///c:/Users/OMKAR/Desktop/EduVault/frontend/src/components/NoteInsightsPanel.jsx), which is part of the legacy `DashboardLayout.jsx` and is not mounted in the new `Sovereign` route layout. Users cannot currently delete notes or edit tags from the modern UI.
   - `POST /api/ai/study-guide` and `POST /api/ai/roadmap` are only wired in legacy [StudyRoadmapView.jsx](file:///c:/Users/OMKAR/Desktop/EduVault/frontend/src/components/StudyRoadmapView.jsx). The modern roadmap view uses curated YouTube playlists.
5. **Hardcoded API Base URL in Frontend:**
   - Over 20 frontend components define `const API_BASE = 'http://localhost:8081/api';`.
   - There is no `VITE_API_BASE_URL` environment variable support in the frontend. Any non-localhost deployment will require editing multiple source files or introducing an API client wrapper.

---

## 6. Security & Privacy Findings

1. **Student Personal Data Committed to Git:**
   - File: [backend/data/profile.json](file:///c:/Users/OMKAR/Desktop/EduVault/backend/data/profile.json) is tracked in Git.
   - Contains a real student's Name, PRN (`24UAD022`), Date of Birth (`22-11-2006`), ABC ID, and photo URL.
   - **Vulnerability:** PRN and DOB represent the active login credentials for the institutional portal. Anyone with repository read access can authenticate as this student on `online.dkte.ac.in`.
   - **Mitigation:** Execute `git rm --cached backend/data/profile.json`, update `.gitignore` to include `backend/data/*.json`, and commit the removal.
2. **Backblaze B2 Region CSP Discrepancy:**
   - `frontend/vite.config.js` restricts frame and connect sources to `https://s3.ca-east-006.backblazeb2.com`.
   - `backend/src/main/resources/application.properties` and `.env` default to `s3.us-east-005.backblazeb2.com`.
   - If Backblaze credentials are configured with `us-east-005`, browser Content Security Policy will block direct client-side requests or presigned URL downloads in production.
3. **Unauthenticated REST Endpoints:**
   - All 34 REST endpoints in the backend lack Spring Security token validation. Any client capable of reaching `localhost:8081` can create notes, delete notes, wipe profiles, or trigger scraping routines.
4. **Root `.env` Protection:**
   - Verified that `.gitignore` correctly ignores `.env`. Git history confirms that root `.env` with actual database secrets has never been committed.

---

## 7. Source Files Inspected

### Backend Source Code
- **Configuration:**
  - `backend/src/main/resources/application.properties`
  - `backend/src/main/resources/schema.sql`
  - `backend/src/main/resources/seed_roadmaps.json`
  - `backend/src/main/java/com/eduvault/EduVaultApplication.java`
  - `backend/src/main/java/com/eduvault/config/AsyncConfig.java`
  - `backend/src/main/java/com/eduvault/config/BackblazeConfig.java`
- **Controllers:**
  - `backend/src/main/java/com/eduvault/controller/ApiController.java`
  - `backend/src/main/java/com/eduvault/controller/AiController.java`
  - `backend/src/main/java/com/eduvault/controller/PortalController.java`
  - `backend/src/main/java/com/eduvault/controller/LmsController.java`
  - `backend/src/main/java/com/eduvault/controller/OptimizationController.java`
- **Services:**
  - `backend/src/main/java/com/eduvault/service/PortalScraperService.java`
  - `backend/src/main/java/com/eduvault/service/LmsScraperService.java`
  - `backend/src/main/java/com/eduvault/service/GroqService.java`
  - `backend/src/main/java/com/eduvault/service/RAGService.java`
  - `backend/src/main/java/com/eduvault/service/BackblazeStorageService.java`
  - `backend/src/main/java/com/eduvault/service/FileStorageService.java`
  - `backend/src/main/java/com/eduvault/service/DocumentConversionService.java`
  - `backend/src/main/java/com/eduvault/service/AttendanceOptimizationService.java`
- **Repositories & Models:**
  - `backend/src/main/java/com/eduvault/repository/LocalJsonDatabase.java`
  - Repositories: `SubjectRepository`, `NoteRepository`, `StudentProfileRepository`, `DoubtRepository`, `PYQRepository`, `AnnouncementRepository`, `PredefinedRoadmapRepository`, `TimelineEventRepository`.
  - All 15 entity and DTO models under `backend/src/main/java/com/eduvault/model/`.

### Frontend Source Code
- `frontend/package.json`
- `frontend/vite.config.js`
- `frontend/src/App.jsx`
- `frontend/src/components/Sovereign/SovereignLayout.jsx`
- `frontend/src/components/Sovereign/SovereignSidebar.jsx`
- `frontend/src/components/Sovereign/HomeDashboard.jsx`
- `frontend/src/components/Sovereign/NotesLibrary.jsx`
- `frontend/src/components/Sovereign/PYQsDatabase.jsx`
- `frontend/src/components/Sovereign/Roadmaps.jsx`
- `frontend/src/components/Sovereign/AIAssistant.jsx`
- `frontend/src/components/Sovereign/Announcements.jsx`
- `frontend/src/components/Sovereign/AttendanceAnalytics.jsx`
- `frontend/src/components/Sovereign/OptimizationPage.jsx`
- `frontend/src/components/Sovereign/LmsSyncModal.jsx`
- `frontend/src/components/NoteDetail.jsx`
- `frontend/src/components/UploadNotesView.jsx`
- `frontend/src/components/OptimizationPanel.jsx`
- Legacy components: `DashboardLayout.jsx`, `UploadModal.jsx`, `NotesFeed.jsx`, `NoteInsightsPanel.jsx`, `StudyRoadmapView.jsx`, `PortalWidget.jsx`, `ProfilePanel.jsx`.

### Infrastructure & Scripts
- `.env` and `.env.example`
- `.gitignore`
- `run-backend.ps1`
- `supabase/migrations/20260801051439_init_schema.sql`

---

## 8. Verification Limitations

1. **Read-Only Scope:** This audit did not execute runtime live requests or submit data to external services.
2. **Campus Moodle LMS Accessibility:** The host `http://150.129.156.169` is an internal private IP address and could not be pinged or reached outside the college intranet/VPN.
3. **Placeholder Cloud Credentials:** Because `GROQ_API_KEY`, `B2_ACCESS_KEY_ID`, and `B2_SECRET_ACCESS_KEY` contain template placeholders in the local `.env`, live round-trip testing against Groq and Backblaze B2 could not be executed during this audit.
4. **Local Network Assumptions:** Frontend assumes the backend is always reachable at `http://localhost:8081`. Testing across distributed environments requires configuring reverse proxies or CORS headers.
