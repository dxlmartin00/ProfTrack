# ProfTrack (Instructor PWA) - Comprehensive Project Memory

> [!IMPORTANT]
> **CRITICAL RULE**: Do not modify or update this memory file unless the user explicitly requests an update or asks to view its contents.

---

## 1. Project Overview & Architecture
- **Application Name**: ProfTrack (Instructor Daily Academic Timetable & Topic Accomplishment Tracker PWA)
- **Repository**: `dxlmartin00/ProfTrack`
- **Target Platform**: Progressive Web App (PWA) optimized for Laptops, Tablets, and Mobile Smartphones (iOS / Android).
- **Core Design Principle**: 100% Offline-First, multi-tenant isolated local storage, zero mandatory external API calls, clean error-free console.
- **Tech Stack**:
  - **Framework**: React 19 / 18, TypeScript, Vite
  - **Styling**: Tailwind CSS (Monochromatic, clean typography, zinc neutral palette, outline buttons)
  - **Icons**: `lucide-react` (Camera outline, Smartphone, Clock, BookOpen, FileDown, ShieldCheck, etc.)
  - **Date Utilities**: `date-fns`
  - **Document Parsing**: `mammoth` (Clientside Word `.docx` table and text extraction)
  - **Reporting & Export**: `html2canvas` & `jspdf` (High-resolution tabular accomplishment reports)
  - **Offline Sync & QR**: `qrcode-generator` (Level L high-density SVG), `lz-string` (URI-safe compression)
  - **Security & Sanitization**: `dompurify` (SVG/HTML sanitization), Pure TS RFC 6234 SHA-256 engine
  - **PWA Service Worker**: `vite-plugin-pwa` with `generateSW` Workbox precaching

---

## 2. Faculty Loading Matrix & Academic Rules

### Day Code Standards:
- `MH` = **Monday & Thursday** (Monday = Day 1, Thursday = Day 4)
- `TF` = **Tuesday & Friday** (Tuesday = Day 2, Friday = Day 5)
- `W` = **Wednesday** (Wednesday = Day 3)
- `S` = **Saturday** (Saturday = Day 6)

### Section Shortening Rule:
- Take the first number and the trailing letter (e.g. `CS314D` ➔ **`3D`**, `BE21407D` ➔ **`2D (BE)`**, `FM21403D` ➔ **`2D (FM)`**, `FM21803H` ➔ **`2H (FM)`**).

### Official 8 Loaded Courses (Semester Matrix):
1. **CS 314** (CS Elective 1, Section: `3D`):
   - **Lecture**: Monday & Thursday, 01:00 PM – 02:00 PM (Room `CL2`)
   - **Laboratory**: Tuesday & Friday, 02:30 PM – 04:00 PM (Room `CL2`)
2. **CS 315** (Application Development & Emerging Tech, Section: `3B`):
   - **Lecture**: Monday & Thursday, 08:00 AM – 09:00 AM (Room `128`)
   - **Laboratory**: Monday & Thursday, 02:30 PM – 04:00 PM (Room `CL2`)
3. **CS 315** (Application Development & Emerging Tech, Section: `3D`):
   - **Lecture**: Tuesday & Friday, 10:00 AM – 11:00 AM (Room `127`)
   - **Laboratory**: Tuesday & Friday, 11:00 AM – 12:30 PM (Room `IL2`)
4. **CS 412** (Operating Systems, Section: `4A`):
   - **Lecture**: Monday & Thursday, 11:00 AM – 12:00 PM (Room `127`)
   - **Laboratory**: Wednesday, 01:00 PM – 04:00 PM (Room `IL2`)
5. **CS 412** (Operating Systems, Section: `4B`):
   - **Lecture**: Monday & Thursday, 09:00 AM – 10:00 AM (Room `129`)
   - **Laboratory**: Tuesday & Friday, 04:00 PM – 05:30 PM (Room `IL2`)
6. **eGE 1** (Living in the IT Era, Section: `2D (BE)`):
   - **Lecture**: Tuesday & Friday, 07:30 AM – 09:00 AM (Room `GF003`)
7. **eGE 1** (Living in the IT Era, Section: `2D (FM)`):
   - **Lecture**: Monday & Thursday, 04:00 PM – 05:30 PM (Room `122`)
8. **eGE 1** (Living in the IT Era, Section: `2H (FM)`):
   - **Lecture**: Wednesday, 08:00 AM – 11:00 AM (Room `130`)

---

## 3. Syllabus & Detailed Course Learning Plan Standards

