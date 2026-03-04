package com.eduvault.repository;

import com.eduvault.model.Note;
import com.eduvault.model.StudentProfile;
import com.eduvault.model.Subject;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Repository;

import jakarta.annotation.PostConstruct;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.time.LocalDate;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Repository
public class LocalJsonDatabase {

    private static final Logger logger = LoggerFactory.getLogger(LocalJsonDatabase.class);

    @Value("${app.storage.local-dir}")
    private String storageDir;

    private File subjectsFile;
    private File notesFile;
    private File profileFile;
    
    private List<Subject> subjects = new ArrayList<>();
    private List<Note> notes = new ArrayList<>();
    private List<com.eduvault.model.PYQ> pyqs = new ArrayList<>();
    private List<com.eduvault.model.Doubt> doubts = new ArrayList<>();
    private List<com.eduvault.model.Announcement> announcements = new ArrayList<>();
    private List<com.eduvault.model.PredefinedRoadmap> roadmaps = new ArrayList<>();
    private List<com.eduvault.model.TimelineEvent> timelineEvents = new ArrayList<>();
    private StudentProfile profile = new StudentProfile();
    private final ObjectMapper mapper = mapperWithJava8Time();
    private File doubtsFile;
    private File pyqsFile;
    private File announcementsFile;
    private File roadmapsFile;
    private File timelineFile;

    private ObjectMapper mapperWithJava8Time() {
        ObjectMapper m = new ObjectMapper();
        m.registerModule(new com.fasterxml.jackson.datatype.jsr310.JavaTimeModule());
        return m;
    }

    @PostConstruct
    public void init() {
        try {
            Path dirPath = Paths.get(storageDir);
            if (!Files.exists(dirPath)) {
                Files.createDirectories(dirPath);
            }
            
            subjectsFile = new File(storageDir, "subjects.json");
            notesFile = new File(storageDir, "notes.json");
            profileFile = new File(storageDir, "profile.json");
            doubtsFile = new File(storageDir, "doubts.json");
            pyqsFile = new File(storageDir, "pyqs.json");
            announcementsFile = new File(storageDir, "announcements.json");
            roadmapsFile = new File(storageDir, "roadmaps.json");
            timelineFile = new File(storageDir, "timeline.json");
            
            if (!subjectsFile.exists()) {
                seedSubjects();
            } else {
                subjects = mapper.readValue(subjectsFile, new TypeReference<List<Subject>>() {});
            }
            
            if (!notesFile.exists()) {
                seedNotes();
            } else {
                notes = mapper.readValue(notesFile, new TypeReference<List<Note>>() {});
            }
            
            if (!profileFile.exists()) {
                saveProfile();
            } else {
                profile = mapper.readValue(profileFile, StudentProfile.class);
            }
            
            if (!doubtsFile.exists()) {
                saveDoubts();
            } else {
                doubts = mapper.readValue(doubtsFile, new TypeReference<List<com.eduvault.model.Doubt>>() {});
            }

            if (!pyqsFile.exists()) {
                seedPyqs();
            } else {
                pyqs = mapper.readValue(pyqsFile, new TypeReference<List<com.eduvault.model.PYQ>>() {});
            }

            if (!announcementsFile.exists()) {
                seedAnnouncements();
            } else {
                announcements = mapper.readValue(announcementsFile, new TypeReference<List<com.eduvault.model.Announcement>>() {});
            }

            if (!roadmapsFile.exists()) {
                seedRoadmaps();
            } else {
                roadmaps = mapper.readValue(roadmapsFile, new TypeReference<List<com.eduvault.model.PredefinedRoadmap>>() {});
            }

            if (!timelineFile.exists()) {
                seedTimeline();
            } else {
                timelineEvents = mapper.readValue(timelineFile, new TypeReference<List<com.eduvault.model.TimelineEvent>>() {});
            }
            
            logger.info("Local JSON DB initialized at {}", storageDir);
        } catch (IOException e) {
            logger.error("Failed to initialize Local JSON DB", e);
        }
    }

    private void seedSubjects() throws IOException {
        subjects.add(Subject.builder().id("1").name("Operating Systems").department("B.Tech-UAD").semester("SEM 04").createdAt("2023-10-01").noteCount(0).build());
        subjects.add(Subject.builder().id("2").name("Database Systems").department("B.Tech-UAD").semester("SEM 04").createdAt("2023-10-01").noteCount(0).build());
        subjects.add(Subject.builder().id("3").name("Mobile Computing").department("B.Tech-UAD").semester("SEM 04").createdAt("2023-10-01").noteCount(0).build());
        subjects.add(Subject.builder().id("4").name("Software Engineering").department("B.Tech-UAD").semester("SEM 04").createdAt("2023-10-01").noteCount(0).build());
        subjects.add(Subject.builder().id("5").name("Computer Networks").department("B.Tech-UAD").semester("SEM 05").createdAt("2023-10-01").noteCount(0).build());
        saveSubjects();
    }

    private void seedNotes() throws IOException {
        notes.add(Note.builder()
                .id("note-1")
                .title("Operating Systems - Process Scheduling")
                .subjectId("1")
                .department("B.Tech-UAD")
                .semester("SEM 04")
                .unit("Unit 2")
                .examType("Midterm")
                .fileUrl("os_scheduling.pdf")
                .extractedText("Process scheduling is a fundamental concept in operating systems. The scheduler decides which process runs at any given time. There are various scheduling algorithms including FCFS, SJF, Priority Scheduling, and Round Robin. Each algorithm has its own advantages and disadvantages in terms of throughput, turnaround time, and response time.")
                .status("ready")
                .createdAt("2024-01-15T10:30:00")
                .aiImportantTopics(List.of("Process Scheduling", "FCFS Algorithm", "SJF Algorithm", "Priority Scheduling", "Round Robin"))
                .aiGeneratedQuestions(List.of(
                        new Note.Question("What is the purpose of process scheduling in operating systems?", "short", "medium"),
                        new Note.Question("Compare FCFS and SJF scheduling algorithms", "long", "medium"),
                        new Note.Question("Explain Round Robin scheduling with an example", "long", "easy")
                ))
                .build());
        
        notes.add(Note.builder()
                .id("note-2")
                .title("Database Systems - Normalization")
                .subjectId("2")
                .department("B.Tech-UAD")
                .semester("SEM 04")
                .unit("Unit 3")
                .examType("Final")
                .fileUrl("db_normalization.pdf")
                .extractedText("Database normalization is the process of organizing the fields and tables of a relational database to minimize redundancy and dependency. Normalization usually involves dividing a database into two or more tables and defining relationships between the tables. The main objectives of normalization include eliminating data redundancy, ensuring data dependencies make sense, and preventing anomalies.")
                .status("ready")
                .createdAt("2024-01-16T14:20:00")
                .aiImportantTopics(List.of("Database Normalization", "First Normal Form", "Second Normal Form", "Third Normal Form", "BCNF"))
                .aiGeneratedQuestions(List.of(
                        new Note.Question("What are the main objectives of database normalization?", "short", "easy"),
                        new Note.Question("Explain the differences between 2NF and 3NF", "long", "medium"),
                        new Note.Question("Given a table, normalize it to 3NF", "mcq", "hard")
                ))
                .build());
        
        notes.add(Note.builder()
                .id("note-3")
                .title("Computer Networks - TCP/IP Model")
                .subjectId("5")
                .department("B.Tech-UAD")
                .semester("SEM 05")
                .unit("Unit 1")
                .examType("Midterm")
                .fileUrl("tcpip_model.pdf")
                .extractedText("The TCP/IP model is a conceptual model used in computer networking. It consists of four layers: Application Layer, Transport Layer, Internet Layer, and Network Access Layer. The Application Layer includes protocols like HTTP, FTP, SMTP. The Transport Layer uses TCP and UDP protocols. The Internet Layer uses IP protocol for routing, and the Network Access Layer deals with physical transmission.")
                .status("ready")
                .createdAt("2024-01-17T09:15:00")
                .aiImportantTopics(List.of("TCP/IP Model", "Application Layer Protocols", "TCP vs UDP", "IP Addressing", "Network Layers"))
                .aiGeneratedQuestions(List.of(
                        new Note.Question("List and explain the four layers of TCP/IP model", "short", "easy"),
                        new Note.Question("Compare TCP and UDP protocols", "long", "medium"),
                        new Note.Question("Which layer handles routing in TCP/IP?", "mcq", "easy")
                ))
                .build());
        
        saveNotes();
    }

