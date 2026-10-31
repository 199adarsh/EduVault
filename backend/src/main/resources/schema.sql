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
    b2_object_key VARCHAR(255),
    original_filename VARCHAR(255),
    import_batch_id VARCHAR(255),
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
    year VARCHAR(255),
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

CREATE TABLE IF NOT EXISTS nc_requests (
    id VARCHAR(255) PRIMARY KEY,
    student_prn VARCHAR(255) NOT NULL,
    student_name VARCHAR(255),
    roll_no VARCHAR(255),
    department VARCHAR(255),
    semester VARCHAR(255),
    section VARCHAR(255),
    absent_dates JSONB,
    missed_subjects JSONB,
    reason VARCHAR(255),
    description TEXT,
    proof_file_name VARCHAR(255),
    proof_file_key VARCHAR(255),
    proof_file_type VARCHAR(255),
    proof_presigned_url TEXT,
    status VARCHAR(32) DEFAULT 'PENDING',
    created_at VARCHAR(255),
    reviewed_by VARCHAR(255),
    review_comment TEXT,
    reviewed_at VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS nc_notifications (
    id VARCHAR(255) PRIMARY KEY,
    request_id VARCHAR(255),
    recipient_prn VARCHAR(255),
    recipient_role VARCHAR(255),
    title VARCHAR(255),
    message TEXT,
    type VARCHAR(255),
    created_at VARCHAR(255),
    read BOOLEAN DEFAULT FALSE
);
