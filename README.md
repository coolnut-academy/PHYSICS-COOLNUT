# PHYSICS COOLNUT

> A modern physics learning hub for apps, ebooks, and quizzes.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore%20%2B%20Storage-FFCA28?logo=firebase)](https://firebase.google.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38BDF8?logo=tailwindcss)](https://tailwindcss.com/)

PHYSICS COOLNUT is a lightweight learning portal built for organizing and publishing physics-related resources in one clean interface. The public homepage groups content into three categories: `App`, `Ebook`, and `Quiz`. Admin users can manage cards, upload icons, reorder content, and enable or disable items from a protected dashboard.

## Current Product Shape

| Area | Status | Notes |
| --- | --- | --- |
| Public homepage | Ready | Displays enabled cards by category. Default tab is `Quiz`. |
| Content categories | Ready | Supports `App`, `Ebook`, and `Quiz`. |
| Admin dashboard | Ready | Add, edit, delete, reorder, and toggle content cards. |
| Image upload | Ready | Uploads card icons to Firebase Storage. |
| Auth guard | Ready | Admin area is protected with a secret-key session cookie. |
| Persistence | Ready | Firestore stores all card metadata and ordering. |

## Features

- Category switcher for `App`, `Ebook`, and `Quiz`
- Liquid-glass inspired card UI and responsive layout
- Firestore-backed content management
- Firebase Storage image upload with progress state
- Admin login via `ADMIN_SECRET_KEY`
- HTTP-only cookie session for admin access
- Protected `/admin` route through Next.js proxy middleware
- Card ordering, status toggle, and fallback gradient icons
- Backward compatibility for old category values:
  `student -> quiz`, `teacher -> ebook`, `both -> app`

## Tech Stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 16 App Router |
| UI | React 19, TypeScript |
| Styling | Tailwind CSS 4, custom global CSS |
| Icons | lucide-react |
| Database | Firebase Firestore |
| File storage | Firebase Storage |
| Auth | Next.js API routes, HTTP-only cookies |
| Deployment-ready config | Vercel config included |

## Project Structure

```txt
.
|-- public/
|   |-- logo.png
|-- src/
|   |-- app/
|   |   |-- admin/dashboard/page.tsx
|   |   |-- api/auth/check/route.ts
|   |   |-- api/auth/login/route.ts
|   |   |-- api/auth/logout/route.ts
|   |   |-- components/
|   |   |   |-- AdminLoginModal.tsx
|   |   |   |-- AppCard.tsx
|   |   |   |-- AppFormModal.tsx
|   |   |   |-- AppGrid.tsx
|   |   |   |-- HomeContent.tsx
|   |   |   |-- ZoneSwitcher.tsx
|   |   |-- globals.css
|   |   |-- layout.tsx
|   |   |-- page.tsx
|   |-- lib/
|   |   |-- firebase.ts
|   |   |-- firestore.ts
|   |   |-- storage.ts
|   |-- proxy.ts
|-- AGENTS.md
|-- Architech.md
|-- README.md
```

## Data Model

Firestore collection: `apps`

```ts
interface AppDocument {
  id?: string;
  name: string;
  url: string;
  iconUrl: string;
  zone: "app" | "ebook" | "quiz" | "student" | "teacher" | "both";
  color?: string;
  order: number;
  isEnabled?: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}
```

Category behavior:

| Stored value | Public category |
| --- | --- |
| `app` | App |
| `ebook` | Ebook |
| `quiz` | Quiz |
| `student` | Quiz legacy compatibility |
| `teacher` | Ebook legacy compatibility |
| `both` | App legacy compatibility |

## Environment Variables

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

ADMIN_SECRET_KEY=your_admin_secret
```

## Development

Install dependencies:

```bash
npm install
```

Run the local dev server:

```bash
npm run dev
```

Lint the project:

```bash
npm run lint
```

Build for production:

```bash
npm run build
```

Start the production build:

```bash
npm run start
```

## Admin Workflow

1. Open the public homepage.
2. Click the hidden admin lock in the footer badge.
3. Enter the admin secret key.
4. Manage cards from `/admin/dashboard`.
5. Add or edit a card with name, URL, category, icon, and fallback color.
6. Use reorder controls to change display order.
7. Use the status toggle to temporarily hide or show cards.

## Important Implementation Notes

- The public homepage defaults to the `Quiz` category.
- The admin form writes new cards using `app`, `ebook`, or `quiz`.
- Older Firestore records are still supported so existing data does not need an immediate migration.
- `getApps()` intentionally fetches directly from Firestore without a custom cache.
- Image uploads are limited in the form UI to image files up to 2 MB.
- Admin sessions last 24 hours and are stored in an HTTP-only cookie named `admin_session`.

## Documentation

- [AGENTS.md](./AGENTS.md): contributor and coding-agent operating guide
- [Architech.md](./Architech.md): system architecture, data flow, and module responsibilities

## Deployment Checklist

- Firebase project is configured.
- Firestore collection `apps` exists or can be created by the app.
- Firebase Storage rules allow intended authenticated or public upload/read behavior.
- `.env.local` values are configured in the deployment platform.
- `ADMIN_SECRET_KEY` is strong and not committed to Git.
- Run `npm run lint` and `npm run build` before deployment.

## Maintainer Notes

PHYSICS COOLNUT is designed as a simple, fast, teacher-friendly content launcher rather than a full LMS. Keep future changes focused on low-friction publishing, reliable content access, and a polished experience for students.