    private void seedPyqs() throws IOException {
        pyqs.add(com.eduvault.model.PYQ.builder()
                .id("pyq-1")
                .subjectName("Operating Systems")
                .examType("Midterm")
                .year("2023")
                .fileUrl("os_midterm_2023.pdf")
                .textContent("Complete midterm examination paper covering process scheduling, memory management, and file systems")
                .createdAt("2024-01-10T11:00:00")
                .build());
        
        pyqs.add(com.eduvault.model.PYQ.builder()
                .id("pyq-2")
                .subjectName("Database Systems")
                .examType("Final")
                .year("2023")
                .fileUrl("db_final_2023.pdf")
                .textContent("Final examination covering normalization, SQL queries, transaction management, and database design")
                .createdAt("2024-01-11T15:30:00")
                .build());
        
        pyqs.add(com.eduvault.model.PYQ.builder()
                .id("pyq-3")
                .subjectName("Computer Networks")
                .examType("Quiz")
                .year("2023")
                .fileUrl("cn_quiz_2023.pdf")
                .textContent("Quiz on TCP/IP protocols, network layers, and basic networking concepts")
                .createdAt("2024-01-12T09:45:00")
                .build());
        
        pyqs.add(com.eduvault.model.PYQ.builder()
                .id("pyq-4")
                .subjectName("Software Engineering")
                .examType("Assignment")
                .year("2023")
                .fileUrl("se_assignment_2023.pdf")
                .textContent("Major assignment covering software development lifecycle, design patterns, and testing methodologies")
                .createdAt("2024-01-13T13:20:00")
                .build());
        
        savePyqs();
    }

    private void seedAnnouncements() throws IOException {
        announcements.add(com.eduvault.model.Announcement.builder()
                .id("ann-1")
                .title("Operating Systems Lab Schedule Updated")
                .description("Lab sessions for Operating Systems have been rescheduled. Please check the updated timetable on the department notice board. New lab sessions will start from next Monday.")
                .tag("Schedule")
                .color("yellow")
                .postedBy("Admin")
                .createdAt("2024-01-18T10:00:00")
                .build());
        
        announcements.add(com.eduvault.model.Announcement.builder()
                .id("ann-2")
                .title("Database Systems Midterm Results")
                .description("Results for the Database Systems midterm examination are now available. Students can check their scores on the student portal. Request for re-evaluation must be submitted by Friday.")
                .tag("Results")
                .color("green")
                .postedBy("Admin")
                .createdAt("2024-01-17T16:30:00")
                .build());
        
        announcements.add(com.eduvault.model.Announcement.builder()
                .id("ann-3")
                .title("Guest Lecture: Cloud Computing Trends")
                .description("A guest lecture on emerging trends in cloud computing will be held on January 20th at 2:00 PM in the main auditorium. All CSE students are encouraged to attend.")
                .tag("Event")
                .color("blue")
                .postedBy("Admin")
                .createdAt("2024-01-16T09:15:00")
                .build());
        
        announcements.add(com.eduvault.model.Announcement.builder()
                .id("ann-4")
                .title("Library Resources: New Programming Books")
                .description("The library has added new programming books including latest editions of algorithms, data structures, and software engineering references. Visit the library to explore the collection.")
                .tag("Resource")
                .color("green")
                .postedBy("Library")
                .createdAt("2024-01-15T14:00:00")
                .build());
        
        announcements.add(com.eduvault.model.Announcement.builder()
                .id("ann-5")
                .title("Software Engineering Project Submission Deadline")
                .description("Reminder: Final project submissions for Software Engineering are due on January 22nd. Late submissions will incur a penalty of 5% per day.")
                .tag("Deadline")
                .color("red")
                .postedBy("Faculty")
                .createdAt("2024-01-14T11:45:00")
                .build());
        
        saveAnnouncements();
    }

    public synchronized void saveSubjects() {
        try {
            mapper.writeValue(subjectsFile, subjects);
        } catch (IOException e) {
            logger.error("Failed to write subjects.json", e);
        }
    }

    public synchronized void saveNotes() {
        try {
            mapper.writeValue(notesFile, notes);
            updateSubjectCounts();
        } catch (IOException e) {
            logger.error("Failed to write notes.json", e);
        }
    }
    
    public synchronized void saveProfile() {
        try {
            mapper.writeValue(profileFile, profile);
        } catch (IOException e) {
            logger.error("Failed to write profile.json", e);
        }
    }

    public synchronized void saveDoubts() {
        try {
            mapper.writeValue(doubtsFile, doubts);
        } catch (IOException e) {
            logger.error("Failed to write doubts.json", e);
        }
    }

    public synchronized void savePyqs() {
        try {
            mapper.writeValue(pyqsFile, pyqs);
        } catch (IOException e) {
            logger.error("Failed to write pyqs.json", e);
        }
    }

    public synchronized void saveAnnouncements() {
        try {
            mapper.writeValue(announcementsFile, announcements);
        } catch (IOException e) {
            logger.error("Failed to write announcements.json", e);
        }
    }

    public synchronized void saveRoadmaps() {
        try {
            mapper.writeValue(roadmapsFile, roadmaps);
        } catch (IOException e) {
            logger.error("Failed to write roadmaps.json", e);
        }
    }

    public synchronized void saveTimeline() {
        try {
            mapper.writeValue(timelineFile, timelineEvents);
        } catch (IOException e) {
            logger.error("Failed to write timeline.json", e);
        }
    }

