# EduVault API Endpoints Inventory

> **Audit Date:** October 2026  
> **Backend Framework:** Spring Boot 3.2.4 (Java 17)  
> **Total Confirmed Endpoints:** 34  
> **Controllers Inspected:** 5  

---

## Table of Contents
1. [Overview & Endpoint Summary](#overview--endpoint-summary)
2. [ApiController (`/api`)](#1-apicontroller-route-prefix-api)
3. [AiController (`/api/ai`)](#2-aicontroller-route-prefix-apiai)
4. [PortalController (`/api/portal`)](#3-portalcontroller-route-prefix-apiportal)
5. [LmsController (`/api/lms`)](#4-lmscontroller-route-prefix-apilms)
6. [OptimizationController (`/api/optimization`)](#5-optimizationcontroller-route-prefix-apioptimization)
7. [Frontend-to-Backend Route Mapping Matrix](#frontend-to-backend-route-mapping-matrix)
8. [Orphaned and Mismatched Endpoints](#orphaned-and-mismatched-endpoints)

---

## Overview & Endpoint Summary

All application endpoints are served under the Spring Boot server port (configured via `PORT`, default `8081`). Controller-level annotations provide `@CrossOrigin(origins = "*")` and global CORS mapping in [EduVaultApplication.java](file:///c:/Users/OMKAR/Desktop/EduVault/backend/src/main/java/com/eduvault/EduVaultApplication.java) configures `http://localhost:5173`.

| Controller Class | Route Prefix | Endpoint Count | Purpose |
|---|---|:---:|---|
| [ApiController.java](file:///c:/Users/OMKAR/Desktop/EduVault/backend/src/main/java/com/eduvault/controller/ApiController.java) | `/api` | 27 | Core academic vault: subjects, profiles, notes, file delivery, doubts, PYQs, announcements, roadmaps, and timeline. |
| [AiController.java](file:///c:/Users/OMKAR/Desktop/EduVault/backend/src/main/java/com/eduvault/controller/AiController.java) | `/api/ai` | 3 | AI Tutor chat (RAG + general LLM), study guide generation, and study roadmap generation. |
| [PortalController.java](file:///c:/Users/OMKAR/Desktop/EduVault/backend/src/main/java/com/eduvault/controller/PortalController.java) | `/api/portal` | 1 | Institutional parent/student portal web scraping and synchronization. |
| [LmsController.java](file:///c:/Users/OMKAR/Desktop/EduVault/backend/src/main/java/com/eduvault/controller/LmsController.java) | `/api/lms` | 2 | Campus Moodle LMS course discovery and automated lecture notes synchronization. |
| [OptimizationController.java](file:///c:/Users/OMKAR/Desktop/EduVault/backend/src/main/java/com/eduvault/controller/OptimizationController.java) | `/api/optimization` | 1 | Attendance target calculation and greedy simulation algorithm. |
| **Total** | | **34** | |

---

## 1. ApiController (Route Prefix: `/api`)

**Controller File:** [ApiController.java](file:///c:/Users/OMKAR/Desktop/EduVault/backend/src/main/java/com/eduvault/controller/ApiController.java)  
**Base Path:** `/api`

### 1.1 `GET /api/subjects`
- **Method Handler:** `public ResponseEntity<List<Subject>> getSubjects()`
- **Purpose:** Retrieves all academic subjects. Automatically filters by the active student profile's department and semester if profile data exists.
- **Request Parameters:** None.
- **Request Body:** None.
- **Response Format:** `200 OK` with JSON array of `Subject` objects:
  ```json
  [
    {
      "id": "sub-1",
      "name": "Operating Systems",
      "department": "B.Tech-UAD",
      "semester": "SEM 04",
      "createdAt": "2023-10-01",
      "noteCount": 4,
      "attendance": "84.5",
      "cie": "18",
      "totalConducted": 30,
      "totalAttended": 25,
      "totalScheduled": 36,
      "stillToGo": 6,
      "detailedAttendance": []
    }
  ]
  ```
- **Authentication:** Public / No session token required (reads local student profile from database).
- **Frontend Caller:** 
  - [SovereignLayout.jsx](file:///c:/Users/OMKAR/Desktop/EduVault/frontend/src/components/Sovereign/SovereignLayout.jsx) (`fetchData`)
  - [DashboardLayout.jsx](file:///c:/Users/OMKAR/Desktop/EduVault/frontend/src/DashboardLayout.jsx) (`fetchSubjects` - legacy)

---

### 1.2 `GET /api/profile`
- **Method Handler:** `public ResponseEntity<StudentProfile> getProfile()`
- **Purpose:** Returns the active student's profile information (name, PRN, DOB, roll number, ABC ID, department, semester, section, profile image URL).
- **Request Parameters:** None.
- **Request Body:** None.
- **Response Format:** `200 OK` with `StudentProfile` JSON:
  ```json
  {
    "prn": "24UAD022",
    "name": "HERWADE ADARSH ABHIJIT",
    "image": "https://online.dkte.ac.in/newparents/images/comprofiler/...",
    "rollNo": "24UAD022",
    "abcId": "893889434921",
    "department": "B.Tech-UAD",
    "semester": "SEM 05",
    "section": "SEC A",
    "dob": "22-11-2006"
  }
  ```
- **Authentication:** Public.
- **Frontend Caller:**
  - [SovereignLayout.jsx](file:///c:/Users/OMKAR/Desktop/EduVault/frontend/src/components/Sovereign/SovereignLayout.jsx) (`fetchData`)
  - [QuickStatsPanel.jsx](file:///c:/Users/OMKAR/Desktop/EduVault/frontend/src/components/QuickStatsPanel.jsx)
  - [UploadModal.jsx](file:///c:/Users/OMKAR/Desktop/EduVault/frontend/src/components/UploadModal.jsx)

---

### 1.3 `POST /api/profile`
- **Method Handler:** `public ResponseEntity<StudentProfile> updateProfile(@RequestBody StudentProfile profile)`
- **Purpose:** Creates or updates the student profile record in database. Assigns `"DEFAULT_PRN"` if PRN is null/empty.
- **Request Body:**
  ```json
  {
    "prn": "24UAD022",
    "dob": "22-11-2006",
    "name": "HERWADE ADARSH ABHIJIT",
    "department": "B.Tech-UAD",
    "semester": "SEM 05"
  }
  ```
- **Response Format:** `200 OK` with updated `StudentProfile` object.
- **Authentication:** Public.
- **Frontend Caller:**
  - [HomeDashboard.jsx](file:///c:/Users/OMKAR/Desktop/EduVault/frontend/src/components/Sovereign/HomeDashboard.jsx) (`handleLoginSubmit`)
  - [ProfilePanel.jsx](file:///c:/Users/OMKAR/Desktop/EduVault/frontend/src/components/ProfilePanel.jsx)

---

### 1.4 `POST /api/profile/logout`
- **Method Handler:** `public ResponseEntity<Void> logoutProfile()`
- **Purpose:** Logs out the student by wiping `student_profiles` and `subjects` records from the persistent database.
- **Request Parameters / Body:** None.
- **Response Format:** `200 OK` with empty body.
- **Authentication:** Public.
- **Frontend Caller:**
  - [SovereignSidebar.jsx](file:///c:/Users/OMKAR/Desktop/EduVault/frontend/src/components/Sovereign/SovereignSidebar.jsx) (`handleLogout`)

---

### 1.5 `POST /api/subjects`
- **Method Handler:** `public ResponseEntity<Subject> createSubject(@RequestBody Map<String, String> payload)`
- **Purpose:** Manually creates a new subject record with generated UUID. Automatically populates department from active student profile.
- **Request Body:**
  ```json
  {
    "name": "Distributed Computing",
    "semester": "SEM 05"
  }
  ```
- **Validation:** Returns `400 Bad Request` if `name` or `semester` is null or empty.
- **Response Format:** `200 OK` with created `Subject` object.
- **Authentication:** Public.
- **Frontend Caller:**
  - [UploadModal.jsx](file:///c:/Users/OMKAR/Desktop/EduVault/frontend/src/components/UploadModal.jsx) (`handleAddSubject`)

---

### 1.6 `GET /api/notes`
- **Method Handler:** `public ResponseEntity<List<Note>> getNotes(...)`
- **Purpose:** Retrieves study notes with dynamic filtering.
- **Query Parameters:**
  - `subjectId` (optional, string)
  - `examType` (optional, string: `"mid-sem"`, `"end-sem"`, etc.)
  - `keyword` (optional, string)
  - `search` (optional, string)
  - `unit` (optional, string: `"Unit 1"`, etc.)
- **Response Format:** `200 OK` with JSON array of `Note` objects.
- **Authentication:** Public.
- **Frontend Caller:**
  - [SovereignLayout.jsx](file:///c:/Users/OMKAR/Desktop/EduVault/frontend/src/components/Sovereign/SovereignLayout.jsx) (`fetchData`)
  - [QuickStatsPanel.jsx](file:///c:/Users/OMKAR/Desktop/EduVault/frontend/src/components/QuickStatsPanel.jsx)

---

### 1.7 `GET /api/notes/{id}`
- **Method Handler:** `public ResponseEntity<Note> getNote(@PathVariable String id)`
- **Purpose:** Fetches full metadata and extracted text content for a single note.
- **Path Variable:** `id` (string, UUID).
- **Response Format:** `200 OK` with `Note` JSON or `404 Not Found`.
- **Authentication:** Public.
- **Frontend Caller:**
  - [NoteDetail.jsx](file:///c:/Users/OMKAR/Desktop/EduVault/frontend/src/components/NoteDetail.jsx) (`fetchNoteData`)
  - [NoteInsightsPanel.jsx](file:///c:/Users/OMKAR/Desktop/EduVault/frontend/src/components/NoteInsightsPanel.jsx)

---

### 1.8 `PUT /api/notes/{id}/tags`
- **Method Handler:** `public ResponseEntity<Note> updateNoteTags(@PathVariable String id, @RequestBody Map<String, List<String>> payload)`
- **Purpose:** Updates user-defined classification tags on an existing note.
- **Path Variable:** `id` (string).
- **Request Body:**
  ```json
  {
    "tags": ["Unit 1", "Algorithms", "Important"]
  }
  ```
- **Response Format:** `200 OK` with updated `Note` or `404 Not Found`.
- **Authentication:** Public.
- **Frontend Caller:**
  - [NoteInsightsPanel.jsx](file:///c:/Users/OMKAR/Desktop/EduVault/frontend/src/components/NoteInsightsPanel.jsx) (`handleSaveTags`)

---

### 1.9 `DELETE /api/notes/{id}`
- **Method Handler:** `public ResponseEntity<Map<String, String>> deleteNote(@PathVariable String id)`
- **Purpose:** Deletes note record from database, cleans up Backblaze B2 object, and deletes local backup file.
- **Path Variable:** `id` (string).
- **Response Format:** `200 OK`:
  ```json
  { "message": "Note deleted successfully" }
  ```
  or `404 Not Found`.
- **Authentication:** Public.
- **Frontend Caller:**
  - [NoteInsightsPanel.jsx](file:///c:/Users/OMKAR/Desktop/EduVault/frontend/src/components/NoteInsightsPanel.jsx) (`handleDelete`)

---

### 1.10 `GET /api/files/{noteId}`
- **Method Handler:** `public ResponseEntity<Map<String, String>> downloadFile(@PathVariable String noteId)`
- **Purpose:** Returns a direct download or presigned viewing URL for the file linked to `noteId`.
- **Path Variable:** `noteId` (string).
- **Response Format:** `200 OK`:
  ```json
  {
    "noteId": "note-123",
    "url": "https://s3.us-east-005.backblazeb2.com/eduvault/uuid.pdf?X-Amz-Signature=..."
  }
  ```
- **Authentication:** Public.
- **Frontend Caller:**
  - [NotesFeed.jsx](file:///c:/Users/OMKAR/Desktop/EduVault/frontend/src/components/NotesFeed.jsx) (via `window.open`)
  - [NoteInsightsPanel.jsx](file:///c:/Users/OMKAR/Desktop/EduVault/frontend/src/components/NoteInsightsPanel.jsx)

---

### 1.11 `GET /api/files/raw/{fileName}`
- **Method Handler:** `public ResponseEntity<Resource> getRawFile(@PathVariable String fileName)`
- **Purpose:** Streams file directly from local storage directory (`./data`). Used as offline fallback when cloud storage is unavailable.
- **Path Variable:** `fileName` (string, filename on disk).
- **Response Header:** `Content-Disposition: inline; filename="<fileName>"`, dynamic MIME type.
- **Authentication:** Public.
- **Frontend Caller:**
  - [NoteDetail.jsx](file:///c:/Users/OMKAR/Desktop/EduVault/frontend/src/components/NoteDetail.jsx) (blob loader fallback)

---

### 1.12 `GET /api/files/{noteId}/presigned`
- **Method Handler:** `public ResponseEntity<Map<String, String>> getPresignedUrl(@PathVariable String noteId)`
- **Purpose:** Generates a secure, time-limited presigned GET URL for a Backblaze B2 object (default validity: 60 minutes).
- **Path Variable:** `noteId` (string).
- **Response Format:** `200 OK`:
  ```json
  {
    "noteId": "note-123",
    "url": "https://s3.us-east-005.backblazeb2.com/eduvault/uuid.pdf?X-Amz-Algorithm=..."
  }
  ```
- **Authentication:** Public.
- **Frontend Caller:**
  - [NoteDetail.jsx](file:///c:/Users/OMKAR/Desktop/EduVault/frontend/src/components/NoteDetail.jsx) (`fetchNoteData`)
  - [NotesFeed.jsx](file:///c:/Users/OMKAR/Desktop/EduVault/frontend/src/components/NotesFeed.jsx)

---

### 1.13 `POST /api/notes/upload`
- **Method Handler:** `public ResponseEntity<Map<String, String>> uploadNote(...)`
- **Purpose:** Accepts file upload (`multipart/form-data`), extracts text in-memory using PDFBox/POI, uploads file to Backblaze B2, saves Note record, and triggers async Groq AI topic/question generation and LangChain4j RAG vector ingestion.
- **Request Parameters (Multipart):**
  - `file`: MultipartFile (binary)
  - `title`: string
  - `subjectId`: string
  - `unit`: string (optional, default: `"Unit 1"`)
  - `examType`: string (optional, default: `"mid-sem"`)
  - `tags`: string (optional JSON array string)
  - `uploaderName`: string (optional, default: `"Anonymous"`)
- **Response Format:** `200 OK`:
  ```json
  {
    "noteId": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Module 3 - File Systems",
    "status": "processing"
  }
  ```
  *(Includes `"warning"` key if text extraction produced no text for scanned/image PDFs).*
- **Authentication:** Public.
- **Frontend Caller:**
  - [UploadNotesView.jsx](file:///c:/Users/OMKAR/Desktop/EduVault/frontend/src/components/UploadNotesView.jsx) (`handleUploadSubmit`)
  - [UploadModal.jsx](file:///c:/Users/OMKAR/Desktop/EduVault/frontend/src/components/UploadModal.jsx)

---

### 1.14 `GET /api/notes/{id}/doubts`
- **Method Handler:** `public ResponseEntity<List<Doubt>> getDoubts(@PathVariable String id)`
- **Purpose:** Retrieves all student doubts associated with the specified note ID.
- **Path Variable:** `id` (string, noteId).
- **Response Format:** `200 OK` with JSON array of `Doubt` objects.
- **Authentication:** Public.
- **Frontend Caller:**
  - [NoteDetail.jsx](file:///c:/Users/OMKAR/Desktop/EduVault/frontend/src/components/NoteDetail.jsx) (`fetchNoteData`)

---

### 1.15 `POST /api/notes/{id}/doubts`
- **Method Handler:** `public ResponseEntity<Doubt> addDoubt(@PathVariable String id, @RequestBody Map<String, String> payload)`
- **Purpose:** Posts a student doubt question on a note.
- **Path Variable:** `id` (string, noteId).
- **Request Body:**
  ```json
  {
    "question": "What is the difference between preemptive and non-preemptive scheduling?",
    "studentName": "Adarsh"
  }
  ```
- **Response Format:** `200 OK` with newly created `Doubt` object.
- **Authentication:** Public.
- **Frontend Caller:**
  - [NoteDetail.jsx](file:///c:/Users/OMKAR/Desktop/EduVault/frontend/src/components/NoteDetail.jsx) (`handlePostDoubt`)

---

### 1.16 `GET /api/pyqs`
- **Method Handler:** `public ResponseEntity<List<PYQ>> getPyqs(@RequestParam(required=false) String subjectId, @RequestParam(required=false) String examType)`
- **Purpose:** Retrieves Previous Year Question papers filtered by subject ID and exam type (`"MSE"`, `"ESE"`).
- **Query Parameters:** `subjectId`, `examType`.
- **Response Format:** `200 OK` with JSON array of `PYQ` objects.
- **Authentication:** Public.
- **Frontend Caller:**
  - [PYQsDatabase.jsx](file:///c:/Users/OMKAR/Desktop/EduVault/frontend/src/components/Sovereign/PYQsDatabase.jsx) (`fetchPyqs`)

---

### 1.17 `POST /api/pyqs`
- **Method Handler:** `public ResponseEntity<PYQ> uploadPyq(@RequestBody PYQ pyq)`
- **Purpose:** Ingests a new PYQ record into the database.
- **Request Body:** `PYQ` JSON object.
- **Response Format:** `200 OK` with saved `PYQ` object.
- **Authentication:** Public.
- **Frontend Caller:**
  - [PYQsDatabase.jsx](file:///c:/Users/OMKAR/Desktop/EduVault/frontend/src/components/Sovereign/PYQsDatabase.jsx) (`handleUpload`)

---

### 1.18 `POST /api/pyqs/predict`
- **Method Handler:** `public ResponseEntity<String> predictPyqs(@RequestBody Map<String, String> payload)`
- **Purpose:** Analyzes PYQ and question bank text via Groq LLM to predict exam topics and prioritize questions into High, Medium, and Low buckets.
- **Request Body:**
  ```json
  {
    "pyqText": "Module 1 questions from 2022-2024...",
    "qbText": "Question Bank Unit 1..."
  }
  ```
- **Response Format:** `200 OK` with JSON string:
  ```json
  {
    "guide": [
      {
        "topic": "Process Scheduling",
        "priority": "High",
        "questions": ["Explain Round Robin algorithm", "Calculate average waiting time"]
      }
    ]
  }
  ```
- **Authentication:** Public (requires server-side `GROQ_API_KEY`).
- **Frontend Caller:**
  - [PYQsDatabase.jsx](file:///c:/Users/OMKAR/Desktop/EduVault/frontend/src/components/Sovereign/PYQsDatabase.jsx) (`handlePredict`)

---

### 1.19 `GET /api/announcements`
- **Method Handler:** `public ResponseEntity<List<Announcement>> getAnnouncements()`
- **Purpose:** Retrieves all institutional announcements.
- **Response Format:** `200 OK` with JSON array of `Announcement` objects.
- **Authentication:** Public.
- **Frontend Caller:**
  - [Announcements.jsx](file:///c:/Users/OMKAR/Desktop/EduVault/frontend/src/components/Sovereign/Announcements.jsx) (`fetchAnnouncements`)

---

### 1.20 `GET /api/announcements/recent`
- **Method Handler:** `public ResponseEntity<List<Announcement>> getRecentAnnouncements()`
- **Purpose:** Retrieves the 2 most recent announcements for dashboard overview widgets.
- **Response Format:** `200 OK` with array of max 2 `Announcement` objects.
- **Authentication:** Public.
- **Frontend Caller:**
  - [HomeDashboard.jsx](file:///c:/Users/OMKAR/Desktop/EduVault/frontend/src/components/Sovereign/HomeDashboard.jsx) (`fetchData`)
  - [HomeDashboard.jsx (legacy)](file:///c:/Users/OMKAR/Desktop/EduVault/frontend/src/components/HomeDashboard.jsx)

---

### 1.21 `POST /api/announcements`
- **Method Handler:** `public ResponseEntity<Announcement> createAnnouncement(@RequestBody Announcement announcement)`
- **Purpose:** Creates and broadcasts a new announcement.
- **Request Body:** `Announcement` JSON object.
- **Response Format:** `200 OK` with created announcement.
- **Authentication:** Public.
- **Frontend Caller:**
  - [Announcements.jsx](file:///c:/Users/OMKAR/Desktop/EduVault/frontend/src/components/Sovereign/Announcements.jsx) (`handleCreate`)

---

### 1.22 `GET /api/roadmaps`
- **Method Handler:** `public ResponseEntity<List<PredefinedRoadmap>> getRoadmaps()`
- **Purpose:** Retrieves all structured curriculum roadmaps with YouTube video links (seeded from `seed_roadmaps.json`).
- **Response Format:** `200 OK` with array of `PredefinedRoadmap` objects.
- **Authentication:** Public.
- **Frontend Caller:**
  - [Roadmaps.jsx](file:///c:/Users/OMKAR/Desktop/EduVault/frontend/src/components/Sovereign/Roadmaps.jsx) (`fetchRoadmaps`)

---

### 1.23 `GET /api/roadmaps/{id}`
- **Method Handler:** `public ResponseEntity<PredefinedRoadmap> getRoadmap(@PathVariable String id)`
- **Purpose:** Retrieves a single curriculum roadmap by ID.
- **Path Variable:** `id` (string).
- **Response Format:** `200 OK` or `404 Not Found`.
- **Authentication:** Public.
- **Frontend Caller:** *Uncalled* (Roadmaps.jsx filters in memory).

---

### 1.24 `GET /api/timeline`
- **Method Handler:** `public ResponseEntity<List<TimelineEvent>> getTimeline()`
- **Purpose:** Retrieves all academic timeline milestones (exams, tests, project deadlines).
- **Response Format:** `200 OK` with array of `TimelineEvent` objects.
- **Authentication:** Public.
- **Frontend Caller:**
  - [HomeDashboard.jsx](file:///c:/Users/OMKAR/Desktop/EduVault/frontend/src/components/Sovereign/HomeDashboard.jsx) (`fetchData`)

---

### 1.25 `POST /api/timeline`
- **Method Handler:** `public ResponseEntity<TimelineEvent> createTimelineEvent(@RequestBody TimelineEvent event)`
- **Purpose:** Creates a new academic timeline milestone.
- **Request Body:** `TimelineEvent` JSON.
- **Response Format:** `200 OK` with saved event.
- **Authentication:** Public.
- **Frontend Caller:** *Uncalled* (no UI form currently invokes this).

---

### 1.26 `PUT /api/timeline/{id}`
- **Method Handler:** `public ResponseEntity<TimelineEvent> updateTimelineEvent(@PathVariable String id, @RequestBody TimelineEvent event)`
- **Purpose:** Updates an existing timeline milestone.
- **Path Variable:** `id`.
- **Request Body:** `TimelineEvent` JSON.
- **Response Format:** `200 OK`.
- **Authentication:** Public.
- **Frontend Caller:** *Uncalled*.

---

### 1.27 `DELETE /api/timeline/{id}`
- **Method Handler:** `public ResponseEntity<Map<String, String>> deleteTimelineEvent(@PathVariable String id)`
- **Purpose:** Deletes an academic timeline event by ID.
- **Path Variable:** `id`.
- **Response Format:** `200 OK` (`{ "message": "Event deleted" }`).
- **Authentication:** Public.
- **Frontend Caller:** *Uncalled*.

---

## 2. AiController (Route Prefix: `/api/ai`)

**Controller File:** [AiController.java](file:///c:/Users/OMKAR/Desktop/EduVault/backend/src/main/java/com/eduvault/controller/AiController.java)  
**Base Path:** `/api/ai`

### 2.1 `POST /api/ai/chat`
- **Method Handler:** `public ResponseEntity<?> chat(@RequestBody Map<String, String> request)`
- **Purpose:** Core AI tutor chat endpoint. Two modes:
  1. **Chapter RAG Mode (`noteId` present):** Queries in-process LangChain4j vector store using `AllMiniLmL6V2EmbeddingModel` to retrieve relevant document chunks from the note. If similarity score > 0.55, returns grounded chunks directly; otherwise passes chunks to Groq LLM (`llama-3.1-8b-instant`) to synthesize a grounded answer.
  2. **General Vault Mode (`noteId` absent):** Compiles context from top 3 recent uploaded notes and prompts Groq LLM to answer in 350-400 words.
- **Request Body:**
  ```json
  {
    "question": "What is process synchronization?",
    "noteId": "optional-note-uuid"
  }
  ```
- **Response Format:** `200 OK`:
  ```json
  {
    "answer": "Process synchronization is a mechanism to coordinate execution...",
    "confidence": 0.95
  }
  ```
- **Authentication:** Public (requires `GROQ_API_KEY` configured on backend).
- **Frontend Caller:**
  - [AIAssistant.jsx](file:///c:/Users/OMKAR/Desktop/EduVault/frontend/src/components/Sovereign/AIAssistant.jsx) (`handleSend`)
  - [NoteDetail.jsx](file:///c:/Users/OMKAR/Desktop/EduVault/frontend/src/components/NoteDetail.jsx) (`handleAIChat`)

---

### 2.2 `POST /api/ai/study-guide`
- **Method Handler:** `public ResponseEntity<?> generateStudyGuide(@RequestBody Map<String, String> request)`
- **Purpose:** Calls `GroqService.generateStudyGuide()` to classify questions into priority tiers.
- **Request Body:**
  ```json
  {
    "pyqText": "Previous year questions text...",
    "qbText": "Question bank text..."
  }
  ```
- **Response Format:** `200 OK` with JSON object containing `guide` array.
- **Authentication:** Public (requires `GROQ_API_KEY`).
- **Frontend Caller:**
  - [StudyRoadmapView.jsx](file:///c:/Users/OMKAR/Desktop/EduVault/frontend/src/components/StudyRoadmapView.jsx) (legacy component)

---

### 2.3 `POST /api/ai/roadmap`
- **Method Handler:** `public ResponseEntity<?> generateRoadmap(@RequestBody Map<String, Object> request)`
- **Purpose:** Calls `GroqService.generateRoadmap()` to synthesize a day-by-day exam preparation schedule with milestones.
- **Request Body:**
  ```json
  {
    "subjectsCount": 5,
    "pyqText": "PYQ topics...",
    "qbText": "QB topics...",
    "examDate": "2026-11-15",
    "currentDate": "2026-10-15",
    "daysRemaining": 30
  }
  ```
- **Response Format:** `200 OK`:
  ```json
  {
    "roadmap": [
      {
        "day": "Day 1",
        "date": "2026-10-15",
        "tasks": [
          { "task": "Study Process Scheduling", "completed": false }
        ],
        "milestone": "Complete Unit 1 revision"
      }
    ]
  }
  ```
- **Authentication:** Public (requires `GROQ_API_KEY`).
- **Frontend Caller:**
  - [StudyRoadmapView.jsx](file:///c:/Users/OMKAR/Desktop/EduVault/frontend/src/components/StudyRoadmapView.jsx) (legacy component)

---

## 3. PortalController (Route Prefix: `/api/portal`)

**Controller File:** [PortalController.java](file:///c:/Users/OMKAR/Desktop/EduVault/backend/src/main/java/com/eduvault/controller/PortalController.java)  
**Base Path:** `/api/portal`

### 3.1 `POST /api/portal/dashboard`
- **Method Handler:** `public ResponseEntity<?> getDashboardData(@RequestBody DashboardCredentials credentials)`
- **Purpose:** 
  1. Connects to the DKTE institutional parents portal (`https://online.dkte.ac.in/newparents/`).
  2. Extracts CSRF token and executes form login using student PRN and DOB.
  3. Scrapes student profile (name, image, USN, ABC ID, branch, semester, section).
  4. Scrapes course table, CIE bar chart data, and attendance gauge chart data.
  5. Deep scrapes individual course attendance detail logs.
  6. Automatically saves updated student profile and subjects into Supabase PostgreSQL.
- **Request Body:**
  ```json
  {
    "prn": "24UAD022",
    "dob": "22-11-2006"
  }
  ```
- **Response Format:** `200 OK` with `PortalDashboardResponse`:
  ```json
  {
    "profile": {
      "prn": "24UAD022",
      "name": "HERWADE ADARSH ABHIJIT",
      "image": "https://online.dkte.ac.in/...",
      "rollNo": "24UAD022",
      "department": "B.Tech-UAD",
      "semester": "SEM 05",
      "section": "SEC A"
    },
    "subjects": [
      {
        "code": "UAD501",
        "name": "Operating Systems",
        "attendance": 84,
        "cie": 18,
        "totalConducted": 30,
        "totalAttended": 25,
        "totalScheduled": 36,
        "stillToGo": 6,
        "credit": 3,
        "lecturesPerWeek": 4,
        "detailedAttendance": []
      }
    ]
  }
  ```
- **Authentication:** Authenticates with external college portal using credentials in request body.
- **Frontend Caller:**
  - [HomeDashboard.jsx](file:///c:/Users/OMKAR/Desktop/EduVault/frontend/src/components/Sovereign/HomeDashboard.jsx) (`handleLoginSubmit`)
  - [AttendanceAnalytics.jsx](file:///c:/Users/OMKAR/Desktop/EduVault/frontend/src/components/Sovereign/AttendanceAnalytics.jsx) (`handleBackgroundSync`)
  - [SovereignSidebar.jsx](file:///c:/Users/OMKAR/Desktop/EduVault/frontend/src/components/Sovereign/SovereignSidebar.jsx) (`handleSync`)
  - [ProfilePanel.jsx](file:///c:/Users/OMKAR/Desktop/EduVault/frontend/src/components/ProfilePanel.jsx)
  - [PortalWidget.jsx](file:///c:/Users/OMKAR/Desktop/EduVault/frontend/src/components/PortalWidget.jsx)

---

## 4. LmsController (Route Prefix: `/api/lms`)

**Controller File:** [LmsController.java](file:///c:/Users/OMKAR/Desktop/EduVault/backend/src/main/java/com/eduvault/controller/LmsController.java)  
**Base Path:** `/api/lms`

### 4.1 `POST /api/lms/discover`
- **Method Handler:** `public ResponseEntity<?> discoverCourses(@RequestBody LmsCredentials credentials)`
- **Purpose:** Logs into campus Moodle LMS (`http://150.129.156.169/login/index.php`), extracts Moodle session key (`sesskey`), queries Moodle AJAX endpoint `core_course_get_enrolled_courses_by_timeline_classification`, and returns all courses accessible to the student matched against existing EduVault subjects.
- **Request Body:**
  ```json
  {
    "username": "student_lms_username",
    "password": "student_lms_password"
  }
  ```
- **Response Format:** `200 OK` with JSON array of `DiscoveredCourseInfo`:
  ```json
  [
    {
      "id": "1042",
      "code": "UAD501",
      "fullname": "Operating Systems (2024-25)",
      "shortname": "OS-UAD501",
      "viewurl": "http://150.129.156.169/course/view.php?id=1042",
      "matched": true,
      "matchedSubjectId": "sub-1",
      "matchedSubjectName": "Operating Systems"
    }
  ]
  ```
- **Authentication:** Validates Moodle credentials against campus LMS.
- **Frontend Caller:**
  - [LmsSyncModal.jsx](file:///c:/Users/OMKAR/Desktop/EduVault/frontend/src/components/Sovereign/LmsSyncModal.jsx) (`handleDiscover`)

---

### 4.2 `POST /api/lms/sync`
- **Method Handler:** `public ResponseEntity<?> syncNotes(@RequestBody LmsCredentials credentials)`
- **Purpose:** Fully automated Moodle scraping pipeline:
  1. Authenticates with Moodle LMS.
  2. Discovers enrolled courses.
  3. Crawls sections and activities (`li.activity`).
  4. Downloads resource files (`/mod/resource/view.php`, `/pluginfile.php`) or external resource links (`/mod/url/view.php`).
  5. Stores files in local directory and uploads to Backblaze B2.
  6. Extracts text content for AI indexing.
  7. Creates Note records and mirrors Question Papers into PYQs table.
- **Request Body:**
  ```json
  {
    "username": "student_lms_username",
    "password": "student_lms_password",
    "testImport": false,
    "courseIds": ["1042"]
  }
  ```
- **Response Format:** `200 OK` with `LmsSyncResponse` summary:
  ```json
  {
    "totalDiscoveredCourses": 6,
    "matchedCoursesCount": 5,
    "unmatchedCoursesCount": 1,
    "totalMaterialsFound": 28,
    "importedCount": 24,
    "skippedDuplicatesCount": 4,
    "failureCount": 0,
    "courses": [...],
    "unmatchedCourses": [...],
    "errors": []
  }
  ```
- **Authentication:** Validates Moodle credentials against campus LMS.
- **Frontend Caller:**
  - [LmsSyncModal.jsx](file:///c:/Users/OMKAR/Desktop/EduVault/frontend/src/components/Sovereign/LmsSyncModal.jsx) (`handleSync`)

---

## 5. OptimizationController (Route Prefix: `/api/optimization`)

**Controller File:** [OptimizationController.java](file:///c:/Users/OMKAR/Desktop/EduVault/backend/src/main/java/com/eduvault/controller/OptimizationController.java)  
**Base Path:** `/api/optimization`

### 5.1 `POST /api/optimization/calculate`
- **Method Handler:** `public ResponseEntity<OptimizationOutput> calculateOptimization(@RequestBody Map<String, Object> payload)`
- **Purpose:** Executes a greedy optimization algorithm to determine the minimum number of upcoming lectures a student must attend across all subjects to achieve a target overall attendance percentage (default: 75.0%).
- **Request Body:**
  ```json
  {
    "target": 75.0,
    "subjects": [
      {
        "subjectId": "sub-1",
        "subjectName": "Operating Systems",
        "attended": 20,
        "conducted": 28,
        "remaining": 12
      }
    ]
  }
  ```
- **Response Format:** `200 OK` with `OptimizationOutput`:
  ```json
  {
    "achievable": true,
    "currentGlobalPercentage": 71.4,
    "targetGlobalPercentage": 75.0,
    "totalLecturesToAttend": 5,
    "requiredActionSummary": "Attend 5 specific lectures to secure 75.0%.",
    "riskLevel": "SAFE",
    "subjectBreakdown": [
      {
        "subjectId": "sub-1",
        "subjectName": "Operating Systems",
        "attended": 20,
        "conducted": 28,
        "remaining": 12,
        "toAttend": 5,
        "currentPercentage": 71.4,
        "newPercentage": 75.8
      }
    ]
  }
  ```
- **Authentication:** Public.
- **Frontend Caller:** *Uncalled* (`OptimizationPanel.jsx` performs this calculation client-side).

---

## Frontend-to-Backend Route Mapping Matrix

| Backend Route | HTTP Method | Active Frontend Caller File | Calling Function / Trigger | Status |
|---|---|---|---|---|
| `/api/subjects` | GET | `SovereignLayout.jsx` | `fetchData()` | Confirmed Active |
| `/api/profile` | GET | `SovereignLayout.jsx` | `fetchData()` | Confirmed Active |
| `/api/profile` | POST | `HomeDashboard.jsx` | `handleLoginSubmit()` | Confirmed Active |
| `/api/profile/logout` | POST | `SovereignSidebar.jsx` | `handleLogout()` | Confirmed Active |
| `/api/subjects` | POST | `UploadModal.jsx` | `handleAddSubject()` | Legacy UI Only |
| `/api/notes` | GET | `SovereignLayout.jsx` | `fetchData()` | Confirmed Active |
| `/api/notes/{id}` | GET | `NoteDetail.jsx` | `fetchNoteData()` | Confirmed Active |
| `/api/notes/{id}/tags` | PUT | `NoteInsightsPanel.jsx` | `handleSaveTags()` | Legacy UI Only |
| `/api/notes/{id}` | DELETE | `NoteInsightsPanel.jsx` | `handleDelete()` | Legacy UI Only |
| `/api/files/{noteId}` | GET | `NotesFeed.jsx` | `window.open()` | Legacy UI Only |
| `/api/files/raw/{fileName}` | GET | `NoteDetail.jsx` | `loadBlob()` fallback | Confirmed Active |
| `/api/files/{noteId}/presigned` | GET | `NoteDetail.jsx` | `fetchNoteData()` | Confirmed Active |
| `/api/notes/upload` | POST | `UploadNotesView.jsx` | `handleUploadSubmit()` | Confirmed Active |
| `/api/notes/{id}/doubts` | GET | `NoteDetail.jsx` | `fetchNoteData()` | Confirmed Active |
| `/api/notes/{id}/doubts` | POST | `NoteDetail.jsx` | `handlePostDoubt()` | Confirmed Active |
| `/api/pyqs` | GET | `PYQsDatabase.jsx` | `fetchPyqs()` | Confirmed Active |
| `/api/pyqs` | POST | `PYQsDatabase.jsx` | `handleUpload()` | Confirmed Active |
| `/api/pyqs/predict` | POST | `PYQsDatabase.jsx` | `handlePredict()` | Confirmed Active |
| `/api/announcements` | GET | `Announcements.jsx` | `fetchAnnouncements()` | Confirmed Active |
| `/api/announcements/recent` | GET | `HomeDashboard.jsx` | `fetchData()` | Confirmed Active |
| `/api/announcements` | POST | `Announcements.jsx` | `handleCreate()` | Confirmed Active |
| `/api/roadmaps` | GET | `Roadmaps.jsx` | `fetchRoadmaps()` | Confirmed Active |
| `/api/roadmaps/{id}` | GET | None | In-memory filtering used | Orphaned Backend Endpoint |
| `/api/timeline` | GET | `HomeDashboard.jsx` | `fetchData()` | Confirmed Active |
| `/api/timeline` | POST | None | None | Orphaned Backend Endpoint |
| `/api/timeline/{id}` | PUT | None | None | Orphaned Backend Endpoint |
| `/api/timeline/{id}` | DELETE | None | None | Orphaned Backend Endpoint |
| `/api/ai/chat` | POST | `AIAssistant.jsx`, `NoteDetail.jsx` | `handleSend()`, `handleAIChat()` | Confirmed Active |
| `/api/ai/study-guide` | POST | `StudyRoadmapView.jsx` | `handleGenerate()` | Legacy UI Only |
| `/api/ai/roadmap` | POST | `StudyRoadmapView.jsx` | `handleGenerate()` | Legacy UI Only |
| `/api/portal/dashboard` | POST | `HomeDashboard.jsx`, `AttendanceAnalytics.jsx`, `SovereignSidebar.jsx` | Portal Login & Sync | Confirmed Active |
| `/api/lms/discover` | POST | `LmsSyncModal.jsx` | `handleDiscover()` | Confirmed Active |
| `/api/lms/sync` | POST | `LmsSyncModal.jsx` | `handleSync()` | Confirmed Active |
| `/api/optimization/calculate` | POST | None | Calculated client-side | Orphaned Backend Endpoint |

---

## Orphaned and Mismatched Endpoints

1. **`POST /api/optimization/calculate`**: Fully implemented on backend in `OptimizationController.java` using `AttendanceOptimizationService.java`, but the active frontend (`OptimizationPage.jsx` and `OptimizationPanel.jsx`) runs the optimization calculation client-side in Javascript.
2. **`POST /api/timeline`, `PUT /api/timeline/{id}`, `DELETE /api/timeline/{id}`**: Full CRUD implemented in `ApiController.java` and `TimelineEventRepository.java`, but the frontend only reads events via `GET /api/timeline` on the Home Dashboard.
3. **`GET /api/roadmaps/{id}`**: Implemented on backend, but the frontend loads all roadmaps at once and filters in-memory.
4. **`PUT /api/notes/{id}/tags` and `DELETE /api/notes/{id}`**: Implemented in backend, but only wired in the legacy `NoteInsightsPanel.jsx` component, which is not mounted in the new `Sovereign` route layout.
5. **`POST /api/ai/study-guide` and `POST /api/ai/roadmap`**: Implemented in `AiController.java`, but only wired in legacy `StudyRoadmapView.jsx`. Active roadmaps currently use curated YouTube roadmap playlists loaded from database. Note that study guide prediction is still accessed through `POST /api/pyqs/predict` in `PYQsDatabase.jsx`.
