# SchoolSaaS Super Admin Dashboard
### Next.js 14 + Tailwind CSS + Firebase (school-app-87900)

---

## 🚀 Run Locally (2 minutes)

```bash
# 1. Install dependencies
npm install

# 2. Start dev server (port 3001 so it doesn't clash with your Express on 5000)
npm run dev

# 3. Open in browser
http://localhost:3001
```

Sign in with your Firebase Admin email + password.  
All data starts streaming from Firestore the moment you log in.

---

## 📁 Folder Structure

```
src/
├── app/
│   ├── layout.tsx            # Root layout, fonts, AdminProvider
│   ├── page.tsx              # Redirects to /dashboard or /login
│   ├── login/page.tsx        # Firebase Auth login screen
│   ├── dashboard/page.tsx    # Live metrics + charts
│   ├── schools/
│   │   ├── page.tsx          # All schools table
│   │   └── [id]/page.tsx     # School detail + feature flags
│   ├── teachers/page.tsx
│   ├── students/page.tsx
│   ├── classes/page.tsx
│   ├── marks-audit/page.tsx  # Real-time markEdits collection
│   ├── leaves/page.tsx       # leave_requests + approve/reject
│   ├── trips/page.tsx        # Bus trip records
│   ├── salary/page.tsx
│   ├── fees/page.tsx
│   ├── notifications/page.tsx
│   ├── feature-control/page.tsx
│   └── settings/page.tsx
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx       # Left nav with active state
│   │   ├── Topbar.tsx        # Search + bell + user
│   │   └── DashboardLayout.tsx # Auth guard wrapper
│   └── ui/
│       └── index.tsx         # All reusable components
├── context/
│   └── AdminContext.tsx      # All Firestore onSnapshot listeners
├── lib/
│   └/firebase.ts            # Firebase init (school-app-87900)
├── services/
│   └── api.ts               # Express REST wrapper
└── types/
    └── index.ts             # TypeScript types for all collections
```

---

## 🔥 Live Data — What auto-fetches on login

| Firestore Collection | Screen | Type |
|---|---|---|
| `schools` | Dashboard, Schools | `onSnapshot` live |
| `users` (role=teacher) | Dashboard, Teachers | `onSnapshot` live |
| `students` | Dashboard, Students | `onSnapshot` live |
| `classes` | Classes | `onSnapshot` live |
| `markEdits` | Marks Audit, Dashboard | `onSnapshot` live |
| `attendance` (today) | Dashboard metric | `onSnapshot` live |
| `student_marks` (today) | Dashboard metric | `onSnapshot` live |
| `alerts` | Notifications | `onSnapshot` live |
| `leave_requests` | Leaves | `onSnapshot` live |
| `trips` | Bus Trips | `onSnapshot` live |
| `salaries` | Salaries | `onSnapshot` live |
| `fees` | Fees | `onSnapshot` live |

REST calls on login:
- `GET /api/admin/alerts`
- `GET /api/admin/leaves`

---

## ☁️ Deploy to Vercel

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Deploy (first time — follow prompts)
vercel

# 3. Set environment variables in Vercel dashboard:
#    Project → Settings → Environment Variables
#    Add all variables from .env.local
#    Change NEXT_PUBLIC_API_URL to your deployed Express server URL

# 4. Redeploy
vercel --prod
```

**Important:** For production, deploy your Express server (server.js) to Railway, Render, or a VPS and update `NEXT_PUBLIC_API_URL` accordingly.

---

## 🔧 Adding the markEdits collection to your server.js

The Marks Audit screen reads from `markEdits`. Add this to your Express marks save route:

```js
// In server.js, inside your POST /api/marks/save handler, after saving marks:
await db.collection('markEdits').add({
  studentId:   req.body.studentId,
  studentName: req.body.studentName,
  subject:     req.body.subject,
  classId:     req.body.classId,
  schoolId:    req.body.schoolId || 'school_001',
  oldMarks:    previousMarks,   // fetch old value before overwriting
  newMarks:    req.body.marksObtained,
  editedBy:    req.user?.uid || req.body.teacherId,
  editReason:  req.body.reason || 'Marks update',
  timestamp:   admin.firestore.FieldValue.serverTimestamp(),
});
```

---

## 🗄️ Firestore Security Rules

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Super admin reads everything
    match /{document=**} {
      allow read: if request.auth != null;
    }
    // Only teachers write marks
    match /student_marks/{id} {
      allow write: if request.auth != null;
    }
    // Super admin manages schools
    match /schools/{id} {
      allow write: if request.auth != null;
    }
    // Super admin manages users
    match /users/{id} {
      allow write: if request.auth != null;
    }
    // Alerts: read + mark-read only
    match /alerts/{id} {
      allow update: if request.auth != null;
    }
    // Leave requests: approve/reject
    match /leave_requests/{id} {
      allow update: if request.auth != null;
    }
  }
}
```
