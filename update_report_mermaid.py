# -*- coding: utf-8 -*-
"""
Updates TY_Project_Report.md and generate_report.py with rich Mermaid diagrams.
"""

mermaid_system_arch = """```mermaid
graph TD
    subgraph Presentation_Layer["Presentation Layer (React 19 SPA)"]
        UI_Dash["Sovereign Dashboard & Heatmap"]
        UI_Opt["Attendance Optimization Panel"]
        UI_AI["Curriculum AI Tutor Dialog"]
        UI_LMS["LMS Synchronization Modal"]
    end

    subgraph Application_Layer["Application Layer (Spring Boot 3.2.4)"]
        REST["REST API Controllers (Api, Portal, Lms, Ai, Optimization)"]
        S_Opt["AttendanceOptimizationService (Greedy Knapsack)"]
        S_Portal["PortalScraperService (CSRF & Jsoup)"]
        S_Lms["LmsScraperService (Moodle Harvester)"]
        S_Doc["DocumentConversionService (POI & PDFBox)"]
        S_B2["BackblazeStorageService (AWS SDK v2 S3)"]
        S_RAG["RAGService (LangChain4j & Vector Cosine)"]
        S_Gemini["GeminiService (Gemini 3.5 Flash / Groq LPU)"]
    end

    subgraph Data_Layer["Data & Persistence Layer"]
        LocalDB[("LocalJsonDatabase")]
        VectorStore[("InMemoryEmbeddingStore (vector_store.json)")]
        B2Cloud[("Backblaze B2 S3 Object Storage")]
    end

    subgraph External_Systems["External Institutional Infrastructure"]
        ERP["DKTE University ERP (online.dkte.ac.in)"]
        Moodle["Moodle LMS (150.129.156.169)"]
        AI_Cloud["Gemini / Groq LLM Cloud"]
    end

    UI_Dash --> REST
    UI_Opt --> REST
    UI_AI --> REST
    UI_LMS --> REST

    REST --> S_Opt
    REST --> S_Portal
    REST --> S_Lms
    REST --> S_Doc
    REST --> S_B2
    REST --> S_RAG
    REST --> S_Gemini

    S_Portal --> LocalDB
    S_Portal <--> ERP
    S_Lms --> LocalDB
    S_Lms <--> Moodle
    S_Doc --> S_B2
    S_B2 <--> B2Cloud
    S_RAG <--> VectorStore
    S_RAG --> S_Gemini
    S_Gemini <--> AI_Cloud
    S_Opt --> LocalDB
```"""

mermaid_dfd0 = """```mermaid
flowchart TD
    Student["Student (User)"]
    System(("EduVault System (Process 0)"))
    ERP["University ERP (online.dkte.ac.in)"]
    Moodle["Institutional Moodle LMS"]
    B2["Backblaze B2 Object Storage"]
    AI["Groq / Gemini AI Inference"]

    Student -- "PRN & DOB, Query, Uploads" --> System
    System -- "Dashboard, AI Answers, Optimizations" --> Student
    System -- "GET/POST Handshake & Dynamic CSRF" --> ERP
    ERP -- "Attendance, Marks, Profile DOM" --> System
    System -- "Sesskey & AJAX Payload" --> Moodle
    Moodle -- "Course Files, Notes, Assignments" --> System
    System -- "Presigned Streaming & Storage" --> B2
    System -- "Context-Bounded Prompt" --> AI
    AI -- "Synthesized Explanations" --> System
```"""

mermaid_dfd1 = """```mermaid
flowchart TD
    Student["Student (User)"]
    P1(("1.0 Portal Ingestion"))
    P2(("2.0 Attendance Optimization"))
    P3(("3.0 Document Normalization"))
    P4(("4.0 Vectorization & RAG"))
    P5(("5.0 AI Query Processing"))

    D1[("D1: Student Profile & Subject Store")]
    D2[("D2: Notes & PYQ Store")]
    D3[("D3: Vector Store")]
    
    ERP["University ERP"]
    Moodle["Moodle LMS"]
    B2["Backblaze B2 Storage"]
    LLM["Groq / Gemini LLM"]

    Student -- "PRN & DOB" --> P1
    P1 <--> ERP
    P1 -- "Store Profile, Subjects, Logs" --> D1

    D1 -- "Current Attendance Stats" --> P2
    Student -- "Target Percentage" --> P2
    P2 -- "Safe Skips & Mandatory Sequence" --> Student

    Student -- "File Upload" --> P3
    Moodle -- "Harvested Files" --> P3
    P3 -- "Store Binary" --> B2
    P3 -- "Extracted Text Metadata" --> D2

    D2 -- "Plaintext Stream" --> P4
    P4 -- "Dense Vector Embeddings" --> D3

    Student -- "Academic Doubt / Prompt" --> P5
    D3 -- "Top-k Document Chunks" --> P5
    P5 <--> LLM
    P5 -- "Grounded Citation Response" --> Student
```"""