### Philippine / University (NEMSU / CHED OBE) Format:
- **Strict Table Isolation**: Only parse inside the **"Detailed Course Learning Plan"** table (`<table>`). Discard all text, course descriptions, headers, and bibliographies outside the table.
- **Target Column Only**: Extract strictly from the **`TOPICS`** / **`COURSE CONTENT`** column (Column 2). Completely ignore *Learning Outcomes (LOs)*, *Performance Indicators (PIs)*, *Instructional Methodologies*, *Learning Materials*, and *Assessments*.
- **Item 1 Consolidation Rule**: University Vision, Mission, Core Values, Quality Policy, Hymn, Outcomes, and Grading System are combined into **1 single topic**:
  `Orientation: University Vision & Mission, Course Outcomes, Policies & Grading System`
- **Clean Topic Names**: Strip out any `"Week 1:"`, `"Week 2 -"`, `"W1"`, or numeric list prefixes (`1.`, `1.1`). Store only pure topic names.
- **Stop Condition & Signature Exclusion**:
  - Stop parsing immediately upon reaching `Week 18` / `Final Exam`.
  - Discard all signature and approval lines (`CONTENTS NOTED BY`, `CHRISTINE W. PITOS, MSCS`, `Program Coordinator, BSCS`, `Chair, DCS`, `Dean`, `Date: _____`).

### Full Master Syllabus Example (CS 315):
1. `Orientation: University Vision & Mission, Course Outcomes, Policies & Grading System`
2. `Introduction to Application Development & Emerging Technologies`
3. `Ethical and Legal Considerations of App Development`
4. `Mobile App Architecture & Design Patterns`
5. `Modern Frontend Frameworks & State Management`
6. `Backend API Development & Microservices`
7. `Cloud Services & Serverless Computing`
8. `UI/UX Principles`
9. `Midterm Exam`
10. `Introduction to Java & Android Studio Setup`
11. `Android Activities & XML Layouts`
12. `Event Handling & User Interaction`
13. `Data Storage in Android and CRUD Operations (Java + SQLite)`
14. `Connecting Apps to APIs`
15. `Testing the Mobile App`
16. `Deployment & App Launch + App Enhancement`
17. `Final Project Defense`
18. `Final Exam`

---

## 4. Feature Set & UI Components

### 1. Daily Timetable (`DailyTimetable.tsx`)
- Shows current active class with live progress bar and countdown indicator.
- Action Toolbar:
  - **`[ + Add Course ]`**: Manual course creation.
  - **`[ 📷 Scan Image ]`**: Clean outline button with Camera icon (no colored background) for schedule screenshot imports.
  - **`[ 📱 Transfer ]`**: Laptop ⇄ Phone QR transfer and backup modal.
  - **`[ 📄 Reports ]`**: Accomplishment report generator.
- Schedule cards perfectly aligned and bounded without horizontal overflow.

### 2. Post-Class Topic Logging (`PostClassUpdateModal.tsx`)
- Misclick-aware checklist: unchecking older topics cleans older records safely.
- Quick topic coverage selection, partial progress recording, slide/page notes, and engagement rating (`High`, `Medium`, `Low`).
- Non-destructive note management: completing a partial class session preserves prior notes while advancing to the next syllabus lesson.

### 3. Word Syllabus Uploader (`SyllabusUploadModal.tsx` & `docxParser.ts`)
- Upload Word `.docx` or paste text directly.
- Clientside table extraction targeting the OBE learning plan.
- Accessible directly from the Course Inspector (`CourseDetailModal.tsx`) via **`[ 📄 Upload Word Syllabus (.docx) ]`**.

### 4. Instructor Profile Modal (`ProfileModal.tsx`)
- Manages Full Name, Title, Position, Department, Institution, Employee ID, and Email.
- Header displays dynamic round avatar badge with live computed initials (e.g. `DM` for Dan Martin).

### 5. Laptop ⇄ Phone Data Transfer (`DataTransferModal.tsx` & `codec.ts`)
- **QR Code Sync**:
  - Uses **Differential Template Hydration (`packTransferPayload`)** to omit redundant master syllabus text strings.
  - Reduces QR payload size by **97%** (from 59,196 bits down to ~1,800 bits), guaranteeing that QR codes never overflow and render instantly.
  - Level `L` Error Correction with scalable SVG.
  - Deep-link (`#import=...`) automatically unpacks and hydrates full records on phone scan.
- **Offline File Backup**: Export/Import `.json` files.
- **Sync Codes**: Copy/paste direct compressed transit strings.

### 6. Monthly Accomplishment Reports (`ReportModal.tsx`)
- Formats accomplished lecture and lab hours, covered topics, and date ranges into official university report tables.
- Downloads crisp printable PDF documents via `html2canvas` + `jsPDF`.

---

## 5. Multi-Tenant Faculty & Dedicated Administrator Architecture

### Master Administrator (`admin.admin`):
- **Credentials**: Username `admin.admin` • PIN `0000` • Role `admin` • Status `approved`.
- **Purpose**: Strictly manages faculty accounts, approvals, PIN resets, and account deactivations.
- **Isolation**: Has zero classes, timetables, or course logs assigned. Upon login, renders the dedicated `AdminAccountManagementView.tsx` workspace.