    private void seedRoadmaps() throws IOException {
        roadmaps.clear();
        
        // Python Full Course
        roadmaps.add(com.eduvault.model.PredefinedRoadmap.builder()
                .id("python-full-course-beginners-advanced")
                .title("Python Full Course for Beginners to Advanced | 12 Hours Complete Tutorial + Python Book")
                .subject("Python Programming")
                .totalHours("12")
                .phases(List.of(
                    com.eduvault.model.PredefinedRoadmap.Phase.builder()
                        .title("Python Fundamentals")
                        .critical(true)
                        .topics(List.of("Syntax and setup", "Variables and data types", "Conditionals and loops", "Functions", "Core Python basics"))
                        .resources(List.of(new com.eduvault.model.PredefinedRoadmap.Resource("Python Full Course for Beginners to Advanced | 12 Hours Complete Tutorial + Python Book", "")))
                        .build(),
                    com.eduvault.model.PredefinedRoadmap.Phase.builder()
                        .title("Intermediate to Advanced Python")
                        .critical(true)
                        .topics(List.of("Modules and packages", "File handling", "Object-oriented programming", "Error handling", "Python project practice"))
                        .resources(List.of(new com.eduvault.model.PredefinedRoadmap.Resource("Python Full Course for Beginners to Advanced | 12 Hours Complete Tutorial + Python Book", "")))
                        .build()
                ))
                .build());

        // Data Science Fundamentals
        roadmaps.add(com.eduvault.model.PredefinedRoadmap.builder()
                .id("data-science-fundamentals")
                .title("Complete Data Science Course for Beginners | NumPy | Sheryians AI School")
                .subject("Data Science")
                .totalHours("2")
                .phases(List.of(
                    com.eduvault.model.PredefinedRoadmap.Phase.builder()
                        .title("NumPy Foundations")
                        .critical(true)
                        .topics(List.of("Arrays", "Vectorized operations", "Indexing and slicing", "Broadcasting", "Numerical computation"))
                        .resources(List.of(
                            new com.eduvault.model.PredefinedRoadmap.Resource("Complete Data Science Course for Beginners | NumPy | Sheryians AI School", "https://www.youtube.com/watch?v=QUT1VHiLmmI"),
                            new com.eduvault.model.PredefinedRoadmap.Resource("NumPy Complete Tutorial | Sheryians AI School", "https://www.youtube.com/watch?v=xECXZ3tyONo"),
                            new com.eduvault.model.PredefinedRoadmap.Resource("NumPy Arrays Tutorial | Sheryians AI School", "https://www.youtube.com/watch?v=mQ6fGhBiM-Y"),
                            new com.eduvault.model.PredefinedRoadmap.Resource("NumPy Indexing and Slicing | Sheryians AI School", "https://www.youtube.com/watch?v=rN0TREXi8Dw"),
                            new com.eduvault.model.PredefinedRoadmap.Resource("NumPy Broadcasting Explained | Sheryians AI School", "https://www.youtube.com/watch?v=QVT1BbLQD2Y")
                        ))
                        .build()
                ))
                .build());

        // Pandas for Data Science
        roadmaps.add(com.eduvault.model.PredefinedRoadmap.builder()
                .id("pandas-for-data-science")
                .title("Complete Data Science Course for Beginners | Pandas Library | Sheryians AI School")
                .subject("Data Science")
                .totalHours("2.4")
                .phases(List.of(
                    com.eduvault.model.PredefinedRoadmap.Phase.builder()
                        .title("Pandas Essentials")
                        .critical(true)
                        .topics(List.of("DataFrames", "Series", "Data cleaning", "Filtering and grouping", "Basic analysis"))
                        .resources(List.of(
                            new com.eduvault.model.PredefinedRoadmap.Resource("Complete Data Science Course for Beginners | Pandas Library | Sheryians AI School", "https://www.youtube.com/watch?v=OHh5LjQZVQw"),
                            new com.eduvault.model.PredefinedRoadmap.Resource("Pandas Complete Tutorial | Sheryians AI School", "https://www.youtube.com/watch?v=vM_E_3e2Da0"),
                            new com.eduvault.model.PredefinedRoadmap.Resource("Pandas DataFrames Tutorial | Sheryians AI School", "https://www.youtube.com/watch?v=vp1xI-ZUMSg"),
                            new com.eduvault.model.PredefinedRoadmap.Resource("Pandas Data Cleaning | Sheryians AI School", "https://www.youtube.com/watch?v=vmEHCJofslg"),
                            new com.eduvault.model.PredefinedRoadmap.Resource("Pandas Filtering and Grouping | Sheryians AI School", "https://www.youtube.com/watch?v=XmWq-kP5e8Q")
                        ))
                        .build()
                ))
                .build());

        // Data Visualization
        roadmaps.add(com.eduvault.model.PredefinedRoadmap.builder()
                .id("data-visualization-beginners")
                .title("Complete Data Visualization Course for Beginners | Matplotlib & Seaborn | Sheryians AI School")
                .subject("Data Visualization")
                .totalHours("2.6")
                .phases(List.of(
                    com.eduvault.model.PredefinedRoadmap.Phase.builder()
                        .title("Visualization Basics")
                        .critical(true)
                        .topics(List.of("Matplotlib", "Seaborn", "Charts and plots", "Styling visuals", "Communicating insights"))
                        .resources(List.of(
                            new com.eduvault.model.PredefinedRoadmap.Resource("Complete Data Visualization Course for Beginners | Matplotlib & Seaborn | Sheryians AI School", "https://www.youtube.com/watch?v=DAQNHzOcO5A"),
                            new com.eduvault.model.PredefinedRoadmap.Resource("Matplotlib Complete Tutorial | Sheryians AI School", "https://www.youtube.com/watch?v=DAQNHzOcO5A"),
                            new com.eduvault.model.PredefinedRoadmap.Resource("Seaborn Complete Tutorial | Sheryians AI School", "https://www.youtube.com/watch?v=Umq9Nq1yfQk"),
                            new com.eduvault.model.PredefinedRoadmap.Resource("Data Visualization with Matplotlib | Sheryians AI School", "https://www.youtube.com/watch?v=DAQNHzOcO5A"),
                            new com.eduvault.model.PredefinedRoadmap.Resource("Advanced Seaborn Techniques | Sheryians AI School", "https://www.youtube.com/watch?v=Umq9Nq1yfQk")
                        ))
                        .build()
                ))
                .build());

        // Statistics for Data Science
        roadmaps.add(com.eduvault.model.PredefinedRoadmap.builder()
                .id("statistics-for-data-science")
                .title("Complete Statistics Course for Beginners | Data Science Tutorial | Sheryians AI School")
                .subject("Statistics")
                .totalHours("5")
                .phases(List.of(
                    com.eduvault.model.PredefinedRoadmap.Phase.builder()
                        .title("Statistics Foundations")
                        .critical(true)
                        .topics(List.of("Descriptive statistics", "Probability basics", "Distributions", "Hypothesis testing", "Statistics for ML"))
                        .resources(List.of(
                            new com.eduvault.model.PredefinedRoadmap.Resource("Complete Statistics Course for Beginners | Data Science Tutorial | Sheryians AI School", "https://www.youtube.com/watch?v=Vqo2VqkmQkY"),
                            new com.eduvault.model.PredefinedRoadmap.Resource("Statistics Complete Tutorial | Sheryians AI School", "https://www.youtube.com/watch?v=Vqo2VqkmQkY"),
                            new com.eduvault.model.PredefinedRoadmap.Resource("Probability and Statistics | Sheryians AI School", "https://www.youtube.com/watch?v=Vqo2VqkmQkY"),
                            new com.eduvault.model.PredefinedRoadmap.Resource("Descriptive Statistics Explained | Sheryians AI School", "https://www.youtube.com/watch?v=Vqo2VqkmQkY"),
                            new com.eduvault.model.PredefinedRoadmap.Resource("Hypothesis Testing Tutorial | Sheryians AI School", "https://www.youtube.com/watch?v=Vqo2VqkmQkY")
                        ))
                        .build()
                ))
                .build());

        // Machine Learning Foundation
        roadmaps.add(com.eduvault.model.PredefinedRoadmap.builder()
                .id("machine-learning-foundation")
                .title("Complete Machine Learning Course for Beginners | Part 1- Foundation | Sheryians AI School")
                .subject("Machine Learning")
                .totalHours("2.7")
                .phases(List.of(
                    com.eduvault.model.PredefinedRoadmap.Phase.builder()
                        .title("ML Foundation")
                        .critical(true)
                        .topics(List.of("What is machine learning", "Types of learning", "Model workflow", "Feature and target concepts", "Problem framing"))
                        .resources(List.of(
                            new com.eduvault.model.PredefinedRoadmap.Resource("Complete Machine Learning Course for Beginners | Part 1- Foundation | Sheryians AI School", "https://www.youtube.com/watch?v=98jz5QFhE9c"),
                            new com.eduvault.model.PredefinedRoadmap.Resource("Machine Learning Basics | Sheryians AI School", "https://www.youtube.com/watch?v=98jz5QFhE9c"),
                            new com.eduvault.model.PredefinedRoadmap.Resource("Types of Machine Learning | Sheryians AI School", "https://www.youtube.com/watch?v=98jz5QFhE9c"),
                            new com.eduvault.model.PredefinedRoadmap.Resource("ML Model Workflow | Sheryians AI School", "https://www.youtube.com/watch?v=98jz5QFhE9c"),
                            new com.eduvault.model.PredefinedRoadmap.Resource("Features and Targets in ML | Sheryians AI School", "https://www.youtube.com/watch?v=98jz5QFhE9c")
                        ))
                        .build()
                ))
                .build());

        // Machine Learning Supervised Part 2
        roadmaps.add(com.eduvault.model.PredefinedRoadmap.builder()
                .id("machine-learning-supervised-part-2")
                .title("Part 2 – Supervised Learning | Complete Machine Learning Course for Beginners | Sheryians AI School")
                .subject("Machine Learning")
                .totalHours("unknown")
                .phases(List.of(
                    com.eduvault.model.PredefinedRoadmap.Phase.builder()
                        .title("Supervised Learning Basics")
                        .critical(true)
                        .topics(List.of("Regression", "Training and test data", "Loss functions", "Model evaluation", "Prediction workflow"))
                        .resources(List.of(new com.eduvault.model.PredefinedRoadmap.Resource("Part 2 – Supervised Learning | Complete Machine Learning Course for Beginners | Sheryians AI School", "")))
                        .build()
                ))
                .build());

        // Machine Learning Classification Part 3
        roadmaps.add(com.eduvault.model.PredefinedRoadmap.builder()
                .id("machine-learning-classification-part-3")
                .title("Part 3 – Supervised Learning | Classification Algorithms for Beginners | Sheryians AI School")
                .subject("Machine Learning")
                .totalHours("unknown")
                .phases(List.of(
                    com.eduvault.model.PredefinedRoadmap.Phase.builder()
                        .title("Classification Algorithms")
                        .critical(true)
                        .topics(List.of("Binary classification", "Logistic regression", "Decision boundaries", "Evaluation metrics", "Classification practice"))
                        .resources(List.of(new com.eduvault.model.PredefinedRoadmap.Resource("Part 3 – Supervised Learning | Classification Algorithms for Beginners | Sheryians AI School", "")))
                        .build()
                ))
                .build());

        // Machine Learning Advanced Part 4
        roadmaps.add(com.eduvault.model.PredefinedRoadmap.builder()
                .id("machine-learning-advanced-part-4")
                .title("Part 4 – Model Tuning, Ensemble & Unsupervised Learning | Full ML Course | Sheryians AI School")
                .subject("Machine Learning")
                .totalHours("unknown")
                .phases(List.of(
                    com.eduvault.model.PredefinedRoadmap.Phase.builder()
                        .title("Model Tuning and Ensembles")
                        .critical(true)
                        .topics(List.of("Hyperparameter tuning", "Ensemble methods", "Bagging and boosting", "Cross-validation", "Model improvement"))
                        .resources(List.of(new com.eduvault.model.PredefinedRoadmap.Resource("Part 4 – Model Tuning, Ensemble & Unsupervised Learning | Full ML Course | Sheryians AI School", "")))
                        .build(),
                    com.eduvault.model.PredefinedRoadmap.Phase.builder()
                        .title("Unsupervised Learning")
                        .critical(false)
                        .topics(List.of("Clustering", "Dimensionality reduction", "Pattern discovery", "Feature learning", "Unlabeled data analysis"))
                        .resources(List.of(new com.eduvault.model.PredefinedRoadmap.Resource("Part 4 – Model Tuning, Ensemble & Unsupervised Learning | Full ML Course | Sheryians AI School", "")))
                        .build()
                ))
                .build());

        // SQL Data Analytics
        roadmaps.add(com.eduvault.model.PredefinedRoadmap.builder()
                .id("sql-data-analytics-2025")
                .title("Complete SQL in 1 shot for Data analytics in 2025")
                .subject("SQL")
                .totalHours("unknown")
                .phases(List.of(
                    com.eduvault.model.PredefinedRoadmap.Phase.builder()
                        .title("SQL Basics")
                        .critical(true)
                        .topics(List.of("SELECT queries", "Filtering", "Sorting", "Joins", "Aggregations"))
                        .resources(List.of(new com.eduvault.model.PredefinedRoadmap.Resource("Complete SQL in 1 shot for Data analytics in 2025", "")))
                        .build(),
                    com.eduvault.model.PredefinedRoadmap.Phase.builder()
                        .title("SQL for Analytics")
                        .critical(true)
                        .topics(List.of("Data analysis queries", "Business reporting", "Window functions", "Grouping sets", "Analytics workflows"))
                        .resources(List.of(new com.eduvault.model.PredefinedRoadmap.Resource("Complete SQL in 1 shot for Data analytics in 2025", "")))
                        .build()
                ))
                .build());

        // NLP Project Beginners
        roadmaps.add(com.eduvault.model.PredefinedRoadmap.builder()
                .id("nlp-project-beginners")
                .title("Learn Complete NLP with Project (Bag of Words, Tf-idf) | For Beginners")
                .subject("Natural Language Processing")
                .totalHours("unknown")
                .phases(List.of(
                    com.eduvault.model.PredefinedRoadmap.Phase.builder()
                        .title("NLP Basics")
                        .critical(true)
                        .topics(List.of("Text preprocessing", "Tokenization", "Bag of Words", "TF-IDF", "Feature extraction"))
                        .resources(List.of(new com.eduvault.model.PredefinedRoadmap.Resource("Learn Complete NLP with Project (Bag of Words, Tf-idf) | For Beginners", "")))
                        .build()
                ))
                .build());

        // Deep Learning Part 1 ANN
        roadmaps.add(com.eduvault.model.PredefinedRoadmap.builder()
                .id("deep-learning-part-1-ann")
                .title("Deep Learning Complete Course | Part 1 | ANN implementation")
                .subject("Deep Learning")
                .totalHours("unknown")
                .phases(List.of(
                    com.eduvault.model.PredefinedRoadmap.Phase.builder()
                        .title("Artificial Neural Networks")
                        .critical(true)
                        .topics(List.of("Perceptron", "Neurons and layers", "Forward propagation", "Loss and optimization", "ANN implementation"))
                        .resources(List.of(new com.eduvault.model.PredefinedRoadmap.Resource("Deep Learning Complete Course | Part 1 | ANN implementation", "")))
                        .build()
                ))
                .build());

        // Deep Learning Part 2 CNN
        roadmaps.add(com.eduvault.model.PredefinedRoadmap.builder()
                .id("deep-learning-part-2-cnn")
                .title("Deep Learning Complete Course | Part 2 | CNN implementation")
                .subject("Deep Learning")
                .totalHours("unknown")
                .phases(List.of(
                    com.eduvault.model.PredefinedRoadmap.Phase.builder()
                        .title("Convolutional Neural Networks")
                        .critical(true)
                        .topics(List.of("Convolutions", "Pooling", "Image feature extraction", "CNN architecture", "CNN implementation"))
                        .resources(List.of(new com.eduvault.model.PredefinedRoadmap.Resource("Deep Learning Complete Course | Part 2 | CNN implementation", "")))
                        .build()
                ))
                .build());

        // Deep Learning Part 3 RNN
        roadmaps.add(com.eduvault.model.PredefinedRoadmap.builder()
                .id("deep-learning-part-3-rnn")
                .title("Deep Learning Complete Course | Part 3 | RNN implementation")
                .subject("Deep Learning")
                .totalHours("unknown")
                .phases(List.of(
                    com.eduvault.model.PredefinedRoadmap.Phase.builder()
                        .title("Recurrent Neural Networks")
                        .critical(true)
                        .topics(List.of("Sequence data", "Time series", "Hidden states", "RNN architecture", "RNN implementation"))
                        .resources(List.of(new com.eduvault.model.PredefinedRoadmap.Resource("Deep Learning Complete Course | Part 3 | RNN implementation", "")))
                        .build()
                ))
                .build());

        // Deep Learning Part 4 Transformers
        roadmaps.add(com.eduvault.model.PredefinedRoadmap.builder()
                .id("deep-learning-part-4-transformers")
                .title("Deep Learning Complete Course | Part 4 | Transformers & Attention Mechanism Completely Explained")
                .subject("Deep Learning")
                .totalHours("unknown")
                .phases(List.of(
                    com.eduvault.model.PredefinedRoadmap.Phase.builder()
                        .title("Attention Mechanism")
                        .critical(true)
                        .topics(List.of("Attention", "Context vectors", "Sequence modeling", "Transformer basics", "Modern deep learning"))
                        .resources(List.of(new com.eduvault.model.PredefinedRoadmap.Resource("Deep Learning Complete Course | Part 4 | Transformers & Attention Mechanism Completely Explained", "")))
                        .build()
                ))
                .build());

        // JavaScript Beginners
        roadmaps.add(com.eduvault.model.PredefinedRoadmap.builder()
                .id("javascript-beginners-chai-aur-code")
                .title("Javascript for beginners | chai aur #javascript")
                .subject("JavaScript")
                .totalHours("unknown")
                .phases(List.of(
                    com.eduvault.model.PredefinedRoadmap.Phase.builder()
                        .title("JavaScript Fundamentals")
                        .critical(true)
                        .topics(List.of("Variables", "Data types", "Arrays", "Objects", "Functions"))
                        .resources(List.of(
                            new com.eduvault.model.PredefinedRoadmap.Resource("Javascript for beginners | chai aur #javascript", "https://www.youtube.com/watch?v=PkZNo7mfNFY"),
                            new com.eduvault.model.PredefinedRoadmap.Resource("JavaScript Complete Course | Chai aur Code", "https://www.youtube.com/watch?v=Ej_krDOZJRQ"),
                            new com.eduvault.model.PredefinedRoadmap.Resource("JavaScript Tutorial for Beginners", "https://www.youtube.com/watch?v=W6NZfCO5SIk"),
                            new com.eduvault.model.PredefinedRoadmap.Resource("Variables & Data Types in JS | Chai aur Code", "https://www.youtube.com/watch?v=hdI2bqOjy3c"),
                            new com.eduvault.model.PredefinedRoadmap.Resource("Arrays and Objects in JavaScript | Chai aur Code", "https://www.youtube.com/watch?v=gX0sziqPdPA")
                        ))
                        .build(),
                    com.eduvault.model.PredefinedRoadmap.Phase.builder()
                        .title("Core Language Features")
                        .critical(true)
                        .topics(List.of("Scope", "Hoisting", "This keyword", "Closures", "Execution model"))
                        .resources(List.of(
                            new com.eduvault.model.PredefinedRoadmap.Resource("Javascript for beginners | chai aur #javascript", "https://www.youtube.com/watch?v=PkZNo7mfNFY"),
                            new com.eduvault.model.PredefinedRoadmap.Resource("Scope and Closures in JavaScript | Chai aur Code", "https://www.youtube.com/watch?v=j51LIQcEaKU"),
                            new com.eduvault.model.PredefinedRoadmap.Resource("This Keyword in JavaScript | Chai aur Code", "https://www.youtube.com/watch?v=9oL5hXCCNq4"),
                            new com.eduvault.model.PredefinedRoadmap.Resource("Hoisting in JavaScript | Chai aur Code", "https://www.youtube.com/watch?v=pTjVJFA7WpI"),
                            new com.eduvault.model.PredefinedRoadmap.Resource("JavaScript Execution Context | Chai aur Code", "https://www.youtube.com/watch?v=8jRrxCII4M4")
                        ))
                        .build()
                ))
                .build());

        // JS Masterclass Part 2
        roadmaps.add(com.eduvault.model.PredefinedRoadmap.builder()
                .id("js-masterclass-part-2")
                .title("Part 2 – Master JavaScript & Become a Real Developer | Full Course")
                .subject("JavaScript")
                .totalHours("7.4")
                .phases(List.of(
                    com.eduvault.model.PredefinedRoadmap.Phase.builder()
                        .title("Advanced JavaScript")
                        .critical(true)
                        .topics(List.of("Asynchronous JavaScript", "Promises", "Fetch API", "DOM manipulation", "Events"))
                        .resources(List.of(new com.eduvault.model.PredefinedRoadmap.Resource("Part 2 – Master JavaScript & Become a Real Developer | Full Course", "")))
                        .build()
                ))
                .build());

        // JS Masterclass Part 3
        roadmaps.add(com.eduvault.model.PredefinedRoadmap.builder()
                .id("js-masterclass-part-3")
                .title("Part 3 – Advanced JavaScript, Projects & Real Developer Mindset | Full Course")
                .subject("JavaScript")
                .totalHours("4.3")
                .phases(List.of(
                    com.eduvault.model.PredefinedRoadmap.Phase.builder()
                        .title("Advanced Concepts and Projects")
                        .critical(true)
                        .topics(List.of("Object oriented JavaScript", "Prototype", "Classes", "Modules", "Project practice"))
                        .resources(List.of(new com.eduvault.model.PredefinedRoadmap.Resource("Part 3 – Advanced JavaScript, Projects & Real Developer Mindset | Full Course", "")))
                        .build()
                ))
                .build());

        // NodeJS Complete Course
        roadmaps.add(com.eduvault.model.PredefinedRoadmap.builder()
                .id("nodejs-complete-course")
                .title("NodeJS Complete Course by Piyush Garg")
                .subject("Backend Development")
                .totalHours("unknown")
                .phases(List.of(
                    com.eduvault.model.PredefinedRoadmap.Phase.builder()
                        .title("Node.js Fundamentals")
                        .critical(true)
                        .topics(List.of("Introduction to Node.js", "Environment setup", "Modules", "File handling", "How Node works"))
                        .resources(List.of(
                            new com.eduvault.model.PredefinedRoadmap.Resource("What is NodeJS?", ""),
                            new com.eduvault.model.PredefinedRoadmap.Resource("Node JS Installation", ""),
                            new com.eduvault.model.PredefinedRoadmap.Resource("Hello World NodeJS", "")
                        ))
                        .build(),
                    com.eduvault.model.PredefinedRoadmap.Phase.builder()
                        .title("Backend APIs and Express")
                        .critical(true)
                        .topics(List.of("HTTP server", "HTTP methods", "REST APIs", "Express middleware", "Postman"))
                        .resources(List.of(
                            new com.eduvault.model.PredefinedRoadmap.Resource("Getting Started with Express and NodeJS", ""),
                            new com.eduvault.model.PredefinedRoadmap.Resource("Building REST API's using Node and Express.js", "")
                        ))
                        .build(),
                    com.eduvault.model.PredefinedRoadmap.Phase.builder()
                        .title("Databases, Auth and Deployment")
                        .critical(true)
                        .topics(List.of("MongoDB", "Mongoose", "Authentication", "JWT", "Deployment"))
                        .resources(List.of(
                            new com.eduvault.model.PredefinedRoadmap.Resource("Connecting NodeJS with MongoDB | Mongoose + Express", ""),
                            new com.eduvault.model.PredefinedRoadmap.Resource("JWT Authentication in NodeJS", ""),
                            new com.eduvault.model.PredefinedRoadmap.Resource("Deploy NodeJS Application on AWS - Amazon Web Services | NodeJS", "")
                        ))
                        .build()
                ))
                .build());

        // Django Full Stack Course
        roadmaps.add(com.eduvault.model.PredefinedRoadmap.builder()
                .id("django-full-stack-course")
                .title("Chai aur Django | Complete Django Series")
                .subject("Python Web Development")
                .totalHours("unknown")
                .phases(List.of(
                    com.eduvault.model.PredefinedRoadmap.Phase.builder()
                        .title("Django Setup and Basics")
                        .critical(true)
                        .topics(List.of("Project setup", "File structure", "Templates", "Apps", "URL routing"))
                        .resources(List.of(
                            new com.eduvault.model.PredefinedRoadmap.Resource("Chai aur Django | Launch", ""),
                            new com.eduvault.model.PredefinedRoadmap.Resource("Start a Django project and file structure", "")
                        ))
                        .build(),
                    com.eduvault.model.PredefinedRoadmap.Phase.builder()
                        .title("Core Django Development")
                        .critical(true)
                        .topics(List.of("Forms", "Models", "Relationships", "Tailwind integration", "Jinja2-style templating"))
                        .resources(List.of(
                            new com.eduvault.model.PredefinedRoadmap.Resource("Handle model and urls in Django", ""),
                            new com.eduvault.model.PredefinedRoadmap.Resource("Django Relationship models", "")
                        ))
                        .build(),
                    com.eduvault.model.PredefinedRoadmap.Phase.builder()
                        .title("Project Building")
                        .critical(false)
                        .topics(List.of("Full stack project building", "Error handling", "Database-driven apps", "Practical implementation"))
                        .resources(List.of(new com.eduvault.model.PredefinedRoadmap.Resource("Build a full stack project in Django for beginners", "")))
                        .build()
                ))
                .build());

        // Java DSA Foundation Course
        roadmaps.add(com.eduvault.model.PredefinedRoadmap.builder()
                .id("java-dsa-foundation-course")
                .title("Java and DSA Foundation Course")
                .subject("Data Structures and Algorithms")
                .totalHours("50+")
                .phases(List.of(
                    com.eduvault.model.PredefinedRoadmap.Phase.builder()
                        .title("Java Basics")
                        .critical(true)
                        .topics(List.of("Java introduction", "Variables", "Input and output", "Operators", "Conditionals"))
                        .resources(List.of(
                            new com.eduvault.model.PredefinedRoadmap.Resource("Introduction to Java | Java Architecture | Lecture 1 | Java and DSA Foundation Course", ""),
                            new com.eduvault.model.PredefinedRoadmap.Resource("Variables & Input/Output in Java | Lecture 3 | Java and DSA Foundation Course", "")
                        ))
                        .build(),
                    com.eduvault.model.PredefinedRoadmap.Phase.builder()
                        .title("Core DSA")
                        .critical(true)
                        .topics(List.of("Arrays", "Recursion", "Sorting", "Binary search", "Strings"))
                        .resources(List.of(
                            new com.eduvault.model.PredefinedRoadmap.Resource("Arrays | Types, Declaration, Creation, Operations | Lecture 14 | Java and DSA Foundation Course", ""),
                            new com.eduvault.model.PredefinedRoadmap.Resource("Recursion | Recursion concept and problems | Lecture 27 | Java and DSA Course", ""),
                            new com.eduvault.model.PredefinedRoadmap.Resource("Binary Search Algorithm | Lecture-45 | Java and DSA Foundation course", "")
                        ))
                        .build(),
                    com.eduvault.model.PredefinedRoadmap.Phase.builder()
                        .title("Advanced Data Structures")
                        .critical(false)
                        .topics(List.of("Linked lists", "Stacks", "Queues", "Hashmaps", "Trees"))
                        .resources(List.of(
                            new com.eduvault.model.PredefinedRoadmap.Resource("Linked List in Java - Part 1 | Lecture 51 | Java and DSA Foundation Course", ""),
                            new com.eduvault.model.PredefinedRoadmap.Resource("Java Collections Framework in One Shot | Lecture 59 | JAVA and DSA Foundation Course", ""),
                            new com.eduvault.model.PredefinedRoadmap.Resource("Binary Trees in One Shot | Complete DSA in Java | DSA in Java", "")
                        ))
                        .build()
                ))
                .build());

        // Java Spring Boot Microservices
        roadmaps.add(com.eduvault.model.PredefinedRoadmap.builder()
                .id("java-spring-boot-microservices-spring-ai")
                .title("Complete Java Development: Spring Boot, Microservices, Spring AI")
                .subject("Java Backend Development")
                .totalHours("63")
                .phases(List.of(
                    com.eduvault.model.PredefinedRoadmap.Phase.builder()
                        .title("Spring Boot Fundamentals")
                        .critical(true)
                        .topics(List.of("Java backend basics", "Spring Boot setup", "REST APIs", "Dependency injection", "Application structure"))
                        .resources(List.of(new com.eduvault.model.PredefinedRoadmap.Resource("Complete Java Development: Spring Boot, Microservices, Spring AI", "")))
                        .build(),
                    com.eduvault.model.PredefinedRoadmap.Phase.builder()
                        .title("Microservices")
                        .critical(true)
                        .topics(List.of("Microservices architecture", "Service communication", "Scalability", "Distributed systems", "Spring Cloud concepts"))
                        .resources(List.of(new com.eduvault.model.PredefinedRoadmap.Resource("Complete Java Development: Spring Boot, Microservices, Spring AI", "")))
                        .build(),
                    com.eduvault.model.PredefinedRoadmap.Phase.builder()
                        .title("Spring AI and Advanced Topics")
                        .critical(false)
                        .topics(List.of("AI integration", "Modern backend development", "Production patterns", "Enterprise backend design", "Deployment concepts"))
                        .resources(List.of(new com.eduvault.model.PredefinedRoadmap.Resource("Complete Java Development: Spring Boot, Microservices, Spring AI", "")))
                        .build()
                ))
                .build());

        // Spring Boot Crash Course
        roadmaps.add(com.eduvault.model.PredefinedRoadmap.builder()
                .id("spring-boot-crash-course")
                .title("Build REST APIs in Spring Boot as a Complete Beginner | 2 Hrs Crash Course | Bootcamp")
                .subject("Java Backend Development")
                .totalHours("2")
                .phases(List.of(
                    com.eduvault.model.PredefinedRoadmap.Phase.builder()
                        .title("Spring Boot API Basics")
                        .critical(true)
                        .topics(List.of("Project setup", "Controllers", "Services", "REST endpoints", "CRUD APIs"))
                        .resources(List.of(new com.eduvault.model.PredefinedRoadmap.Resource("Build REST APIs in Spring Boot as a Complete Beginner | 2 Hrs Crash Course | Bootcamp", "")))
                        .build()
                ))
                .build());

        // Spring Boot Masterclass Hindi
        roadmaps.add(com.eduvault.model.PredefinedRoadmap.builder()
                .id("spring-boot-masterclass-hindi")
                .title("Master Spring Boot In one Video 🔥 Java Development For Beginners | Masterclass (Hindi)")
                .subject("Java Backend Development")
                .totalHours("unknown")
                .phases(List.of(
                    com.eduvault.model.PredefinedRoadmap.Phase.builder()
                        .title("Spring Boot Masterclass")
                        .critical(true)
                        .topics(List.of("Spring Boot fundamentals", "REST APIs", "Project structure", "Backend logic", "Practical Java backend"))
                        .resources(List.of(new com.eduvault.model.PredefinedRoadmap.Resource("Master Spring Boot In one Video 🔥 Java Development For Beginners | Masterclass (Hindi)", "")))
                        .build()
                ))
                .build());

        // Java Full Stack AWS Microservices
        roadmaps.add(com.eduvault.model.PredefinedRoadmap.builder()
                .id("java-full-stack-aws-microservices")
                .title("Complete Java Full Stack: AWS, Spring Boot, Microservices")
                .subject("Java Full Stack Development")
                .totalHours("unknown")
                .phases(List.of(
                    com.eduvault.model.PredefinedRoadmap.Phase.builder()
                        .title("Full Stack Backend Core")
                        .critical(true)
                        .topics(List.of("Spring Boot", "Microservices", "REST APIs", "Backend structure", "Java development"))
                        .resources(List.of(new com.eduvault.model.PredefinedRoadmap.Resource("Complete Java Full Stack: AWS, Spring Boot, Microservices", "")))
                        .build(),
                    com.eduvault.model.PredefinedRoadmap.Phase.builder()
                        .title("Cloud and Deployment")
                        .critical(false)
                        .topics(List.of("AWS basics", "Deployment", "Scalability", "Production workflow", "Cloud integration"))
                        .resources(List.of(new com.eduvault.model.PredefinedRoadmap.Resource("Complete Java Full Stack: AWS, Spring Boot, Microservices", "")))
                        .build()
                ))
                .build());

        // Spring Boot E-commerce API
        roadmaps.add(com.eduvault.model.PredefinedRoadmap.builder()
                .id("spring-boot-ecommerce-api")
                .title("Spring Boot Project: Build a REST API for an E-commerce Platform")
                .subject("Java Backend Development")
                .totalHours("unknown")
                .phases(List.of(
                    com.eduvault.model.PredefinedRoadmap.Phase.builder()
                        .title("E-commerce API Design")
                        .critical(true)
                        .topics(List.of("Product APIs", "User flows", "CRUD operations", "REST design", "Backend project structure"))
                        .resources(List.of(new com.eduvault.model.PredefinedRoadmap.Resource("Spring Boot Project: Build a REST API for an E-commerce Platform", "")))
                        .build()
                ))
                .build());

        // Spring Boot Full Stack AI Microservices Hindi
        roadmaps.add(com.eduvault.model.PredefinedRoadmap.builder()
                .id("spring-boot-full-stack-ai-microservices-hindi")
                .title("हिंदी Spring Boot Full Stack AI Microservices Project Course: Kafka, AWS, Keycloak, OAuth2 [TUTORIAL]")
                .subject("Java Full Stack Development")
                .totalHours("unknown")
                .phases(List.of(
                    com.eduvault.model.PredefinedRoadmap.Phase.builder()
                        .title("Enterprise Backend Stack")
                        .critical(true)
                        .topics(List.of("Spring Boot", "Microservices", "Kafka", "AWS", "Keycloak", "OAuth2"))
                        .resources(List.of(new com.eduvault.model.PredefinedRoadmap.Resource("हिंदी Spring Boot Full Stack AI Microservices Project Course: Kafka, AWS, Keycloak, OAuth2 [TUTORIAL]", "")))
                        .build()
                ))
                .build());

        // C++ Course Launch
        roadmaps.add(com.eduvault.model.PredefinedRoadmap.builder()
                .id("cpp-course-launch")
                .title("C++ Course launch | Chai aur C++")
                .subject("C++ Programming")
                .totalHours("unknown")
                .phases(List.of(
                    com.eduvault.model.PredefinedRoadmap.Phase.builder()
                        .title("C++ Fundamentals")
                        .critical(true)
                        .topics(List.of("Hello world", "Variables", "Data types", "Operators", "Conditionals"))
                        .resources(List.of(new com.eduvault.model.PredefinedRoadmap.Resource("C++ Course launch | Chai aur C++", "")))
                        .build(),
                    com.eduvault.model.PredefinedRoadmap.Phase.builder()
                        .title("Core C++ Concepts")
                        .critical(true)
                        .topics(List.of("Loops", "Functions", "OOP", "Pointers", "Constructors and destructors"))
                        .resources(List.of(
                            new com.eduvault.model.PredefinedRoadmap.Resource("Object Oriented Programming in C++", ""),
                            new com.eduvault.model.PredefinedRoadmap.Resource("Array, dynamic memory and Pointers in Cpp", ""),
                            new com.eduvault.model.PredefinedRoadmap.Resource("Constructor, destructor and Copy Constructor in C++", "")
                        ))
                        .build()
                ))
                .build());

        // Frontend Animations BarbaJS Skiper UI
        roadmaps.add(com.eduvault.model.PredefinedRoadmap.builder()
                .id("frontend-animations-barbajs-skiper-ui")
                .title("Frontend Animations and UI Series")
                .subject("Frontend Development")
                .totalHours("5")
                .phases(List.of(
                    com.eduvault.model.PredefinedRoadmap.Phase.builder()
                        .title("Animation Fundamentals")
                        .critical(true)
                        .topics(List.of("Animation libraries", "Motion design", "Scroll-based animation", "UI transitions", "Interactive effects"))
                        .resources(List.of(
                            new com.eduvault.model.PredefinedRoadmap.Resource("Animate ANYTHING in 2 Hours with THESE Amazing Libraries!", ""),
                            new com.eduvault.model.PredefinedRoadmap.Resource("Master Web Animations in 2 Hours | Build an Awwwards-Level Website", "")
                        ))
                        .build(),
                    com.eduvault.model.PredefinedRoadmap.Phase.builder()
                        .title("Page Transitions and UI Systems")
                        .critical(false)
                        .topics(List.of("Barba.js", "Smooth page transitions", "Modern UI building", "Reusable UI components", "Portfolio-level design"))
                        .resources(List.of(
                            new com.eduvault.model.PredefinedRoadmap.Resource("1/50 Frontend Technologies: Barba.js for smooth page transition", ""),
                            new com.eduvault.model.PredefinedRoadmap.Resource("Build Stunning UIs with This New Library | Skiper UI Full Project Tutorial", "")
                        ))
                        .build()
                ))
                .build());

        // Supabase Firebase Backend Tools
        roadmaps.add(com.eduvault.model.PredefinedRoadmap.builder()
                .id("supabase-firebase-backend-tools")
                .title("Supabase and Firebase Tutorials")
                .subject("Backend Tools")
                .totalHours("unknown")
                .phases(List.of(
                    com.eduvault.model.PredefinedRoadmap.Phase.builder()
                        .title("Supabase Basics")
                        .critical(true)
                        .topics(List.of("Database setup", "Auth basics", "Storage", "Realtime data", "Deployment"))
                        .resources(List.of(
                            new com.eduvault.model.PredefinedRoadmap.Resource("Learn Supabase (Firebase Alternative) – Full Tutorial for Beginners", ""),
                            new com.eduvault.model.PredefinedRoadmap.Resource("Day 1 | Introduction to Supabase and Setting Up Your First Project", ""),
                            new com.eduvault.model.PredefinedRoadmap.Resource("Day 2 | Working with Real-Time Data and Supabase Storage", ""),
                            new com.eduvault.model.PredefinedRoadmap.Resource("Day 3 | Advanced Supabase Features and Deployment", "")
                        ))
                        .build(),
                    com.eduvault.model.PredefinedRoadmap.Phase.builder()
                        .title("Firebase Basics")
                        .critical(false)
                        .topics(List.of("Firebase Studio", "Realtime database", "Cloud Firestore", "Cloud functions", "Hosting"))
                        .resources(List.of(
                            new com.eduvault.model.PredefinedRoadmap.Resource("Day 1 | Getting Started with Firebase Studio", ""),
                            new com.eduvault.model.PredefinedRoadmap.Resource("Day 2 | Real-Time Database & Cloud Firestore", ""),
                            new com.eduvault.model.PredefinedRoadmap.Resource("Day 3 | Cloud Functions, Hosting & Final Project", "")
                        ))
                        .build()
                ))
                .build());

        // Figma UI Design Series
        roadmaps.add(com.eduvault.model.PredefinedRoadmap.builder()
                .id("figma-ui-design-series")
                .title("Figma UI Design Tutorials")
                .subject("UI/UX Design")
                .totalHours("unknown")
                .phases(List.of(
                    com.eduvault.model.PredefinedRoadmap.Phase.builder()
                        .title("Figma Plugins and Portfolio Design")
                        .critical(true)
                        .topics(List.of("Figma plugins", "Portfolio design", "UI layout", "Design workflow", "Practical UI creation"))
                        .resources(List.of(new com.eduvault.model.PredefinedRoadmap.Resource("Create Beautiful Portfolio Design With These Figma Plugins! #figma #uidesign #portfolio", "")))
                        .build(),
                    com.eduvault.model.PredefinedRoadmap.Phase.builder()
                        .title("Advanced Motion in Figma")
                        .critical(false)
                        .topics(List.of("Smart animate", "Carousel animations", "Loaders", "Prototype motion", "Interaction design"))
                        .resources(List.of(new com.eduvault.model.PredefinedRoadmap.Resource("Advanced Smart Animate in Figma (Carousel, Loader & More)", "")))
                        .build()
                ))
                .build());

        // Cursor AI Web Design
        roadmaps.add(com.eduvault.model.PredefinedRoadmap.builder()
                .id("cursor-ai-web-design")
                .title("3 Ways to Build ACTUALLY Beautiful Websites Using Cursor AI")
                .subject("AI-Assisted Web Development")
                .totalHours("unknown")
                .phases(List.of(
                    com.eduvault.model.PredefinedRoadmap.Phase.builder()
                        .title("AI-Assisted Website Building")
                        .critical(true)
                        .topics(List.of("Cursor AI workflow", "Rapid website creation", "Design iteration", "Frontend generation", "Practical site building"))
                        .resources(List.of(new com.eduvault.model.PredefinedRoadmap.Resource("3 Ways to Build ACTUALLY Beautiful Websites Using Cursor AI", "")))
                        .build()
                ))
                .build());

        saveRoadmaps();
    }

