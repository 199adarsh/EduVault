-- Create tables for EduVault MVP

CREATE TABLE IF NOT EXISTS student_profiles (
    prn VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255),
    image TEXT,
    roll_no VARCHAR(255),
    abc_id VARCHAR(255),
    department VARCHAR(255),
    semester VARCHAR(255),
    section VARCHAR(255),
    dob VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS subjects (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    department VARCHAR(255),
    semester VARCHAR(255),
    created_at VARCHAR(255),
    note_count INT DEFAULT 0,
    attendance VARCHAR(255),
    cie VARCHAR(255),
    total_conducted INT DEFAULT 0,
    total_attended INT DEFAULT 0,
    total_scheduled INT DEFAULT 0,
    still_to_go INT DEFAULT 0,
    detailed_attendance JSONB
);

CREATE TABLE IF NOT EXISTS notes (
    id VARCHAR(255) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    subject_id VARCHAR(255) REFERENCES subjects(id) ON DELETE SET NULL,
    department VARCHAR(255),
    semester VARCHAR(255),
    unit VARCHAR(255),
    exam_type VARCHAR(255),
    file_url TEXT,
    uploaded_by VARCHAR(255),
    created_at VARCHAR(255),
    status VARCHAR(255),
    tags JSONB,
    ai_important_topics JSONB,
    ai_generated_questions JSONB,
    extracted_text TEXT
);

CREATE TABLE IF NOT EXISTS doubts (
    id VARCHAR(255) PRIMARY KEY,
    note_id VARCHAR(255) REFERENCES notes(id) ON DELETE CASCADE,
    student_name VARCHAR(255),
    question TEXT NOT NULL,
    answer TEXT,
    created_at VARCHAR(255),
    status VARCHAR(255) DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS pyqs (
    id VARCHAR(255) PRIMARY KEY,
    subject_id VARCHAR(255) REFERENCES subjects(id) ON DELETE SET NULL,
    subject_name VARCHAR(255),
    exam_type VARCHAR(255),
    "year" VARCHAR(255),
    tags TEXT,
    text_content TEXT,
    file_url TEXT,
    uploaded_by VARCHAR(255),
    created_at VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS announcements (
    id VARCHAR(255) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    tag VARCHAR(255),
    color VARCHAR(255),
    posted_by VARCHAR(255),
    created_at VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS predefined_roadmaps (
    id VARCHAR(255) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    subject VARCHAR(255),
    total_hours VARCHAR(255),
    phases JSONB
);

CREATE TABLE IF NOT EXISTS timeline_events (
    id VARCHAR(255) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    event_date VARCHAR(255), -- renamed from 'date' to avoid SQL keyword conflicts
    event_time VARCHAR(255),
    tag VARCHAR(255),
    priority VARCHAR(255),
    active BOOLEAN DEFAULT TRUE
);

-- Insert Dummy Seeding Data
INSERT INTO subjects (id, name, department, semester, created_at, note_count) VALUES
('sub-1', 'Operating Systems', 'B.Tech-UAD', 'SEM 04', '2023-10-01', 1),
('sub-2', 'Database Systems', 'B.Tech-UAD', 'SEM 04', '2023-10-01', 1),
('sub-3', 'Mobile Computing', 'B.Tech-UAD', 'SEM 04', '2023-10-01', 0),
('sub-4', 'Software Engineering', 'B.Tech-UAD', 'SEM 04', '2023-10-01', 0),
('sub-5', 'Computer Networks', 'B.Tech-UAD', 'SEM 05', '2023-10-01', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO notes (id, title, subject_id, department, semester, unit, exam_type, file_url, status, created_at, tags, ai_important_topics, ai_generated_questions, extracted_text) VALUES
('note-1', 'Operating Systems - Process Scheduling', 'sub-1', 'B.Tech-UAD', 'SEM 04', 'Unit 2', 'Midterm', 'os_scheduling.pdf', 'ready', '2024-01-15T10:30:00', 
 '[]'::jsonb, 
 '["Process Scheduling", "FCFS Algorithm", "SJF Algorithm", "Priority Scheduling", "Round Robin"]'::jsonb,
 '[{"q": "What is the purpose of process scheduling?", "type": "short", "difficulty": "medium"}]'::jsonb,
 'Process scheduling is a fundamental concept in operating systems. The scheduler decides which process runs at any given time.'),
('note-2', 'Database Systems - Normalization', 'sub-2', 'B.Tech-UAD', 'SEM 04', 'Unit 3', 'Final', 'db_normalization.pdf', 'ready', '2024-01-16T14:20:00',
 '[]'::jsonb,
 '["Database Normalization", "First Normal Form", "Second Normal Form", "Third Normal Form"]'::jsonb,
 '[]'::jsonb,
 'Database normalization is the process of organizing the fields and tables of a relational database.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO announcements (id, title, description, tag, color, posted_by, created_at) VALUES
('ann-1', 'Operating Systems Lab Schedule Updated', 'Lab sessions for Operating Systems have been rescheduled.', 'Schedule', 'yellow', 'Admin', '2024-01-18T10:00:00'),
('ann-2', 'Database Systems Midterm Results', 'Results for the Database Systems midterm are available.', 'Results', 'green', 'Admin', '2024-01-17T16:30:00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO timeline_events (id, title, event_date, event_time, tag, priority, active) VALUES
('e1', 'Data Structures Midterm', '2026-08-05', '09:30 AM', 'Exam', 'high', true),
('e2', 'OS Lab Assignment', '2026-08-10', '11:59 PM', 'Assignment', 'medium', true)
ON CONFLICT (id) DO NOTHING;
