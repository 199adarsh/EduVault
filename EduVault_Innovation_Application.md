# EduVault — YUKTI MIC Innovation Application (Form-Ready Responses)

> **Usage:** Copy each answer directly into the corresponding YUKTI portal field.
> Items marked `[TO BE CONFIRMED]` must be replaced before submission.

---

## 1. Title / Name (20 Words Max)

```
EduVault: Centralised Academic Platform with Cryptographic Ultrasonic Offline Smart Attendance for Higher Education Institutions
```

*Word Count: 14 / 20*

---

## 2. Developed as part of

```
[TO BE CONFIRMED: e.g., "Academic Project / SIH Internal Hackathon / Curriculum Project" — select from dropdown]
```

`[TO BE CONFIRMED: Select the dropdown option that best matches. If SIH is listed, choose that. Otherwise choose "Curriculum / Academic Project".]`

---

## 3. Choose the Financial Year, during the Idea-PoC/Innovation Developed

```
2025-26
```

`[TO BE CONFIRMED: If development started before April 2025, select 2024-25 instead.]`

---

## 4. Academic Year

```
2025-26
```

`[TO BE CONFIRMED: Match to your actual enrollment academic year.]`

---

## 5. Sector / Domain

```
Education / EdTech
```

*(Select the dropdown option closest to "Education", "EdTech", or "ICT".)*

---

## 6. Theme

```
Smart Education
```

*(Select the dropdown option closest to "Smart Education", "Digital Education", "IoT", or "Smart Campus".)*

---

## 7. Innovation Type

```
Product Innovation
```

*(Select from dropdown. EduVault is a product — software platform + proposed IoT hardware.)*

---

## 8. Development Stage — Technology Readiness Level (TRL)

```
TRL 3: Experimental Proof of Concept
```

**Justification (for your reference, not for the form):**
- EduVault web portal (React, Spring Boot, PostgreSQL) is functional in dev/staging → TRL 4 for software alone.
- Ultrasonic attendance (ESP32 beacon + Android acoustic pipeline) is at architecture and simulation stage → TRL 3.
- Overall system assessed conservatively at **TRL 3** since hardware-software integration is not yet validated in a live classroom.

