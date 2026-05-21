# Architech.md

> Architecture notes for PHYSICS COOLNUT.

This document describes the current system architecture, module boundaries, data flow, and operational assumptions. The filename intentionally follows the requested spelling: `Architech.md`.

## 1. System Overview

PHYSICS COOLNUT is a Next.js application that works as a curated content launcher for physics learning resources. It has two primary surfaces:

- Public experience: students browse categorized cards and open resources.
- Admin experience: authorized users manage cards and upload icons.

The application is intentionally compact:

- Next.js handles routing, rendering, auth APIs, and route protection.
- React components handle UI state and interactions.
- Firestore stores card metadata.
- Firebase Storage stores uploaded card icons.

```txt
Browser
  |
  |-- Public homepage
  |     |-- fetches cards from Firestore
  |     |-- filters by App / Ebook / Quiz
  |     |-- opens card URLs in a new tab
  |
  |-- Admin dashboard
        |-- protected by admin_session cookie
        |-- creates, edits, deletes, reorders cards
        |-- uploads icons to Firebase Storage
```

## 2. High-Level Architecture

```txt
Next.js App Router
|
|-- Public UI
|   |-- HomeContent
|   |-- ZoneSwitcher
|   |-- AppGrid
|   |-- AppCard
|
|-- Admin UI
|   |-- AdminDashboard
|   |-- AppFormModal
|   |-- AdminLoginModal
|
|-- API Routes
|   |-- /api/auth/login
|   |-- /api/auth/check
|   |-- /api/auth/logout
|
|-- Proxy Middleware
|   |-- protects /admin/*
|
|-- Firebase Client Layer
    |-- firestore.ts
    |-- storage.ts
    |-- firebase.ts
```

## 3. Runtime Flow

### Public Homepage

1. `src/app/page.tsx` renders the public entry point.
2. `HomeContent` calls `getApps()`.
3. `getApps()` reads all documents from the Firestore `apps` collection ordered by `order`.
4. `HomeContent` converts Firestore docs into card data.
5. The selected category filters the cards.
6. `AppGrid` renders the visible cards.
7. `AppCard` opens the card URL in a new browser tab.

Default category:

```txt
quiz
```

Category normalization:

```txt
app     -> App
ebook   -> Ebook
quiz    -> Quiz
student -> Quiz legacy
teacher -> Ebook legacy
both    -> App legacy
```

### Admin Login

1. Admin opens login modal from the footer lock button.
2. `AdminLoginModal` posts the secret key to `/api/auth/login`.
3. The API compares the input with `ADMIN_SECRET_KEY`.
4. On success, the API sets `admin_session` as an HTTP-only cookie.
5. The UI redirects to `/admin/dashboard`.

### Admin Route Guard

1. Requests to `/admin/*` pass through `src/proxy.ts`.
2. The proxy checks for `admin_session`.
3. It validates token structure and max age.
4. Invalid or expired sessions redirect to `/?showLogin=true`.

### Admin Content Management

1. Dashboard calls `getApps()` and renders all cards.
2. Add/edit opens `AppFormModal`.
3. Form submission calls `addApp()` or `updateApp()`.
4. Reorder calls `reorderApp()`.
5. Toggle calls `updateApp()` with `isEnabled`.
6. Delete calls `deleteImage()` and then `deleteApp()`.

### Image Upload

1. Admin selects an image in `AppFormModal`.
2. File is validated by type and size.
3. `uploadImage()` uploads to Firebase Storage.
4. Upload progress updates the form state.
5. The returned download URL is saved as `iconUrl`.

## 4. Data Architecture

Firestore collection:

```txt
apps
```

Document shape:

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

Field notes:

| Field | Purpose |
| --- | --- |
| `name` | Card title. Supports HTML rendering in card label. |
| `url` | Destination opened when the card is clicked. |
| `iconUrl` | Firebase Storage URL, external URL, local path, or empty fallback. |
| `zone` | Persisted category field. New values should be `app`, `ebook`, or `quiz`. |
| `color` | Tailwind gradient class for fallback icon. |
| `order` | Ascending display order. |
| `isEnabled` | `false` hides/disables behavior. Missing value is treated as enabled. |
| `createdAt` | Creation timestamp. |
| `updatedAt` | Last update timestamp. |

## 5. Module Responsibilities

### `src/app/components/HomeContent.tsx`

- Owns public page state.
- Fetches card data.
- Applies category normalization and filtering.
- Opens admin login modal when `showLogin=true`.

### `src/app/components/ZoneSwitcher.tsx`

- Renders the three-category selector.
- Owns visual style for active category indicator.
- Emits category changes to `HomeContent`.

### `src/app/components/AppCard.tsx`

- Displays icon and title.
- Handles disabled state.
- Opens resource URL.
- Provides fallback letter icon when no usable icon URL exists.

### `src/app/components/AppFormModal.tsx`

- Handles create/edit form state.
- Normalizes legacy categories when editing old records.
- Uploads images.
- Submits card data to the admin dashboard callback.

### `src/app/admin/dashboard/page.tsx`

- Checks auth status.
- Loads all cards.
- Provides CRUD operations.
- Renders category badges and dashboard stats.

### `src/lib/firestore.ts`

- Central Firestore CRUD layer.
- Keeps ordering operations in one place.
- Adds and updates timestamps.

### `src/lib/storage.ts`

- Central Firebase Storage layer.
- Uploads images with progress.
- Attempts safe image deletion.

### `src/proxy.ts`

- Protects `/admin/:path*`.
- Redirects unauthenticated users back to the homepage login flow.

## 6. Security Model

The current auth model is simple and suitable for a small internal admin:

- Admin password is stored as `ADMIN_SECRET_KEY`.
- Successful login creates a base64 session token containing a timestamp and secret-derived content.
- Session is stored as an HTTP-only cookie.
- Session max age is 24 hours.
- `/admin` routes are guarded by proxy middleware.

Important constraints:

- This is not a multi-user auth system.
- There are no per-admin roles.
- If the project grows, migrate to Firebase Auth or another proper identity provider.

## 7. Styling Architecture

Styling is split between:

- Tailwind utility classes in components
- Global design primitives in `src/app/globals.css`

The visual system uses:

- Glass panels
- Soft gradients
- Rounded cards
- Subtle glow and blur effects
- Mobile-first responsive spacing

Keep future UI updates consistent with that direction unless intentionally redesigning the brand.

## 8. Operational Assumptions

- Firestore and Storage are configured through environment variables.
- Public Firebase config values use `NEXT_PUBLIC_`.
- Admin secret stays server-only.
- Cards are sorted by the numeric `order` field.
- The app does not rely on a local mock database.
- The app is optimized for a small-to-medium number of content cards.

## 9. Known Tradeoffs

| Area | Current Choice | Tradeoff |
| --- | --- | --- |
| Auth | Secret key and cookie | Very simple, but not role-based. |
| Category field | Persisted as `zone` | Backward compatible, but name is less semantically perfect. |
| Data loading | Fetch all cards | Simple and reliable for small catalogs; pagination may be needed later. |
| Card title | Supports HTML | Flexible line breaks, but input should be trusted/admin-only. |
| Firebase client use | Client-side SDK | Fast to build, depends on correct Firebase rules. |

## 10. Future Improvements

- Rename `zone` to `category` after a planned Firestore migration.
- Add Firebase Auth or role-based admin accounts.
- Add search and tags for larger content catalogs.
- Add optimistic updates in the admin dashboard.
- Add Firestore security rules documentation.
- Add automated tests for category normalization and admin workflows.
- Add metadataBase in `src/app/layout.tsx` for production social previews.
