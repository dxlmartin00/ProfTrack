# ProfTrack — Project Memory

## Overview
ProfTrack is a production-ready Progressive Web App (PWA) for college instructors at North Eastern Mindanao State University (NEMSU). It provides academic timetable management, syllabus tracking, session logging, and automated monthly accomplishment report generation.

## Deployment
- **Firebase Project**: `teaching-log-e1c57`
- **Live URL**: https://teaching-log-e1c57.web.app
- **GitHub**: https://github.com/dxlmartin00/ProfTrack.git (branch: `main`)
- **Workspace**: `C:\Users\nemsu\.gemini\antigravity\scratch\instructor-pwa`

## Tech Stack
- React 19 + TypeScript + Vite
- Tailwind CSS v4 + Geist font
- Firebase Hosting, Firestore (cloud sync + tombstones)
- Workbox PWA (offline-first, service worker)
- Lucide React icons

## Architecture

### Authentication & Accounts (`src/services/auth.ts`)
- **Master Admin**: `admin.admin` / PIN `0000` — manages instructor approvals only
- **Instructor Registration**: lastname.firstname format, 4-digit PIN, requires admin approval
- **No demo accounts**: Dan Martin account fully removed (tombstone system prevents resurrection)
- **Tombstone system**: Deleted accounts are recorded in Firestore `/tombstones` collection and local `proftrack_deleted_users` — prevents re-sync from cloud
- **Security**: Salted PIN hashing, 5-attempt lockout with 5-minute cooldown
- **Cloud sync**: User registry syncs bidirectionally with Firestore `/users` and `/user_sync`

### Data Flow
- **Local-first**: All data persists in localStorage per-user (`proftrack_classes_{userId}`, etc.)
- **Cloud sync**: Changes auto-push to Firestore `/account_sync/{userId}` with "latest device wins" conflict resolution
- **Live listener**: `onSnapshot` subscription for real-time cross-device updates
- **New users start blank**: No pre-loaded courses or logs — users add/import their own

### Key Components
| File | Purpose |
|------|---------|
| `src/App.tsx` | Main app shell, state management, data persistence |
| `src/components/AuthModal.tsx` | Sign-in / registration forms |
| `src/components/DailyTimetable.tsx` | Today's schedule view with class cards |
| `src/components/CalendarView.tsx` | Weekly calendar grid |
| `src/components/PostClassUpdateModal.tsx` | Session logging after class |
| `src/components/CourseDetailModal.tsx` | Course inspector with syllabus & logs |
| `src/components/AddClassModal.tsx` | Add/edit course form |
| `src/components/ProfileModal.tsx` | Instructor profile editor + schedule clear |
| `src/components/ReportModal.tsx` | Monthly accomplishment PDF report generator |
| `src/components/AdminDashboardModal.tsx` | Admin panel for account management |
| `src/components/AdminAccountManagementView.tsx` | Approve/reject/delete instructor accounts |
| `src/components/DataTransferModal.tsx` | QR code data transfer between devices |
| `src/components/DeviceSyncModal.tsx` | Cloud sync status & manual sync controls |
| `src/components/ScheduleUploadModal.tsx` | Screenshot-to-schedule OCR import |
| `src/components/SyllabusUploadModal.tsx` | Word .docx syllabus import |
| `src/components/NotificationModal.tsx` | Push notification preferences |
| `src/components/AccessibilityModal.tsx` | Theme (light/dark) & accessibility settings |
| `src/components/KeyboardShortcutsModal.tsx` | Power-user keyboard shortcuts reference |
| `src/components/AnalyticsCharts.tsx` | Teaching analytics visualizations |

### Services
| File | Purpose |
|------|---------|
| `src/services/auth.ts` | Authentication, user registry, registration, tombstones |
| `src/services/db.ts` | Firestore CRUD (classes, logs, users, tombstones) |
| `src/services/sync.ts` | Cross-device sync snapshots & timestamps |
| `src/services/theme.ts` | Dark/light mode & accessibility persistence |
| `src/services/pwa.ts` | Service worker registration & update prompts |
| `src/services/notificationService.ts` | Push notification scheduling & history |

### Utilities
| File | Purpose |
|------|---------|
| `src/utils/generatePdf.ts` | Monthly accomplishment PDF report generation |
| `src/utils/docxParser.ts` | Word .docx syllabus file parser |
| `src/utils/codec.ts` | QR code data compression/decompression |
| `src/utils/crypto.ts` | PIN hashing utilities |
| `src/utils/courseProgress.ts` | Syllabus progress calculation |

## Production Rules
- **No demo data**: No hardcoded courses, logs, or sample accounts
- **No demo UI**: No "Quick Demo Access" buttons, no "Load Demo" options
- **No "Prof." prefix**: Registration uses plain "FirstName LastName" format
- **Institution default**: North Eastern Mindanao State University
- **Tombstone enforcement**: Deleted accounts cannot resurrect via cloud sync
- **Blank start**: New instructors begin with empty schedule, add courses via manual entry or screenshot import

## Firebase Configuration
- **Firestore collections**: `users`, `user_sync`, `account_sync`, `classes`, `session_logs`, `tombstones`
- **Firestore rules**: Enforce tombstone checks on user writes
- **Hosting**: Static SPA deploy from `dist/`

## Git Conventions
- Commits use conventional format: `feat()`, `fix()`, `style()`, `chore()`
- Pre-commit: Never commit API keys (`AIza...`) or `.env` files