*(Refer: [YUKTI TRL Stages PDF](https://yukti.mic.gov.in/assets/developement-stages-trl-mrl-irl.pdf))*

---

## 9. Define the problem and its relevance to today's market / society / industry need (Max: 100 Words)

```
Indian higher education institutions manage student academic records across fragmented portals, paper registers, and departmental spreadsheets. Attendance tracking remains especially unreliable: manual roll calls waste 10–15% of lecture time, while QR codes are easily screenshotted and forwarded to absent students for proxy check-ins. Bluetooth and GPS methods fail indoors due to signal bleeding through walls and location spoofing. Many classrooms in tier-2 and tier-3 institutions lack reliable internet, rendering cloud-only attendance systems unusable. This fragmentation delays continuous evaluation, undermines accreditation compliance (NAAC/NBA), and prevents institutions from identifying at-risk students early enough for academic intervention.
```

*Word Count: 97 / 100*

---

## 10. Describe the Solution / Proposed / Developed (Max: 100 Words)

```
EduVault is a centralised web platform aggregating student academic records, internal assessment marks, previous-year questions, learning roadmaps, announcements, and AI-assisted study support. To address attendance fraud, EduVault proposes an ultrasonic offline attendance module. A low-cost ESP32 classroom beacon broadcasts cryptographically signed, time-bounded ultrasonic challenges (18–21 kHz) confined within room walls. Students authenticate via fingerprint biometrics on registered smartphones; the app signs the challenge using hardware-backed Android Keystore keys. Attendance records are cached locally when offline and batch-synchronised with the backend upon connectivity restoration, providing verifiable physical presence records without mandatory classroom internet.
```

*Word Count: 95 / 100*

---

## 11. Explain the uniqueness and distinctive features of the (product / process / service) solution (Max: 100 Words)

```
EduVault uniquely combines centralised academic record management with hardware-assisted physical proximity verification. Key distinctive features include: (1) Ultrasonic room confinement — 18–21 kHz acoustic signals are absorbed by classroom walls, preventing check-ins from outside; (2) Hardware-bound device identity — ECDSA keypairs generated inside Android Keystore's StrongBox/TEE hardware are non-exportable and cannot be cloned; (3) Biometric-gated signing — each attendance payload requires real-time fingerprint or face verification before the cryptographic key unlocks; (4) Offline-first architecture — signed records stored locally survive network outages and are validated server-side upon synchronisation using historical nonce logs.
```

*Word Count: 95 / 100*

---

## 12. How your proposed / developed (product / process / service) solution is different from similar kind of product by the competitors if any (Max: 100 Words)

```
Conventional LMS platforms (Moodle, Google Classroom) manage coursework but lack integrated physical presence verification. Existing digital attendance systems use static QR codes (easily forwarded via WhatsApp), Bluetooth RSSI (bleeds through drywall into corridors), or GPS geofencing (spoofable and inaccurate indoors). Commercial biometric kiosks create doorway bottlenecks and require expensive infrastructure. EduVault differs by integrating academic records with wall-confined ultrasonic beaconing, hardware-bound cryptographic device identity, mandatory biometric authentication, and resilient offline caching — all using student-owned smartphones and a low-cost classroom beacon, eliminating dedicated biometric hardware costs while providing stronger anti-proxy assurance than QR, BLE, or GPS methods.
```

*Word Count: 98 / 100*

---

## 13. Is there any IP or Patentable Component associated with the Solution?

**Select:** `No`

*(No patent has been filed or granted. A potential patentable concept exists around the ultrasonic challenge-response + hardware Keystore binding method, but no prior-art search or application has been conducted.)*

`[TO BE CONFIRMED: If your college IPR cell has filed a provisional patent, change to "Yes" and provide details.]`

---

## 14. Has the Solution Received any Innovation Grant / Seed Fund Support?

**Select:** `No`

`[TO BE CONFIRMED: If you received SSIP, AICTE Idea Lab, college project grant, or any funding — change to "Yes" and add scheme name, amount, and date.]`

---

## 15. Are there any Recognitions (State / National / International) Obtained by the Solution?

**Select:** `No`

`[TO BE CONFIRMED: If EduVault was shortlisted in SIH, won a college hackathon, or received any award — change to "Yes" and list recognition, level, and date.]`

---

## 16. Is the Solution Commercialized either through Technology Transfer or Enterprise Development / Startup?

**Select:** `No`

*(EduVault is an academic project. No company incorporated, no licensing agreement, no technology transfer.)*

---

## 17. Had the Solution Received any Pre-Incubation / Incubation Support?

**Select:** `No`

`[TO BE CONFIRMED: If your college IIC, incubation centre, or AIC provided mentorship or workspace — change to "Yes" and provide details.]`

---

## 18. Video URL

```
[TO BE CONFIRMED: Paste unlisted YouTube or Google Drive link here]
```

**Recommended demo video (2–3 min):**
| Timestamp | Content |
|---|---|
| 0:00–0:45 | Live walkthrough of EduVault dashboard — marks, PYQ vault, roadmaps, AI assistant |
| 0:45–1:45 | Ultrasonic attendance concept — ESP32 beacon, Android biometric prompt, crypto signature |
| 1:45–2:30 | Offline demo — network off → local cache → reconnect → backend validation → confirmed |

---

## 19. Upload Photograph (JPG, PNG, PDF — max 2 MB)

```
[TO BE CONFIRMED: Export and upload architecture diagram or dashboard screenshot]
```

**Recommended:** System architecture diagram showing React dashboard → Spring Boot API → PostgreSQL → Android client (Keystore + BiometricPrompt) → ESP32 ultrasonic beacon → sync flow.

**File requirements:**
- Format: JPG, PNG, or single-page PDF
- Size: **Under 2.0 MB**
- Resolution: 1920×1080 minimum

---

## Checklist: Confirm Before Submission

| # | Item | Status |
|---|---|---|
| 1 | College name, department, mentor added to Field 2 | ☐ |
| 2 | Financial year verified (Field 3) | ☐ |
| 3 | Academic year verified (Field 4) | ☐ |
| 4 | Sector/Domain matched to portal dropdown (Field 5) | ☐ |
| 5 | Theme matched to portal dropdown (Field 6) | ☐ |
| 6 | Innovation Type matched to portal dropdown (Field 7) | ☐ |
| 7 | TRL matched to portal dropdown (Field 8) | ☐ |
| 8 | Grants/funding status confirmed (Field 14) | ☐ |
| 9 | Awards/recognitions confirmed (Field 15) | ☐ |
| 10 | Incubation support confirmed (Field 17) | ☐ |
| 11 | Demo video recorded and URL pasted (Field 18) | ☐ |
| 12 | Architecture diagram exported under 2 MB (Field 19) | ☐ |
| 13 | All `[TO BE CONFIRMED]` placeholders replaced | ☐ |
