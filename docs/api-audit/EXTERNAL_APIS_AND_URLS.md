# External APIs, URLs, and Integrations Audit

> **Audit Date:** October 2026  
> **Repository:** EduVault  
> **Security Protocol:** All credentials, tokens, and private connection strings are protected and marked as `[REDACTED]`.

---

## Executive Summary

The **EduVault** platform bridges institutional academic infrastructure (ERP portal and campus Moodle LMS) with modern cloud services (Supabase PostgreSQL, Backblaze B2, Groq Cloud LLM) and client-side integrations (YouTube, Dicebear, Google Docs Viewer).

| External Service | Category | Endpoint / Base URL | Authentication Mechanism | Status |
|---|---|---|---|---|
| **DKTE Academic Portal** | Institutional Web Scraping | `https://online.dkte.ac.in/newparents/` | Session Cookies (CSRF + Form POST: PRN & DOB) | Confirmed Active |
| **Moodle LMS** | Institutional Web Scraping | `http://150.129.156.169` | Session Cookies (Moodle `logintoken` + `sesskey`) | Confirmed Active |
| **Supabase PostgreSQL** | Relational Database | `db.ydfyfvedgmlcraofwydt.supabase.co:5432` | Username & Password over SSL (`sslmode=require`) | Confirmed Active |
| **Groq Cloud API** | AI / LLM Inference | `https://api.groq.com/openai/v1/chat/completions` | HTTP Bearer Token (`Authorization: Bearer [REDACTED]`) | Confirmed Active (Placeholder locally) |
| **AllMiniLmL6V2 Embeddings** | AI Vector Embeddings | Local JVM / ONNX runtime (`dev.langchain4j`) | None (In-Process) | Confirmed Active |
| **Backblaze B2** | S3-Compatible Cloud Storage | `https://s3.us-east-005.backblazeb2.com` | AWS Signature v4 (`AwsBasicCredentials`) | Confirmed Active (Local fallback) |
| **Dicebear Avatars API** | Profile Avatar Fallback | `https://api.dicebear.com/7.x/avataaars/svg` | Public / None | Confirmed Active |
| **YouTube & NoCookie** | Video Lecture Player | `https://www.youtube-nocookie.com/embed/` | Public / None | Confirmed Active |
| **Google Docs Viewer** | Document Preview Fallback | `https://docs.google.com/gview` | Public / None | Confirmed Active |
| **Google Fonts** | Typography & Icons | `https://fonts.googleapis.com` | Public / None | Confirmed Active |
| **Localtunnel** | Development Proxy | `https://flat-llamas-sneeze.loca.lt` | None | Inactive / Test Artifact |

---

## Detailed External Integrations

### 1. Institutional Academic Portal (DKTE Society)

1. **Service Name:** DKTE Society's Textile and Engineering Institute Parent/Student Portal
2. **Base URLs & Endpoints:**
   - Base URL: `https://online.dkte.ac.in/newparents/`
   - Login URL: `https://online.dkte.ac.in/newparents/index.php`
   - Dashboard URL: `https://online.dkte.ac.in/newparents/index.php?option=com_studentdashboard&controller=studentdashboard&task=dashboard`
   - Dynamic Attendance Links: `https://online.dkte.ac.in/newparents/index.php?option=com_studentdashboard&controller=studentdashboard&task=subjectattendance&subid=...`
3. **Purpose:**
   - Synchronizes student identity profile (name, USN/roll number, ABC ID, branch, semester, section, and profile thumbnail).
   - Scrapes subject attendance percentages, CIE internal marks, and lecture-by-lecture attendance audit records (conducted, attended, still to go).
