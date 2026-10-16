# EduVault Environment Variables and Configuration Audit

> **Audit Date:** October 2026  
> **Security Protocol:** Confidential credentials, passwords, and private tokens are masked as `[REDACTED]`. Secret values are never stored or printed in documentation.

---

## 1. Master Environment Variables Inventory Table

| Variable Name | Purpose | Used In | Required / Optional | Configuration Status in Local `.env` | Secret? |
|---|---|---|:---:|---|:---:|
| `SUPABASE_JDBC_URL` | PostgreSQL JDBC connection URL pointing to Supabase cloud instance with SSL mode required. | [application.properties](file:///c:/Users/OMKAR/Desktop/EduVault/backend/src/main/resources/application.properties) (`spring.datasource.url`), [run-backend.ps1](file:///c:/Users/OMKAR/Desktop/EduVault/run-backend.ps1) | **Required** | **Configured** (Valid live Supabase URL string present) | **YES** (Contains DB host & DB name) |
| `SUPABASE_DB_USER` | Database role username for PostgreSQL database connection. | [application.properties](file:///c:/Users/OMKAR/Desktop/EduVault/backend/src/main/resources/application.properties) (`spring.datasource.username`), [run-backend.ps1](file:///c:/Users/OMKAR/Desktop/EduVault/run-backend.ps1) | **Required** | **Configured** (`postgres`) | **Semi-Sensitive** |
| `SUPABASE_DB_PASSWORD` | Password for PostgreSQL user on Supabase instance. | [application.properties](file:///c:/Users/OMKAR/Desktop/EduVault/backend/src/main/resources/application.properties) (`spring.datasource.password`), [run-backend.ps1](file:///c:/Users/OMKAR/Desktop/EduVault/run-backend.ps1) | **Required** | **Configured** (21-character active secret present in local `.env`) | **YES (Confidential Secret)** |
| `DB_DRIVER` | Fully qualified Java class name of the JDBC driver. | [application.properties](file:///c:/Users/OMKAR/Desktop/EduVault/backend/src/main/resources/application.properties) (`spring.datasource.driver-class-name`) | Optional (Default: `org.postgresql.Driver`) | **Configured** (`org.postgresql.Driver`) | No |
| `DDL_AUTO` | Hibernate DDL generation mode (`none`, `validate`, `update`, `create`). | [application.properties](file:///c:/Users/OMKAR/Desktop/EduVault/backend/src/main/resources/application.properties) (`spring.jpa.hibernate.ddl-auto`) | Optional (Default: `none`) | **Configured** (`none`) | No |
| `GROQ_API_KEY` | API token for Groq Cloud inference (Llama 3.1 8B Instant). Powers AI topic extraction, quiz generation, AI tutor chat, and study guides. | [application.properties](file:///c:/Users/OMKAR/Desktop/EduVault/backend/src/main/resources/application.properties) (`app.groq.api-key`), [GroqService.java](file:///c:/Users/OMKAR/Desktop/EduVault/backend/src/main/java/com/eduvault/service/GroqService.java), [RAGService.java](file:///c:/Users/OMKAR/Desktop/EduVault/backend/src/main/java/com/eduvault/service/RAGService.java), [GroqTest.java](file:///c:/Users/OMKAR/Desktop/EduVault/backend/src/main/java/com/eduvault/GroqTest.java) | **Required for AI** (Fails gracefully if missing) | **Placeholder** (`your_groq_api_key_here`) | **YES (Confidential Secret)** |
| `B2_ACCESS_KEY_ID` | Application Key ID for Backblaze B2 S3-compatible cloud storage. | [application.properties](file:///c:/Users/OMKAR/Desktop/EduVault/backend/src/main/resources/application.properties) (`app.b2.access-key-id`), [BackblazeConfig.java](file:///c:/Users/OMKAR/Desktop/EduVault/backend/src/main/java/com/eduvault/config/BackblazeConfig.java) | **Required for Cloud Storage** (Falls back to local disk if unconfigured) | **Placeholder** (`your_b2_access_key_id_here`) | **YES (Confidential Secret)** |
| `B2_SECRET_ACCESS_KEY` | Application Key Secret for Backblaze B2 S3-compatible cloud storage. | [application.properties](file:///c:/Users/OMKAR/Desktop/EduVault/backend/src/main/resources/application.properties) (`app.b2.secret-access-key`), [BackblazeConfig.java](file:///c:/Users/OMKAR/Desktop/EduVault/backend/src/main/java/com/eduvault/config/BackblazeConfig.java) | **Required for Cloud Storage** (Falls back to local disk if unconfigured) | **Placeholder** (`your_b2_secret_access_key_here`) | **YES (Confidential Secret)** |
| `B2_ENDPOINT` | S3-compatible API endpoint host for Backblaze B2 bucket. | [application.properties](file:///c:/Users/OMKAR/Desktop/EduVault/backend/src/main/resources/application.properties) (`app.b2.endpoint`), [BackblazeConfig.java](file:///c:/Users/OMKAR/Desktop/EduVault/backend/src/main/java/com/eduvault/config/BackblazeConfig.java) | Optional (Default: `s3.us-east-005.backblazeb2.com`) | **Configured** (`s3.us-east-005.backblazeb2.com`) | No |
| `B2_REGION` | Storage region for Backblaze B2 bucket. | [application.properties](file:///c:/Users/OMKAR/Desktop/EduVault/backend/src/main/resources/application.properties) (`app.b2.region`), [BackblazeConfig.java](file:///c:/Users/OMKAR/Desktop/EduVault/backend/src/main/java/com/eduvault/config/BackblazeConfig.java) | Optional (Default: `us-east-005`) | **Configured** (`us-east-005`) | No |
| `B2_BUCKET_NAME` | Target bucket name in Backblaze B2 for storing uploaded study materials. | [application.properties](file:///c:/Users/OMKAR/Desktop/EduVault/backend/src/main/resources/application.properties) (`app.b2.bucket-name`), [BackblazeStorageService.java](file:///c:/Users/OMKAR/Desktop/EduVault/backend/src/main/java/com/eduvault/service/BackblazeStorageService.java) | Optional (Default: `eduvault`) | **Configured** (`eduvault`) | No |
| `PORT` | HTTP port on which the Spring Boot backend server binds and listens. | [application.properties](file:///c:/Users/OMKAR/Desktop/EduVault/backend/src/main/resources/application.properties) (`server.port`) | Optional (Default: `8081`) | **Configured** (`8081`) | No |
| `APP_STORAGE_LOCAL_DIR` | Local filesystem path used for vector store persistence, file conversion scratchpad, and local storage fallback. | [application.properties](file:///c:/Users/OMKAR/Desktop/EduVault/backend/src/main/resources/application.properties) (`app.storage.local-dir`), [FileStorageService.java](file:///c:/Users/OMKAR/Desktop/EduVault/backend/src/main/java/com/eduvault/service/FileStorageService.java), [RAGService.java](file:///c:/Users/OMKAR/Desktop/EduVault/backend/src/main/java/com/eduvault/service/RAGService.java) | Optional (Default: `./data`) | **Configured** (`./data`) | No |

---

## 2. Additional In-Code Configuration Properties

These properties are defined in code or application configuration with defaults and do not require root `.env` declaration unless custom behavior is desired:

| Configuration Key | Default Value | Defined In | Purpose |
|---|---|---|---|
| `app.b2.presigned-url-expiry-minutes` | `60` | [BackblazeStorageService.java](file:///c:/Users/OMKAR/Desktop/EduVault/backend/src/main/java/com/eduvault/service/BackblazeStorageService.java) (`@Value("${app.b2.presigned-url-expiry-minutes:60}")`) | Duration in minutes for which Backblaze B2 presigned GET URLs remain valid. |
| `spring.jpa.show-sql` | `true` | [application.properties](file:///c:/Users/OMKAR/Desktop/EduVault/backend/src/main/resources/application.properties) | Logs executed SQL statements to standard output for debugging. |
| `spring.web.cors.allowed-origins` | `http://localhost:3000,http://localhost:5173,http://127.0.0.1:5173` | [application.properties](file:///c:/Users/OMKAR/Desktop/EduVault/backend/src/main/resources/application.properties) | Allowed web origins for Cross-Origin Resource Sharing. |
| `spring.application.name` | `eduvault-backend` | [application.properties](file:///c:/Users/OMKAR/Desktop/EduVault/backend/src/main/resources/application.properties) | Spring application identifier. |

---

## 3. Frontend Configuration Audit

| Configuration Item | Status | Observation | Recommendation |
|---|---|---|---|
| Frontend `.env` file | **Missing** | No `.env`, `.env.local`, or `.env.production` file exists in `frontend/`. | Create `frontend/.env.example` and `frontend/.env`. |
| API Base URL (`VITE_API_BASE_URL`) | **Hardcoded** | The URL `http://localhost:8081/api` is hardcoded across 20+ frontend JSX components. | Centralize to `import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081/api'` in a shared API client. |
| Vite Dev Server Port | Default (`5173`) | Runs on default port `5173` per [package.json](file:///c:/Users/OMKAR/Desktop/EduVault/frontend/package.json) scripts. | Documented for local orchestration. |

---

## 4. Obsolete / Legacy Variables

The following variables appear in older project documentation ([SECURITY_SETUP.md](file:///c:/Users/OMKAR/Desktop/EduVault/SECURITY_SETUP.md), [VMS.md](file:///c:/Users/OMKAR/Desktop/EduVault/VMS.md)) from earlier prototype iterations:

| Variable Name | Historical Context | Current Status in Codebase |
|---|---|---|
| `GEMINI_API_KEY` | Used in older Google Gemini prototype before Groq migration. | **Obsolete.** No active Java code references `GEMINI_API_KEY`. Fully replaced by `GROQ_API_KEY` in [GroqService.java](file:///c:/Users/OMKAR/Desktop/EduVault/backend/src/main/java/com/eduvault/service/GroqService.java). |
| `FIREBASE_PROJECT_ID` | Used in older Firebase/Firestore MVP before Supabase PostgreSQL migration. | **Obsolete.** No active Java code connects to Firebase. Fully replaced by Supabase JPA repositories. |
| `FIREBASE_CREDENTIALS_PATH` | Path to service account JSON for Firebase Admin SDK. | **Obsolete.** Commented out in `application.properties` and removed from `pom.xml`. |

---

## 5. Security & Secret Exposure Audit

### 5.1 Git Tracking of Sensitive Files
- **Root `.gitignore` Assessment:**
  - `.env` is correctly excluded by `.gitignore` lines 2-5 (`.env`, `.env*`, `.env.*`, `*.env`, with exception `!.env.example`).
  - Git history verification confirmed that `.env` with actual credentials has **never been committed** to the Git repository.
  - `.env.example` is committed, but contains strictly sanitized template placeholders.

### 5.2 Committed Data & Privacy Findings
- **Flagged Location:** [backend/data/profile.json](file:///c:/Users/OMKAR/Desktop/EduVault/backend/data/profile.json) (tracked in Git history).
  - Contains student personal data including Student Name, PRN (`24UAD022`), Date of Birth (`22-11-2006`), ABC ID, and College Portal photo URL.
  - **Risk:** PRN and DOB constitute the exact authentication credentials for the DKTE institutional parent/student portal.
  - **Recommendation:** Untrack `backend/data/profile.json` using `git rm --cached backend/data/profile.json` and add `backend/data/*.json` to `.gitignore`.

### 5.3 Secret Loading Process
- In local development, [run-backend.ps1](file:///c:/Users/OMKAR/Desktop/EduVault/run-backend.ps1) reads the root `.env` file line-by-line, trims quotes, injects keys into process-level environment variables via `[System.Environment]::SetEnvironmentVariable($key, $value, "Process")`, and executes `mvn spring-boot:run`.
- In production, environment variables should be injected by container runtimes or cloud deployment dashboards (Docker, Railway, AWS ECS, or Render).