mermaid_usecase = """```mermaid
flowchart LR
    Student(["Student"])
    ERP(["University ERP"])
    LMS(["Moodle LMS"])
    AI(["AI Cloud Provider"])

    subgraph EduVault_Boundary["EduVault System"]
        UC1(["Sync University ERP"])
        UC2(["View Continuous Evaluation"])
        UC3(["Harvest LMS Courses"])
        UC4(["Optimize Lecture Attendance"])
        UC5(["Upload Multi-Format Note"])
        UC6(["Query AI Tutor (RAG)"])
        UC7(["Generate Exam Roadmap"])
        UC8(["Compute Vector Embeddings"])
    end

    Student --> UC1
    Student --> UC3
    Student --> UC4
    Student --> UC5
    Student --> UC6
    Student --> UC7

    UC1 -.->|extends| UC2
    UC6 -.->|includes| UC8

    UC1 <--> ERP
    UC3 <--> LMS
    UC6 <--> AI
    UC7 <--> AI
```"""

mermaid_class = """```mermaid
classDiagram
    class StudentProfile {
        +String prn
        +String name
        +String rollNo
        +String department
        +String semester
        +double overallAttendance
    }

    class Subject {
        +String id
        +String name
        +String code
        +int attended
        +int conducted
        +int remaining
        +double percentage
    }

    class Note {
        +String id
        +String subjectId
        +String title
        +String fileUrl
        +String storageKey
        +String extractedText
        +List~String~ topics
    }

    class Doubt {
        +String id
        +String noteId
        +String question
        +String answer
        +String timestamp
    }

    class LocalJsonDatabase {
        -StudentProfile profile
        -List~Subject~ subjects
        -List~Note~ notes
        -List~Doubt~ doubts
        +updateProfile(StudentProfile)
        +saveNote(Note)
        +getAllSubjects() List~Subject~
        +getAllNotes() List~Note~
    }

    class AttendanceOptimizationService {
        +optimizeAttendance(List~Subject~, double) OptimizationOutput
        -calculateMarginalBenefit(Subject) double
    }

    class RAGService {
        -EmbeddingModel embeddingModel
        -EmbeddingStore embeddingStore
        +ingestNote(Note)
        +askChapter(String, String) String
    }

    StudentProfile "1" *-- "*" Subject : contains
    Subject "1" *-- "*" Note : categorizes
    Note "1" *-- "*" Doubt : resolves
    LocalJsonDatabase ..> StudentProfile : persists
    LocalJsonDatabase ..> Subject : persists
    LocalJsonDatabase ..> Note : persists
    RAGService ..> Note : vectorizes
    AttendanceOptimizationService ..> Subject : optimizes
```"""

mermaid_sequence = """```mermaid
sequenceDiagram
    autonumber
    actor Student
    participant FE as Frontend (React 19)
    participant Ctrl as PortalController
    participant Scraper as PortalScraperService
    participant DB as LocalJsonDatabase
    participant ERP as DKTE Portal

    Student->>FE: Submit PRN and DOB
    FE->>Ctrl: POST /api/portal/dashboard
    Ctrl->>Scraper: fetchDashboard(prn, dob)
    Scraper->>ERP: GET /newparents/ (Login Page)
    ERP-->>Scraper: 200 OK + Dynamic CSRF Token
    Scraper->>ERP: POST /newparents/ (Credentials + CSRF)
    ERP-->>Scraper: 302 Redirect (Session Cookie Jar)
    Scraper->>ERP: GET /newparents/dashboard
    ERP-->>Scraper: 200 OK (HTML DOM Tables)
    Scraper->>Scraper: Parse DOM (Jsoup Extraction)
    Scraper->>DB: updateProfile() & updateSubjects()
    Scraper-->>Ctrl: PortalDashboardResponse
    Ctrl-->>FE: 200 OK (Synchronized JSON)
    FE-->>Student: Render Sovereign Bento Grid
```"""

mermaid_er = """```mermaid
erDiagram
    STUDENT_PROFILE ||--o{ SUBJECTS : enrolls
    SUBJECTS ||--o{ NOTES : contains
    NOTES ||--o{ DOUBTS : generates

    STUDENT_PROFILE {
        string prn PK
        string name
        string roll_no
        string department
        string semester
        double overall_attendance
    }

    SUBJECTS {
        string id PK
        string prn FK
        string code
        string name
        int attended
        int conducted
        int remaining
    }

    NOTES {
        string id PK
        string subject_id FK
        string title
        string file_url
        string storage_key
        string extracted_text
    }

    DOUBTS {
        string id PK
        string note_id FK
        string question
        string answer
        string timestamp
    }
```"""

