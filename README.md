# ProfTrack — Modern Instructor Progressive Web App (PWA)

A high-performance, offline-first Progressive Web App designed for university professors and instructors to manage course schedules, track weekly syllabus accomplishments, log post-class topics, and generate instant accomplishment reports in audit-ready PDF format.

---

## ✨ Features

- **🏛️ Course Schedule Management**:
  - Full support for **Lecture Only (GE)** and **Lecture + Laboratory (MAJOR)** schedules.
  - Configure days, time slots, room assignments, and sections.
  - Dynamic status indicators (*Upcoming*, *In Progress*, *Completed*).

- **📄 1-Tap Word (.docx) Syllabus Importer**:
  - Automatically parses the **Detailed Course Learning Plan** table from university Word syllabi.
  - Extracts clean, weekly topic outlines without manual data entry.

- **📊 Syllabus Accomplishment & Inspection**:
  - Visual completion percentage bars for each course.
  - Detailed Course Inspector showing covered topics vs. remaining syllabus items.

- **📝 Post-Class Logging**:
  - Check off topics covered during each lecture or lab.
  - Log student engagement levels (*Low*, *Medium*, *High*) and next action notes.

- **📑 Accomplishment Reports & PDF Export**:
  - Monthly aggregation of teaching sessions and topics completed.
  - Instant 1-click **Download PDF Report** generated via `jspdf` and `jspdf-autotable`.

- **⚡ Offline-First Dual-Layer Persistence**:
  - Instant reads/writes via browser `IndexedDB` & `localStorage` (ideal for lecture halls with poor Wi-Fi).
  - Background synchronization with Firebase Cloud Firestore and Web Push Notifications.

- **♿ WCAG 2.1 AA & shadcn/ui Design**:
  - Clean, distraction-free aesthetic with high contrast typography and accessible touch targets.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS v4, Lucide React, Geist Font
- **Document Parsing & Export**: Mammoth.js, jsPDF, jsPDF-AutoTable
- **Storage & PWA**: Firebase Firestore (IndexedDB persistence cache), Service Workers, Web Push API

---

## 🚀 Getting Started Locally

1. **Clone the repository**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
   cd instructor-pwa
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the local development server**:
   ```bash
   npm run dev
   ```

4. **Build for production**:
   ```bash
   npm run build
   ```

---

## 🌐 Deployment Guides

### Deploy to Vercel (Recommended • 1-Command)
```bash
npx vercel
```

### Deploy to Firebase Hosting
```bash
npm run build
npx -y firebase-tools login
npx -y firebase-tools deploy --only hosting
```

---

## 📄 License
MIT License. Built for university educators.