    private void seedTimeline() throws IOException {
        timelineEvents.add(com.eduvault.model.TimelineEvent.builder()
                .id("e1")
                .title("Data Structures Midterm")
                .date(LocalDate.now().plusDays(2).toString())
                .time("09:30 AM")
                .tag("Exam")
                .priority("high")
                .active(true)
                .build());
        timelineEvents.add(com.eduvault.model.TimelineEvent.builder()
                .id("e2")
                .title("OS Lab Assignment")
                .date(LocalDate.now().plusDays(5).toString())
                .time("11:59 PM")
                .tag("Assignment")
                .priority("medium")
                .active(true)
                .build());
        saveTimeline();
    }
    
    public StudentProfile getProfile() {
        return profile;
    }
    
    public StudentProfile updateProfile(StudentProfile newProfile) {
        this.profile = newProfile;
        saveProfile();
        return this.profile;
    }

    private void updateSubjectCounts() {
        for (Subject s : subjects) {
            long count = notes.stream().filter(n -> n.getSubjectId().equals(s.getId())).count();
            s.setNoteCount((int) count);
        }
        saveSubjects();
    }

    public synchronized void setSubjects(List<Subject> newSubjects) {
        this.subjects = new ArrayList<>(newSubjects);
        saveSubjects();
    }

