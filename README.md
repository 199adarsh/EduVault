# CampusAxis (EduVault)

A high-performance academic portal for university notes, curriculum roadmaps, PYQs, AI-assisted study tools, and attendance tracking.

---

## Architecture Overview

```
                      +-----------------------------+
                      |     React + Vite Frontend   |
                      +--------------+--------------+
                                     |
                                     v
                      +-----------------------------+
                      |   Spring Boot 3.2.4 Backend |
                      +----+--------+----------+----+
                           |        |          |
            +--------------+        |          +--------------+
            v                       v                         v
+-----------------------+ +--------------------+ +-------------------------+
|  Aiven PostgreSQL 18  | | Cloudflare R2      | | AI Inference Engine     |
|  - pgvector enabled   | | - S3-compatible API| | - Groq API              |
|  - 53 B.Tech-UAD subs | | - Zero-egress fees | | - Gemini Web2API        |
|  - 355 Active Notes   | | - PDF Object Store | | - Vector Cosine Search  |
+-----------------------+ +--------------------+ +-------------------------+
```

---

## Core Components

### 1. Database Layer (Aiven PostgreSQL)
- **Engine**: Managed PostgreSQL 18 with `pgvector` extension.
- **Scope**: Dedicated exclusively to `B.Tech-UAD` curriculum (53 unique subjects, 355 active notes).
- **Optimization**:
  - Aggregated SQL queries replace table scans (reducing egress bandwidth from 3.18 MB to 2 KB).
  - Parameterized queries across all JPA and custom JDBC vector searches.

### 2. Object Storage (Cloudflare R2)
- Replaces legacy cloud buckets to eliminate egress transfer costs entirely.
- S3-compatible API used for uploading, presigning, and streaming note documents.

### 3. Ingestion & Sync Pipeline (LMS / Moodle Scraper)
- **Path**: `LmsScraperService` & `LocalJsonDatabase`.
- **Filtering**: Automatically discovers and registers only `B.Tech-UAD` courses; strictly excludes external branches (Mechanical, Civil, Textile).
- **Safety**: Direct stream-to-storage piping without holding entire PDF byte arrays in JVM heap, preventing out-of-memory errors on small server instances.

### 4. Security Hardening
- **Path Traversal Protection**: Enforced path validation on `/api/files/raw/{*fileName}` rejecting any directory traversal attempts (`..` or `\`).
- **Secret Isolation**: Zero credentials hardcoded in source code; all credentials read from environment variables.

---

## Environment Configuration

| Variable | Description |
| :--- | :--- |
| `DB_JDBC_URL` | JDBC URL for PostgreSQL with `sslmode=require` |
| `DB_USER` | PostgreSQL admin username |
| `DB_PASSWORD` | PostgreSQL password |
| `DB_DRIVER` | Database driver (`org.postgresql.Driver`) |
| `DDL_AUTO` | Hibernate schema management mode (`update` or `none`) |
| `R2_ACCESS_KEY_ID` | Cloudflare R2 S3 access key ID |
| `R2_SECRET_ACCESS_KEY` | Cloudflare R2 S3 secret access key |
| `R2_ENDPOINT` | Cloudflare R2 endpoint URL (`https://<account_id>.r2.cloudflarestorage.com`) |
| `R2_BUCKET_NAME` | R2 bucket name (`campusaxis-notes`) |
| `R2_REGION` | S3 region (`auto`) |
| `GROQ_API_KEY` | Groq Cloud API key for fast LLM inference |
| `GEMINI_BASE_URL` | Gemini Web2API local proxy URL |

---

## Local Development

```bash
# Build backend
cd backend
mvn clean test-compile

# Run backend
mvn spring-boot:run

# Run frontend
cd ../frontend
npm install
npm run dev
```
