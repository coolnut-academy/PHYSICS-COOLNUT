# AGENTS.md

This file gives coding agents and human contributors a shared operating guide for the PHYSICS COOLNUT repository.

## Mission

PHYSICS COOLNUT is a small, production-minded learning portal. The priority is to keep content publishing simple for the admin and content discovery delightful for students.

When making changes, optimize for:

- Reliability over cleverness
- Clear UI behavior over hidden magic
- Backward compatibility with existing Firestore records
- Fast onboarding for future maintainers
- A polished, responsive frontend

## Project Snapshot

- Framework: Next.js 16 App Router
- Language: TypeScript
- UI: React 19
- Styling: Tailwind CSS 4 plus `src/app/globals.css`
- Backend: Next.js API routes
- Database: Firebase Firestore
- Storage: Firebase Storage
- Admin auth: `ADMIN_SECRET_KEY` plus HTTP-only cookie

## Commands

Use these from the repository root:

```bash
npm install
npm run dev
npm run lint
npm run build
npm run start
```

Before finishing meaningful code changes, run:

```bash
npm run lint
npm run build
```

For small documentation-only changes, `npm run lint` is optional unless code was touched.

## Source Map

| Path | Responsibility |
| --- | --- |
| `src/app/page.tsx` | Public app entry point |
| `src/app/components/HomeContent.tsx` | Public homepage state, fetching, category filtering |
| `src/app/components/ZoneSwitcher.tsx` | Category tab switcher |
| `src/app/components/AppGrid.tsx` | Card grid and empty state |
| `src/app/components/AppCard.tsx` | Public content card |
| `src/app/components/AppFormModal.tsx` | Admin add/edit card form and icon upload |
| `src/app/components/ContentPageFormModal.tsx` | Admin add/edit form for custom pages |
| `src/app/components/ContentPageManager.tsx` | Admin dashboard panel for custom pages |
| `src/app/components/ContentPageLauncherGrid.tsx` | Homepage launchers for enabled custom pages |
| `src/app/components/ContentPageView.tsx` | Public custom page with its own tab switcher |
| `src/app/hub/[slug]/page.tsx` | Public route for custom page launcher |
| `src/app/admin/dashboard/page.tsx` | Admin dashboard CRUD UI |
| `src/app/api/auth/*/route.ts` | Login, logout, and session check APIs |
| `src/lib/firebase.ts` | Firebase client initialization |
| `src/lib/firestore.ts` | Firestore CRUD helpers |
| `src/lib/storage.ts` | Firebase Storage upload/delete helpers |
| `src/proxy.ts` | Admin route protection |

## Category Rules

Current canonical categories:

- `app`
- `ebook`
- `quiz`

Legacy values must remain readable:

- `student` maps to `quiz`
- `teacher` maps to `ebook`
- `both` maps to `app`

The public homepage should show only the selected category. Do not make `app` content appear in every tab unless the product requirement explicitly changes.

The default public tab is `quiz`.

## Data Contract

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
  pageId?: string; // Optional custom page ID
  tabId?: string;  // Optional custom tab ID
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}
```

Firestore collection: `contentPages`

```ts
interface ContentPageTab {
  id: string;      // Stable tab ID
  title: string;   // Tab title
  order: number;   // Display order (0-indexed)
  isEnabled: boolean;
}

interface ContentPageDocument {
  id?: string;
  title: string;   // Page title
  slug: string;    // Unique URL slug
  tabs: ContentPageTab[];
  order: number;   // Display order on homepage launchers
  isEnabled: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}
```

Notes:

- New writes on `AppDocument` should use only `app`, `ebook`, or `quiz`.
- Cards placed inside custom pages contain both `pageId` and `tabId`. They are excluded from root lists and shown under `/hub/[slug]` route.
- If a card is moved back to root categories, `pageId` and `tabId` are deleted from the Firestore document using `deleteField()`.
- Deletion of pages and tabs containing cards is blocked to prevent accidental content loss.
- `isEnabled !== false` means visible/enabled by default.

## UI Guidelines

- Preserve the existing liquid-glass visual language unless the task asks for a redesign.
- Keep layouts responsive on mobile and desktop.
- Avoid generic boilerplate UI. The current style is soft, glassy, bright, and educational.
- Use lucide-react icons consistently.
- Keep Thai text readable and encoded as UTF-8.
- Be careful with PowerShell file writes involving Thai text. Prefer `apply_patch` for hand edits.

## Firebase Guidelines

- Never commit `.env.local`.
- Keep Firebase config in `src/lib/firebase.ts`.
- Keep Firestore operations in `src/lib/firestore.ts`.
- Keep Storage operations in `src/lib/storage.ts`.
- Deleting a card should attempt to delete its Firebase-hosted icon, but failures should not crash the whole admin flow.

## Auth Guidelines

- Admin access is intentionally simple: secret key login and an HTTP-only cookie.
- Protected admin routing lives in `src/proxy.ts`.
- API endpoints live under `src/app/api/auth`.
- Do not expose `ADMIN_SECRET_KEY` to the client.
- Public Firebase env vars can use the `NEXT_PUBLIC_` prefix; private secrets cannot.

## Git And Editing Safety

- Do not revert unrelated user changes.
- Do not run destructive git commands unless explicitly requested.
- Keep documentation and code changes focused.
- If you see unexpected user edits while working, pause and ask how to proceed.
- Prefer small, reviewable patches over broad rewrites.

## Definition Of Done

For code changes:

- The behavior requested by the user is implemented.
- `npm run lint` passes.
- `npm run build` passes unless the user asked for a very small edit and build is not necessary.
- New behavior is documented if it changes category, auth, data, or admin workflow.

For documentation changes:

- The docs reflect the current code.
- Commands and paths are accurate.
- Sensitive values are represented as placeholders only.