    public List<Subject> getAllSubjects() {
        return new ArrayList<>(subjects);
    }

    public List<Note> getAllNotes() {
        return new ArrayList<>(notes);
    }

    public Optional<Note> getNoteById(String id) {
        return notes.stream().filter(n -> n.getId().equals(id)).findFirst();
    }

    public void addNote(Note note) {
        notes.add(note);
        saveNotes();
    }
    
    public void updateNote(Note note) {
        for (int i = 0; i < notes.size(); i++) {
            if (notes.get(i).getId().equals(note.getId())) {
                notes.set(i, note);
                saveNotes();
                return;
            }
        }
    }
    
    public synchronized Optional<Note> updateNoteTags(String id, List<String> tags) {
        return notes.stream()
                .filter(note -> note.getId().equals(id))
                .findFirst()
                .map(note -> {
                    note.setTags(tags);
                    saveNotes();
                    return note;
                });
    }

    public void deleteNote(String id) {
        notes.removeIf(n -> n.getId().equals(id));
        saveNotes();
    }
    
    public Subject addSubject(Subject subject) {
        subjects.add(subject);
        saveSubjects();
        return subject;
    }

    public List<Note> getNotesByFilter(String subjectId, String semester, String examType, String keyword, String search, String department, String unit) {
        return notes.stream()
            .filter(n -> subjectId == null || subjectId.isEmpty() || n.getSubjectId().equals(subjectId))
            .filter(n -> department == null || department.isEmpty() || (n.getDepartment() != null && n.getDepartment().equalsIgnoreCase(department)))
            .filter(n -> semester == null || semester.isEmpty() || n.getSemester().equals(semester))
            .filter(n -> unit == null || unit.isEmpty() || (n.getUnit() != null && n.getUnit().equalsIgnoreCase(unit)))
            .filter(n -> examType == null || examType.isEmpty() || n.getExamType().equals(examType))
            .filter(n -> keyword == null || keyword.isEmpty() || n.getTitle().toLowerCase().contains(keyword.toLowerCase()))
            .filter(n -> {
                if (search == null || search.trim().isEmpty()) return true;
                String term = search.toLowerCase();
                boolean matchesTitle = n.getTitle() != null && n.getTitle().toLowerCase().contains(term);
                boolean matchesDepartment = n.getDepartment() != null && n.getDepartment().toLowerCase().contains(term);
                boolean matchesSemester = n.getSemester() != null && n.getSemester().toLowerCase().contains(term);
                boolean matchesSubject = false;
                if (n.getSubjectId() != null) {
                    Optional<Subject> sub = subjects.stream().filter(s -> s.getId().equals(n.getSubjectId())).findFirst();
                    if (sub.isPresent() && sub.get().getName().toLowerCase().contains(term)) {
                        matchesSubject = true;
                    }
                }
                return matchesTitle || matchesDepartment || matchesSemester || matchesSubject;
            })
            .collect(Collectors.toList());
    }

