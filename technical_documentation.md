# EduVault Sovereign System - Technical Documentation & Algorithms

This document provides high-level architectural documentation and step-by-step algorithms (pseudo-code) for all core features (excluding standard authentication).

---

## 1. Portal Attendance Sync
**Documentation:** Authenticates with the external college portal, scrapes current attendance records, and caches them locally.
**Algorithm (Web Scraping & Syncing):**
```text
1. Receive Credentials (PRN, DOB).
2. Execute HTTP POST to Portal Login URL using Jsoup.
3. IF Login fails, RETURN 400 Bad Request.
4. Execute HTTP GET to fetch Dashboard HTML.
5. Locate the HTML Table containing attendance data.
6. FOR EACH Row in Table:
     a. Extract: SubjectName, ConductedClasses, AttendedClasses.
     b. Convert to Integers.
     c. Calculate Percentage = (Attended / Conducted) * 100.
     d. Instantiate DashboardSubject Object.
7. Save Profile and Subjects into LocalJsonDatabase.
8. RETURN 200 OK.
```

---

## 2. Attendance Optimization Engine
**Documentation:** Calculates exactly how many lectures a student must attend (or can skip) to hit a specific percentage.
**Algorithm (Greedy Optimization):**
```text
1. Receive List<Subject> and TargetPercentage.
2. Calculate CurrentGlobalAverage.
3. IF CurrentGlobalAverage >= TargetPercentage, RETURN "SAFE".
4. LOOP while SimulatedGlobalAverage < TargetPercentage:
     a. Initialize MaxBenefit = -1, BestSubject = NULL.
     b. FOR EACH Subject where (RemainingClasses > ToAttend):
          i. Simulate attending 1 additional class.
          ii. Calculate hypothetical NewGlobalAverage.
          iii. Benefit = NewGlobalAverage - SimulatedGlobalAverage.
          iv. IF Benefit > MaxBenefit: (MaxBenefit = Benefit, BestSubject = Subject).
     c. IF BestSubject == NULL (no remaining classes), BREAK.
     d. BestSubject.ToAttend += 1.
     e. Update SimulatedGlobalAverage.
5. IF SimulatedGlobalAverage >= TargetPercentage: RETURN "SAFE", TotalLecturesToAttend.
   ELSE: RETURN "CRITICAL", Max Achievable Percentage.
```

---

## 3. Home Dashboard & Heatmap Generation
**Documentation:** Aggregates granular day-by-day attendance records across all subjects into a single GitHub-style activity calendar.
**Algorithm (Heatmap Aggregation):**
```text
1. Receive List<Subject> containing detailed daily attendance logs.
2. Initialize empty Hash Map: `DayMap`.
3. FOR EACH Subject in List:
     FOR EACH Record in Subject.DetailedAttendance:
         a. Extract Date string (YYYY-MM-DD).
         b. IF Date NOT IN DayMap: Initialize empty object { present: 0, absent: 0, total: 0 }.
         c. DayMap[Date].total += 1
         d. IF Record.status == 'Present': DayMap[Date].present += 1
         e. ELSE: DayMap[Date].absent += 1
4. Convert DayMap to Array of DateObjects and Sort by Date Descending.
5. Pass Array to UI Grid. Grid calculates color intensity based on (present / total) ratio per block.
```

---

## 4. Notes Library Search & Filter
**Documentation:** Dynamically filters uploaded study materials based on user context and explicit search parameters.
**Algorithm (Query Processing):**
```text
1. Receive QueryParams (SubjectId, Semester, ExamType, SearchText).
2. Fetch ALL Notes from Local Database.
3. FOR EACH Note:
     a. IF SubjectId provided AND Note.SubjectId != SubjectId -> Exclude
     b. IF Semester provided AND Note.Semester != Semester -> Exclude
     c. IF ExamType provided AND Note.ExamType != ExamType -> Exclude
     d. IF SearchText provided AND Note.Title DOES NOT Contain SearchText -> Exclude
4. Sort remaining Notes by CreatedDate Descending.
5. RETURN Filtered Notes Array.
```

---

## 5. Document Upload & Extraction
**Documentation:** Handles file uploads, PDF conversions, and text extraction for AI integration.
**Algorithm (File Processing Pipeline):**
```text
1. Receive MultipartFile and Metadata.
2. Save physical file stream to local disk (/uploads).
3. Detect FileType via Extension.
4. IF FileType is PPTX or DOCX:
     a. Convert binary to PDF format for in-browser viewing.
5. Trigger OCR/Text Extraction utility to grab plaintext.
6. Instantiate Note Object with FileUrl and ExtractedText.
7. Save Note to Database.
8. Trigger ASYNC Task: Vectorize ExtractedText for Semantic Search.
9. RETURN 200 OK.
```

---

## 6. PYQ Priority Matrix (Predictor)
**Documentation:** Uses an LLM to cross-reference previous year questions with a question bank to predict likely exam topics.
**Algorithm (Predictive Matrix Engine):**
```text
1. Receive PYQText and QuestionBankText from User.
2. Construct Prompt: 
   "Analyze patterns in PYQ Text: {PYQText}. 
    Compare against Question Bank: {QBText}. 
    Identify high-probability questions and output a JSON Priority Matrix (High, Med, Low)."
3. Execute POST to Groq API.
4. Receive JSON Matrix from LLM.
5. Parse and Validate JSON structure.
6. RETURN JSON to UI to render priority cards.
```

---

## 7. AI Study Roadmap Generator
**Documentation:** Generates a customized day-by-day study schedule based on the user's exam date.
**Algorithm (Time Division Logic):**
```text
1. Receive ExamDate, CurrentDate, SyllabusText.
2. Calculate DaysRemaining = (ExamDate - CurrentDate) in absolute days.
3. IF DaysRemaining <= 0, RETURN Error.
4. Construct Prompt:
     "You have {DaysRemaining} days to master this syllabus: {SyllabusText}. 
      Divide the topics evenly across the days. Output strictly as JSON array."
5. Execute POST to Groq API.
6. Parse response into Roadmap Object.
7. RETURN Roadmap JSON.
```

---

## 8. AI Chat Assistant (RAG)
**Documentation:** A personal tutor chat that injects recent notes into the AI's context so answers strictly relate to course material.
**Algorithm (Retrieval-Augmented Generation):**
```text
1. Receive UserQuestion.
2. Fetch Top 3 most recent Notes from Database (filtering out empty texts).
3. Initialize ContextString = "".
4. FOR EACH Note in Top 3:
     Append First 5000 chars of Note.ExtractedText to ContextString.
5. Construct AI Prompt:
     "Context Materials: {ContextString}
      User Question: {UserQuestion}
      Instruction: Answer strictly using the provided context."
6. Execute POST to Groq API.
7. Receive Answer and Confidence Score.
8. RETURN Answer to UI.
```

---

## 9. Announcements Feed
**Documentation:** A lightweight feature to stream administrative or academic updates directly to the user's dashboard.
**Algorithm (Feed Retrieval):**
```text
1. Receive GET request for recent announcements.
2. Fetch ALL Announcements from Database.
3. Sort Array by Date Descending.
4. IF Route == '/recent', slice Array to Top 2 limits.
5. RETURN JSON Array.
```