4. **File & Configuration Key:**
   - Defined in: [PortalScraperService.java](file:///c:/Users/OMKAR/Desktop/EduVault/backend/src/main/java/com/eduvault/service/PortalScraperService.java) (lines 31-35)
   - Configuration key: Hardcoded constant `BASE_URL`.
5. **Configuration Type:** Hardcoded URL with dynamic URL resolution for subject attendance logs.
6. **Authentication Mechanism:**
   - Multi-step session authentication:
     - `GET` to login page to extract dynamic 32-character hex CSRF token (`<input name="[a-f0-9]{32}" value="1">`).
     - Fallback token `52a9b9c958340fd545e2e5b2a7f935ef` if extraction fails.
     - `POST` to `index.php` with `Content-Type: application/x-www-form-urlencoded`.
     - Form fields: `username` (student PRN), `passwd` (DOB normalized into `YYYY-MM-DD` and `DD-MM-YYYY` permutations), `option=com_user`, `task=login`, `remember=No`, and `[csrfToken]=1`.
     - Session state managed via `java.net.CookieManager` (`CookiePolicy.ACCEPT_ALL`).
7. **Verification Status:** Confirmed active in source code. Used during user login and manual sync. Accessible over public internet.

---

### 2. Campus Moodle Learning Management System (LMS)

1. **Service Name:** Institutional Moodle LMS Server
2. **Base URLs & Endpoints:**
   - Base URL: `http://150.129.156.169`
   - Login URL: `http://150.129.156.169/login/index.php`
   - Enrolled Courses URL: `http://150.129.156.169/my/courses.php`
   - Moodle AJAX Gateway: `http://150.129.156.169/lib/ajax/service.php`
   - Course View URL: `http://150.129.156.169/course/view.php?id={id}`
   - Resource File Downloads: `http://150.129.156.169/mod/resource/view.php?id={id}` and `/pluginfile.php/...`
   - External Link Activity: `http://150.129.156.169/mod/url/view.php?id={id}`
3. **Purpose:**
   - Automatically crawls enrolled course modules.
   - Downloads lecture slides, documents, question banks, and assignments (PDF, PPTX, PPT, DOCX, DOC).
   - Ingests documents into EduVault notes archive and mirrors question papers into the PYQ database.
4. **File & Configuration Key:**
   - Defined in: [LmsScraperService.java](file:///c:/Users/OMKAR/Desktop/EduVault/backend/src/main/java/com/eduvault/service/LmsScraperService.java) (lines 34-37)
   - Configuration key: Hardcoded constant `BASE_URL = "http://150.129.156.169"`.
5. **Configuration Type:** Hardcoded private network IP address.
6. **Authentication Mechanism:**
   - Form-based session login:
     - `GET` to `/login/index.php` to parse `input[name=logintoken]`.
     - `POST` to `/login/index.php` with `username`, `password`, `logintoken`, `anchor=`.
     - `GET` to `/my/courses.php` to extract dynamic session key (`"sesskey":"..."`).
     - Session key passed as query parameter to Moodle AJAX endpoint `core_course_get_enrolled_courses_by_timeline_classification`.
     - Cookie management via `java.net.CookieManager`.
7. **Verification Status:** Confirmed active in source code. Note: Target uses a private IP (`150.129.156.169`), requiring connection to campus Wi-Fi or institutional VPN to reach the host.

---

### 3. Supabase Hosted PostgreSQL Database

1. **Service Name:** Supabase PostgreSQL Database (Cloud Hosted)
2. **Base URL / Host:**
   - Host: `db.ydfyfvedgmlcraofwydt.supabase.co`
   - Port: `5432` (Direct connection) / `6543` (Transaction pooler)
   - Database: `postgres`
   - JDBC URL Pattern: `jdbc:postgresql://db.ydfyfvedgmlcraofwydt.supabase.co:5432/postgres?sslmode=require`
3. **Purpose:**
   - Primary relational database for all application entities:
     - `student_profiles`
     - `subjects`
     - `notes` (with JSONB tags, AI topics, AI questions)
     - `doubts`
     - `pyqs`
     - `announcements`
     - `predefined_roadmaps`
     - `timeline_events`
4. **File & Configuration Key:**
   - Properties: [application.properties](file:///c:/Users/OMKAR/Desktop/EduVault/backend/src/main/resources/application.properties)
     - `spring.datasource.url=${SUPABASE_JDBC_URL}`
     - `spring.datasource.username=${SUPABASE_DB_USER}`
     - `spring.datasource.password=${SUPABASE_DB_PASSWORD}`
     - `spring.datasource.driver-class-name=${DB_DRIVER:org.postgresql.Driver}`
   - Schema: [schema.sql](file:///c:/Users/OMKAR/Desktop/EduVault/backend/src/main/resources/schema.sql) and [supabase/migrations/20260801051439_init_schema.sql](file:///c:/Users/OMKAR/Desktop/EduVault/supabase/migrations/20260801051439_init_schema.sql)
5. **Configuration Type:** Environment variable-based (`SUPABASE_JDBC_URL`, `SUPABASE_DB_USER`, `SUPABASE_DB_PASSWORD`).
6. **Authentication Mechanism:** Standard PostgreSQL password authentication over encrypted TLS/SSL connection (`sslmode=require`). Credentials injected at runtime.
7. **Verification Status:** Confirmed configured in local `.env` with live project host.

---

### 4. Groq Cloud AI LLM Service

1. **Service Name:** Groq Cloud API
2. **Base URLs & Endpoints:**
   - Direct HTTP API: `https://api.groq.com/openai/v1/chat/completions`
   - LangChain4j Base URL: `https://api.groq.com/openai/v1/`
3. **Purpose:**
   - Asynchronous topic extraction (top 8 exam-relevant topics per uploaded note).
   - Exam question generation (5 structured questions with difficulty and type).
   - AI Tutor conversational answers (grounded in context, 350-400 words).
   - PYQ and Question Bank study guide generation and question priority classification.
   - Exam preparation study roadmap generation.
4. **File & Configuration Key:**
   - Properties: [application.properties](file:///c:/Users/OMKAR/Desktop/EduVault/backend/src/main/resources/application.properties) (`app.groq.api-key=${GROQ_API_KEY:}`)
   - Service classes: 
     - [GroqService.java](file:///c:/Users/OMKAR/Desktop/EduVault/backend/src/main/java/com/eduvault/service/GroqService.java) (line 46)
     - [RAGService.java](file:///c:/Users/OMKAR/Desktop/EduVault/backend/src/main/java/com/eduvault/service/RAGService.java) (line 60)
     - [AsyncConfig.java](file:///c:/Users/OMKAR/Desktop/EduVault/backend/src/main/java/com/eduvault/config/AsyncConfig.java) (thread pool executor)
5. **Configuration Type:** Endpoint is hardcoded; API key is environment-variable based (`GROQ_API_KEY`).
6. **Model & Integration Details:**
   - Model Name: `llama-3.1-8b-instant`
   - Request Format: OpenAI-compatible JSON (`{ "model": "llama-3.1-8b-instant", "messages": [...], "temperature": 0.2, "response_format": { "type": "json_object" } }`)
   - Authentication: HTTP Bearer Token (`Authorization: Bearer [REDACTED]`)
   - Concurrency & Retry: Thread pool with 2 core / 4 max threads, 50 queue capacity; 3 retries with exponential backoff (1s -> 2s -> 4s) on HTTP 429/5xx errors.
7. **Verification Status:** Implemented and active in code path. Current local `.env` contains placeholder key `your_groq_api_key_here`.

---

### 5. In-Process AllMiniLmL6V2 Embedding Engine

1. **Service Name:** LangChain4j ONNX In-Process Embedding Model
2. **Base URL / Endpoint:** None (Runs locally inside the JVM via ONNX Runtime; no external network calls).
3. **Purpose:** Generates 384-dimensional dense semantic vector embeddings for document text chunks (400 chars, 50 char overlap) and user chat queries in the RAG pipeline.
4. **File & Configuration Key:**
   - Dependency: `dev.langchain4j:langchain4j-embeddings-all-minilm-l6-v2:0.35.0` in [pom.xml](file:///c:/Users/OMKAR/Desktop/EduVault/backend/pom.xml)
   - Service class: [RAGService.java](file:///c:/Users/OMKAR/Desktop/EduVault/backend/src/main/java/com/eduvault/service/RAGService.java) (lines 57, 133-144)
   - Store persistence: `InMemoryEmbeddingStore` serialized to disk at `${app.storage.local-dir}/vector_store.json`.
5. **Configuration Type:** Code-configured Java dependency.
6. **Authentication Mechanism:** None (embedded local inference).
7. **Verification Status:** Confirmed active and tested via local serialized store `backend/data/vector_store.json`.

---

### 6. Backblaze B2 Cloud Storage (S3-Compatible API)

1. **Service Name:** Backblaze B2 Cloud Object Storage
2. **Base URLs & Endpoints:**
   - S3-Compatible Endpoint (Backend): `https://s3.us-east-005.backblazeb2.com`
   - S3-Compatible Endpoint (Frontend CSP): `https://s3.ca-east-006.backblazeb2.com`
   - Bucket Name: `eduvault`
   - Region: `us-east-005`
3. **Purpose:**
   - Primary cloud storage for uploaded documents (PDF, DOCX, PPTX).
   - Generates AWS SigV4 presigned URLs for client-side document viewing and downloads.
4. **File & Configuration Key:**
   - Properties: [application.properties](file:///c:/Users/OMKAR/Desktop/EduVault/backend/src/main/resources/application.properties)
     - `app.b2.access-key-id=${B2_ACCESS_KEY_ID:}`
     - `app.b2.secret-access-key=${B2_SECRET_ACCESS_KEY:}`
     - `app.b2.endpoint=${B2_ENDPOINT:s3.us-east-005.backblazeb2.com}`
     - `app.b2.region=${B2_REGION:us-east-005}`
     - `app.b2.bucket-name=${B2_BUCKET_NAME:eduvault}`
     - `app.b2.presigned-url-expiry-minutes:60`
   - Config Class: [BackblazeConfig.java](file:///c:/Users/OMKAR/Desktop/EduVault/backend/src/main/java/com/eduvault/config/BackblazeConfig.java)
   - Service Class: [BackblazeStorageService.java](file:///c:/Users/OMKAR/Desktop/EduVault/backend/src/main/java/com/eduvault/service/BackblazeStorageService.java)
5. **Configuration Type:** Environment variable-based with defaults.
6. **Authentication Mechanism:** AWS Signature Version 4 via AWS SDK v2 (`software.amazon.awssdk:s3:2.26.27`). Presigned URLs include signed HMAC security query parameters (`X-Amz-Signature`, `X-Amz-Credential`, `X-Amz-Date`, `X-Amz-Expires`).
7. **Verification Status:** Active in code path. Current local `.env` has placeholder credentials. Code includes fallback to local disk storage (`./data`) when B2 upload fails or keys are invalid.
   > **Note on Discrepancy:** `frontend/vite.config.js` CSP allows `s3.ca-east-006.backblazeb2.com`, whereas backend config defaults to `s3.us-east-005.backblazeb2.com`.

---

### 7. Dicebear Avatars API

1. **Service Name:** Dicebear Public SVG Avatar API
2. **Base URL / Endpoint:** `https://api.dicebear.com/7.x/avataaars/svg?seed={name}`
3. **Purpose:** Generates fallback deterministic vector avatars for student profiles when the student portal profile photo is not available or fails to load.
4. **File & Configuration Key:**
   - [HomeDashboard.jsx](file:///c:/Users/OMKAR/Desktop/EduVault/frontend/src/components/Sovereign/HomeDashboard.jsx) (line 496)
   - [AttendanceAnalytics.jsx](file:///c:/Users/OMKAR/Desktop/EduVault/frontend/src/components/Sovereign/AttendanceAnalytics.jsx) (line 207)
   - [PortalWidget.jsx](file:///c:/Users/OMKAR/Desktop/EduVault/frontend/src/components/PortalWidget.jsx) (line 115)
   - [vite.config.js](file:///c:/Users/OMKAR/Desktop/EduVault/frontend/vite.config.js) (`connect-src`)
5. **Configuration Type:** Hardcoded URL template in frontend JSX.
6. **Authentication Mechanism:** Public service (no authentication).
7. **Verification Status:** Confirmed active in frontend.

---

### 8. YouTube Video Player & Thumbnails

1. **Service Name:** YouTube (Google LLC)
2. **Base URLs & Endpoints:**
   - Privacy-enhanced iframe embed: `https://www.youtube-nocookie.com/embed/{videoId}?autoplay=1&rel=0&modestbranding=1&playsinline=1`
   - Standard watch URL: `https://www.youtube.com/watch?v={videoId}`
   - High-quality thumbnail: `https://img.youtube.com/vi/{videoId}/hqdefault.jpg`
   - Medium-quality thumbnail fallback: `https://img.youtube.com/vi/{videoId}/mqdefault.jpg`
3. **Purpose:** Embedded video lecture playback for curated curriculum roadmaps.
4. **File & Configuration Key:**
   - Seed data: [backend/src/main/resources/seed_roadmaps.json](file:///c:/Users/OMKAR/Desktop/EduVault/backend/src/main/resources/seed_roadmaps.json)
   - Frontend component: [Roadmaps.jsx](file:///c:/Users/OMKAR/Desktop/EduVault/frontend/src/components/Sovereign/Roadmaps.jsx) (lines 195, 235, 251)
   - CSP configuration: [vite.config.js](file:///c:/Users/OMKAR/Desktop/EduVault/frontend/vite.config.js) (`frame-src`, `script-src`, `media-src`)
5. **Configuration Type:** URLs seeded into database and parsed dynamically by client.
6. **Authentication Mechanism:** Public.
7. **Verification Status:** Confirmed active in frontend roadmap module.

---

### 9. Google Docs Viewer

1. **Service Name:** Google Docs Viewer Service
2. **Base URL / Endpoint:** `https://docs.google.com/gview?url={presignedUrl}&embedded=true`
3. **Purpose:** In-browser embedded document preview iframe fallback for viewing Office document formats (DOCX, PPTX, PPT) without client-side native rendering.
4. **File & Configuration Key:**
   - [NoteDetail.jsx](file:///c:/Users/OMKAR/Desktop/EduVault/frontend/src/components/NoteDetail.jsx) (line 219)
   - [NotePreviewModal.jsx](file:///c:/Users/OMKAR/Desktop/EduVault/frontend/src/components/NotePreviewModal.jsx) (line 71)
   - [vite.config.js](file:///c:/Users/OMKAR/Desktop/EduVault/frontend/vite.config.js) (`frame-src`)
5. **Configuration Type:** Hardcoded dynamic URL in frontend.
6. **Authentication Mechanism:** Public service; receives signed Backblaze B2 URL as query parameter.
7. **Verification Status:** Confirmed active in note preview/detail views.

---

### 10. Google Fonts & Typography

1. **Service Name:** Google Fonts & Google Material Symbols
2. **URLs:**
   - Stylesheets: `https://fonts.googleapis.com`
   - Font binaries: `https://fonts.gstatic.com`
3. **Purpose:** Web typography and icons (Material Symbols Outlined, Inter).
4. **File:** [index.css](file:///c:/Users/OMKAR/Desktop/EduVault/frontend/src/index.css) (line 1), [vite.config.js](file:///c:/Users/OMKAR/Desktop/EduVault/frontend/vite.config.js) (`font-src`, `style-src`).
5. **Status:** Confirmed active.

---

### 11. CORS and Content Security Policy (CSP)

#### Backend CORS Configuration
- **Defined In:**
  - [application.properties](file:///c:/Users/OMKAR/Desktop/EduVault/backend/src/main/resources/application.properties) (lines 17-20)
  - [EduVaultApplication.java](file:///c:/Users/OMKAR/Desktop/EduVault/backend/src/main/java/com/eduvault/EduVaultApplication.java) (lines 20-31)
  - Controller classes (`@CrossOrigin(origins = "*")`)
- **Allowed Origins:**
  - `http://localhost:3000`
  - `http://localhost:5173` (Vite dev server default)
  - `http://127.0.0.1:5173`
- **Allowed Methods:** `GET`, `POST`, `PUT`, `DELETE`, `OPTIONS`
- **Allowed Headers:** `*`
- **Allow Credentials:** `true`

#### Frontend Content Security Policy (CSP)
- **Defined In:** [vite.config.js](file:///c:/Users/OMKAR/Desktop/EduVault/frontend/vite.config.js) (lines 23-32)
- **Directives:**
  - `default-src 'self'`
  - `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.youtube-nocookie.com https://www.youtube.com`
  - `frame-src 'self' blob: https://www.youtube-nocookie.com https://www.youtube.com https://s3.ca-east-006.backblazeb2.com https://docs.google.com`
  - `img-src 'self' data: blob: https: http:`
  - `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`
  - `font-src 'self' https://fonts.gstatic.com`
  - `connect-src 'self' http://localhost:8081 https://api.dicebear.com https://api.groq.com https://s3.ca-east-006.backblazeb2.com`
  - `media-src 'self' blob: https://www.youtube-nocookie.com https://www.youtube.com`

---

### 12. Localtunnel Proxy (Test Artifact)

1. **URL:** `https://flat-llamas-sneeze.loca.lt`
2. **File:** `backend/lt_url.txt`
3. **Purpose:** Ephemeral tunnel URL generated during local testing to proxy traffic to port 8081.
4. **Status:** Inactive development artifact.