    // Doubt operations
    public List<com.eduvault.model.Doubt> getDoubtsByNoteId(String noteId) {
        return doubts.stream()
            .filter(d -> d.getNoteId().equals(noteId))
            .collect(Collectors.toList());
    }

    public void addDoubt(com.eduvault.model.Doubt doubt) {
        doubts.add(doubt);
        saveDoubts();
    }

    public void updateDoubt(com.eduvault.model.Doubt doubt) {
        for (int i = 0; i < doubts.size(); i++) {
            if (doubts.get(i).getId().equals(doubt.getId())) {
                doubts.set(i, doubt);
                saveDoubts();
                return;
            }
        }
    }

    // PYQ Methods
    public List<com.eduvault.model.PYQ> getAllPyqs() {
        return new ArrayList<>(pyqs);
    }

    public synchronized com.eduvault.model.PYQ addPyq(com.eduvault.model.PYQ pyq) {
        pyqs.add(pyq);
        savePyqs();
        return pyq;
    }

    public List<com.eduvault.model.PYQ> getPyqsByFilter(String subjectId, String examType) {
        return pyqs.stream()
            .filter(p -> (subjectId == null || subjectId.isEmpty() || p.getSubjectId().equals(subjectId)))
            .filter(p -> (examType == null || examType.isEmpty() || p.getExamType().equalsIgnoreCase(examType)))
            .collect(Collectors.toList());
    }