### Faculty Teaching Accounts:
- **Username Convention**: `<lastname>.<firstname>` (e.g., `martin.dan`).
- **Default PIN**: `1234`.
- **Prof. Dan Martin**: Initialized as a normal instructor account (`martin.dan`) with full 8 courses, syllabi, notes, and session logs.
- **Registration Workflow**:
  - New instructors register via `AuthModal.tsx` with First Name, Last Name, College, and PIN.
  - Account is created with `status: 'pending'` awaiting administrator approval.
  - Administrators review pending registrations in `AdminAccountManagementView.tsx` or `AdminDashboardModal.tsx` and can Approve or Reject.
  - Unregistered sign-in attempts offer an instant **`[ Create Account Now → ]`** helper that pre-populates name fields from the entered username.

### Administrative Console Controls:
- **Live Status Switching**: Approve, Reject, or set to Pending with instant UI feedback.
- **PIN Reset**: Administrators can reset an instructor's forgotten PIN to default `1234` without ever seeing the instructor's private PIN.
- **Account Deletion & Tombstones**: Safely removes an account and cleans its storage keys. Uses tombstone flags (`proftrack_dan_martin_deleted`) so deleted accounts are never resurrected on page reload.
- **Live Synchronization**: Broadcasts `proftrack_accounts_updated` events across components and tabs so newly registered accounts appear immediately under Pending Approvals.

### Data Isolation Scheme:
- `proftrack_classes_<userId>`: Isolated active course matrix.
- `proftrack_session_logs_<userId>`: Isolated session logs and accomplishment history.
- `proftrack_profile_<userId>`: Isolated instructor faculty profile.

---

## 6. Cross-Device Synchronization Engine (`sync.ts`)
- **"Latest Device Wins" Conflict Resolution**:
  - Compares microsecond timestamps (`updatedAt`) on state snapshots across devices.
  - Identifies originating device via unique `deviceId` and user-friendly `deviceLabel` (e.g., `"Windows Laptop"`, `"iPhone"`).
  - Automatically resolves sync conflicts when scanning QR codes, importing backup files, or syncing via cloud Firestore.
- **Navigation Sync Status**: Mounts live `[ ⇄ Sync ]` indicator in the header with full status inspection via `DeviceSyncModal.tsx`.

---

## 7. Security Architecture & Cryptographic Fortifications (`crypto.ts`)
- **Salted SHA-256 PIN Hashing**:
  - Implements an RFC 6234 compliant pure TypeScript SHA-256 digest engine.
  - Each account receives a unique 16-byte cryptographically secure random salt (`crypto.getRandomValues`).
  - Stored credentials use salted hashes: `hashPinWithSalt(pin, salt)`. Plaintext PINs are never stored in `localStorage` or displayed anywhere in the UI.
  - Existing legacy plaintext accounts are automatically and transparently upgraded to salted SHA-256 hashes upon startup.
- **Brute-Force Rate Limiting & Temporary Lockout**:
  - Monitors consecutive failed login attempts per account.
  - Warns users with remaining attempt counts: `Incorrect credentials. (X attempts remaining before lockout)`.
  - Automatically locks out authentication for **5 minutes** after 5 consecutive failed attempts (`proftrack_sec_lockout_<username>`).
  - Uses generic responses to prevent user enumeration attacks.
- **Prototype Pollution Defense**:
  - All JSON unpacking operations (QR transfers, backup file imports, registry reads) use `safeJsonParse`, which recursively rejects hazardous keys (`__proto__`, `constructor`, `prototype`).
- **Payload Length & ReDoS Mitigation**:
  - Enforces a 500 KB limit on imported transit payloads to prevent memory exhaustion and ReDoS attacks.
  - Sanitizes transit strings via `sanitizeString` to strip HTML tags and invisible control characters.
- **XSS & DOM Sanitization**:
  - Uses `DOMPurify` to sanitize all rendered SVG markup generated for QR code scanning (`USE_PROFILES: { svg: true, svgFilters: true }`).
- **Administrative Permission Verification**:
  - All administrative mutations (`updateUserStatus`, `resetUserPin`, `deleteUser`) verify authorization via `verifyAdminSession(callerId)` against authenticated admin state.

---

## 8. Offline Resilience & Console Cleanliness
- **No Console Errors**: Firebase initialization and queries are fully guarded behind `isFirebaseConfigured`. The app operates in standalone local mode without throwing `400 Bad Request` or auth errors.
- **No Page Refresh Loops**: Single consolidated service worker registered via `VitePWA`. Initial load effects run once with empty dependency arrays (`[]`).
- **All State Persisted**: `classes`, `logs`, and `profile` are synchronized continuously to isolated browser `localStorage`.