mermaid_flowchart = """```mermaid
flowchart TD
    Start([Start Optimization]) --> Init[Initialize simulatedTotal = sum currentP]
    Init --> CalcAvg[currentGlobalAvg = simulatedTotal / N]
    CalcAvg --> CheckTarget{currentGlobalAvg >= Target?}
    
    CheckTarget -- Yes --> ComputeSkips["Compute Safe Skips: floor( (totalAttended - Target*totalConducted) / Target )"]
    ComputeSkips --> ReturnSafe[Return status: SAFE with safeSkips]
    
    CheckTarget -- No --> LoopStart[Find Subject with Remaining > 0 yielding max Delta B_i]
    LoopStart --> FoundSubject{Found valid subject?}
    
    FoundSubject -- No --> Debarred[Return status: CRITICAL - Mathematically Unachievable]
    FoundSubject -- Yes --> Allocate[Allocate +1 lecture to bestSubject.toAttend]
    Allocate --> UpdateSim[simulatedTotal += maxBenefit]
    UpdateSim --> ReCheck{simulatedTotal / N >= Target?}
    
    ReCheck -- No --> LoopStart
    ReCheck -- Yes --> Success[Return per-subject allocations and revised percentages]
    
    ReturnSafe --> End([End])
    Debarred --> End
    Success --> End
```"""

mermaid_collab = """```mermaid
flowchart TD
    AC["ApiController"]
    DCS["DocumentConversionService"]
    POI["Apache POI / PDFBox"]
    BSS["BackblazeStorageService"]
    B2["Backblaze B2 API"]
    RAG["RAGService"]
    ONNX["ONNX Embedding Engine"]

    AC -- "1: uploadFile(file, subjectId)" --> DCS
    DCS -- "2: convertPptToPdf()" --> POI
    POI -- "3: Return PDF byte stream" --> DCS
    DCS -- "4: Return converted bytes" --> AC
    AC -- "5: uploadToB2(bytes)" --> BSS
    BSS -- "6: S3Client.putObject()" --> B2
    AC -- "7: ingestNote(note)" --> RAG
    RAG -- "8: chunk & embed" --> ONNX
```"""

with open("TY_Project_Report.md", "r", encoding="utf-8") as f:
    text = f.read()

import re

# 1. Replace 3.1 Architecture diagram
text = re.sub(r'## 3\.1 System Architecture\s*\n\s*EduVault is architected[^\n]*\n\s*```[\s\S]*?```\s*\n\s*### 3\.1\.1',
              r'## 3.1 System Architecture\n\nEduVault is architected as a high-density, multi-tier Client-Server distributed application.\n\n' + mermaid_system_arch + '\n\n### 3.1.1', text)

# 2. Replace 3.2.1 Level 0 DFD
text = re.sub(r'### 3\.2\.1 Level 0 DFD \(Context Diagram\)[\s\S]*?```[\s\S]*?```',
              r'### 3.2.1 Level 0 DFD (Context Diagram)\nThe Context Diagram illustrates the macroscopic boundary of EduVault, depicting external entities, incoming inputs, and outgoing data flows.\n\n' + mermaid_dfd0, text)

# 3. Replace 3.2.2 Level 1 DFD
text = re.sub(r'### 3\.2\.2 Level 1 DFD \(Decomposed Functional Modules\)[\s\S]*?```[\s\S]*?```',
              r'### 3.2.2 Level 1 DFD (Decomposed Functional Modules)\nThe Level 1 DFD decomposes the system into its primary internal functional processes and data stores.\n\n' + mermaid_dfd1, text)

# 4. Replace 3.3.1 Use Case Diagram
text = re.sub(r'### 3\.3\.1 Use Case Diagram[\s\S]*?```[\s\S]*?```',
              r'### 3.3.1 Use Case Diagram\nThe Use Case Diagram defines the interactions between the Student (primary actor) and external systems.\n\n' + mermaid_usecase, text)

# 5. Replace 3.3.2 Class Diagram
text = re.sub(r'### 3\.3\.2 Class Diagram[\s\S]*?```[\s\S]*?```',
              r'### 3.3.2 Class Diagram\nThe Class Diagram models the core domain entities, services, and repositories.\n\n' + mermaid_class, text)

# 6. Replace 3.3.3 Sequence Diagram
text = re.sub(r'### 3\.3\.3 Sequence Diagram: Portal Synchronization Flow[\s\S]*?```[\s\S]*?```',
              r'### 3.3.3 Sequence Diagram: Portal Synchronization Flow\nThis Sequence Diagram models the execution sequence of headless authentication and DOM extraction.\n\n' + mermaid_sequence, text)

# 7. Replace 3.4 ER Diagram
text = re.sub(r'### Relational Entity Schema[\s\S]*?```[\s\S]*?```',
              r'### Relational Entity Schema\n\n' + mermaid_er, text)

# 8. Add Flowchart under 3.5.1
text = re.sub(r'#### Mathematical Formulation',
              r'#### Algorithm Flowchart\n\n' + mermaid_flowchart + '\n\n#### Mathematical Formulation', text)

# 9. Replace 3.6 Collaboration Diagram
text = re.sub(r'## 3\.6 Collaboration Diagram[\s\S]*?```[\s\S]*?```',
              r'## 3.6 Collaboration Diagram\nThe Collaboration Diagram details the structural object relationships and numbered message-passing sequence.\n\n' + mermaid_collab, text)

with open("TY_Project_Report.md", "w", encoding="utf-8") as f:
    f.write(text)

print("Successfully updated TY_Project_Report.md with Mermaid diagrams. Chars:", len(text))