    // Announcement Methods
    public List<com.eduvault.model.Announcement> getAllAnnouncements() {
        return new ArrayList<>(announcements);
    }

    public synchronized com.eduvault.model.Announcement addAnnouncement(com.eduvault.model.Announcement announcement) {
        announcements.add(0, announcement); // Add to top
        saveAnnouncements();
        return announcement;
    }

    public List<com.eduvault.model.Announcement> getRecentAnnouncements(int count) {
        return announcements.stream().limit(count).collect(Collectors.toList());
    }

    public List<com.eduvault.model.PredefinedRoadmap> getAllRoadmaps() {
        return new ArrayList<>(roadmaps);
    }

    public Optional<com.eduvault.model.PredefinedRoadmap> getRoadmapById(String id) {
        return roadmaps.stream().filter(r -> r.getId().equals(id)).findFirst();
    }

    // Timeline CRUD
    public List<com.eduvault.model.TimelineEvent> getAllTimelineEvents() {
        return new ArrayList<>(timelineEvents);
    }

    public synchronized void addTimelineEvent(com.eduvault.model.TimelineEvent event) {
        timelineEvents.add(event);
        saveTimeline();
    }

    public synchronized void updateTimelineEvent(com.eduvault.model.TimelineEvent event) {
        for (int i = 0; i < timelineEvents.size(); i++) {
            if (timelineEvents.get(i).getId().equals(event.getId())) {
                timelineEvents.set(i, event);
                saveTimeline();
                return;
            }
        }
    }

    public synchronized void deleteTimelineEvent(String id) {
        timelineEvents.removeIf(e -> e.getId().equals(id));
        saveTimeline();
    }
}
