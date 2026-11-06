# EduVault E2E Test Infrastructure Specification

## 1. Overview & Architecture
This document specifies the End-to-End (E2E) and integration test infrastructure for the **EduVault Overnight OKF Markdown Batch Generation & Fast AI Query Serving** system.

### Core Objectives
1. **Opaque-Box Verification**: Validate that all 9 features defined in `PROJECT.md` satisfy their behavioral and contract specifications without coupling tests to internal private implementation details.
2. **Progressive Testability**: Provide executable tests that run cleanly in CI/CD without requiring live external Gemini API keys or external object storage (Backblaze B2).
3. **Sub-second Execution**: Entire test suite executes in `< 5 seconds` using JUnit 5, Mockito, SnakeYAML, and in-memory test doubles.
4. **Google OKF Standards Compliance**: Rigorously verify that generated Markdown knowledge bundles comply with the Google Open Knowledge Format (OKF) specification (YAML frontmatter + semantic Markdown hierarchy).

---

## 2. 4-Tier Opaque-Box Testing Methodology

```
┌─────────────────────────────────────────────────────────────┐
│ Tier 4: Real-World Scenarios (End-to-End User Journeys)     │
│ - Faculty Upload -> Overnight Batch -> Student AI Query     │
│ - Deep-Link from Notes Library -> Fast OKF Serving          │
│ - Graceful Fallbacks & High-Traffic Idle Gate               │
├─────────────────────────────────────────────────────────────┤
│ Tier 3: Cross-Feature Combinations (Pairwise Integration)   │
│ - Note Upload -> Batch Compile -> Query Serving             │
│ - Subject Switching & Multi-Unit Knowledge Separation       │
│ - Partial Batch Error Isolation & State Persistence         │
├─────────────────────────────────────────────────────────────┤
│ Tier 2: Boundary & Corner Cases (Stress & Resilience)       │
│ - Empty notes, 200k char payloads, missing subject/units    │
│ - Concurrent batch triggers & active request interruptions  │
│ - Corrupted YAML frontmatter recovery & API quota timeouts  │
├─────────────────────────────────────────────────────────────┤
│ Tier 1: Feature Coverage (Isolated Happy Paths >= 5/feat)   │
│ - Features 1 to 9: Scheduling, Generator, Batch, Schema,    │
│   Knowledge Service, Query Routing, Frontend Contracts      │
└─────────────────────────────────────────────────────────────┘
```

### Tier 1 — Feature Coverage (Isolated Happy Paths)
- **Minimum Threshold**: $\ge 5$ test cases per feature across all 9 features in `PROJECT.md`.
- **Focus**: Verifies core functional requirements, method contracts, and return values under nominal operating conditions.

### Tier 2 — Boundary, Corner & Adversarial Cases
- **Minimum Threshold**: $\ge 5$ boundary/corner cases per feature.
- **Focus**: Extreme input sizes, empty text, invalid UTF-8, non-existent subjects, active request interruptions, concurrent batch triggers, corrupted frontmatter, and LLM rate-limit fallbacks.

### Tier 3 — Cross-Feature Combinations (Pairwise Integration)
- **Focus**: Verifies interaction contracts across modules:
  - `ApiController` (Upload) $\rightarrow$ `OkfBatchService` (Compile) $\rightarrow$ `OkfKnowledgeService` (Cache) $\rightarrow$ `AiController` (Query).
  - Subject isolation and multi-unit separation.
  - Idle detection gate pausing/resuming batch execution.

### Tier 4 — Real-World Application Scenarios
- **Minimum Threshold**: $\ge 5$ comprehensive end-to-end user workflows.
- **Focus**: Complete user journeys matching the real-world operational cycle of EduVault faculty and students.

---

## 3. Test Suite Inventory

| Test Class | Scope / Target | Tiers Covered | Test Count |
|------------|----------------|---------------|------------|
| `com.eduvault.e2e.OkfSpecificationContractTest` | Google OKF schema validation, YAML parsing, ActivityTracker idle logic | Tier 1, Tier 2 | 15 |
| `com.eduvault.e2e.OkfBatchGenerationE2ETest` | Overnight & idle batch processing, manual trigger, status tracking, error resilience | Tier 1, Tier 2 | 12 |
| `com.eduvault.e2e.OkfQueryServingE2ETest` | Subject-aware query routing, frontmatter topic filtering, context budgeting, caching | Tier 1, Tier 2 | 12 |
| `com.eduvault.e2e.OkfCrossFeatureIntegrationTest` | Pairwise cross-feature interactions, subject isolation, multi-unit scoping, idle gates | Tier 3 | 8 |
| `com.eduvault.e2e.OkfRealWorldScenarioTest` | End-to-end faculty upload to student AI query real-world workflows | Tier 4 | 6 |
| **Total** | **Comprehensive OKF E2E Test Suite** | **Tiers 1–4** | **53 Tests** |

---

## 4. Google OKF Test Specimen & Frontmatter Schema

Each generated OKF Markdown document is validated against the following Google OKF standard specification:

```markdown
---
type: "academic_notes"
title: "CPU Scheduling Algorithms"
description: "Preemptive and non-preemptive CPU scheduling policies including Round Robin and SJF."
subject_id: "sub-os-101"
subject_name: "Operating Systems"
unit: "Unit 2"
tags: ["cpu-scheduling", "round-robin", "sjf", "preemptive"]
syllabus_topics: ["CPU Scheduling Basics", "Round Robin", "Shortest Job First", "Priority Scheduling"]
sources: ["note-101"]
last_compiled: "2026-11-04T02:00:00Z"
status: "active"
---

# Operating Systems: CPU Scheduling Algorithms

## 1. Overview
CPU scheduling is the basis of multiprogrammed operating systems...

## 2. Key Concepts & Definitions
- **Time Quantum**: The fixed time slice allocated to each process in Round Robin scheduling.
- **Preemption**: The ability of the OS to interrupt a running process...
```

And the subject manifest `index.md`:
```markdown
---
type: "subject_index"
subject_id: "sub-os-101"
subject_name: "Operating Systems"
units_covered: ["Unit 1", "Unit 2"]
total_notes_compiled: 2
last_compiled: "2026-11-04T02:00:00Z"
---

# Operating Systems — Knowledge Bundle Index
- [Unit 1: Process Management](unit1.md)
- [Unit 2: CPU Scheduling](note-101.md)
```

---

## 5. Execution & CI/CD Guide

### Run Backend Unit & E2E Tests
```powershell
cd d:\PROJECTS\Java\EduVault\backend
mvn test
```

### Run E2E Test Suite Only
```powershell
cd d:\PROJECTS\Java\EduVault\backend
mvn test -Dtest="com.eduvault.e2e.*Test"
```

### Run Specific Test Class
```powershell
cd d:\PROJECTS\Java\EduVault\backend
mvn test -Dtest="OkfRealWorldScenarioTest"
```

### Key Assertions & Diagnostics
- Tests use JUnit 5 (`org.junit.jupiter.api.*`) and AssertJ (`org.assertj.core.api.Assertions.*`).
- YAML validation leverages `org.yaml.snakeyaml.Yaml`.
- In-memory test files use temporary directories (`@TempDir java.nio.file.Path tempDir`) cleaned up automatically after execution.
