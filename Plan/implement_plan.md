# Dynamic Content Page Builder — Implementation Plan

## 1. Implementation Objective

Implement administrator-created public pages with administrator-created tabs, then allow existing app/card records to be assigned to a selected custom page and tab while preserving all existing PHYSICS COOLNUT behavior.

This plan assumes the current documented stack:

- Next.js App Router;
- React and TypeScript;
- Tailwind CSS plus `globals.css`;
- Firebase Firestore;
- Firebase Storage;
- secret-key admin authentication;
- existing `apps` collection.

Before editing, verify the real repository because documentation may not reflect every recent change.

## 2. Non-Negotiable Constraints

- Do not remove or rename the existing `apps` collection.
- Do not rename the persisted `zone` field.
- Preserve legacy zone mappings.
- Do not migrate all existing records unless absolutely necessary.
- Do not expose `ADMIN_SECRET_KEY` to client code.
- Do not replace the existing authentication system.
- Do not introduce another icon library.
- Do not run destructive Git commands.
- Do not revert unrelated user changes.
- Keep all new code in TypeScript.
- Keep the Liquid Glass design language.
- Run lint and production build before completion.

## 3. Phase 0 — Repository Audit

Inspect at minimum:

```text
AGENTS.md
Architech.md
.agent or .agents skill files
package.json
src/app/components/HomeContent.tsx
src/app/components/ZoneSwitcher.tsx
src/app/components/AppGrid.tsx
src/app/components/AppCard.tsx
src/app/components/AppFormModal.tsx
src/app/admin/dashboard/page.tsx
src/lib/firestore.ts
src/lib/storage.ts
src/lib/firebase.ts
src/app/globals.css
src/proxy.ts
next.config.ts
tsconfig.json
```

Confirm:

- the actual `AppDocument` type location;
- how `getApps()` currently sorts and returns data;
- how root categories are normalized;
- how card reordering currently works;
- how add/edit callbacks pass data;
- whether `AppCard` uses `next/image` or `<img>`;
- whether Firestore security rules are included in the repository;
- whether tests already exist;
- whether the admin dashboard is one component or can be safely split.

Do not begin broad refactoring before this audit.

## 4. Phase 1 — Add Shared Types and Placement Utilities

### 4.1 Add types

Use the project’s existing type organization. If no shared types file exists, create a focused file such as:

```text
src/lib/content-types.ts
```

Recommended types:

```ts
export interface ContentPageTab {
  id: string;
  title: string;
  order: number;
  isEnabled: boolean;
}

export interface ContentPageDocument {
  id?: string;
  title: string;
  slug: string;
  tabs: ContentPageTab[];
  order: number;
  isEnabled: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface AppPlacement {
  mode: "root" | "custom";
  zone?: "app" | "ebook" | "quiz";
  pageId?: string;
  tabId?: string;
}
```

Extend `AppDocument` with:

```ts
pageId?: string;
tabId?: string;
```

Keep the existing `zone` union including legacy values.

### 4.2 Add helpers

Create or centralize utilities:

```ts
normalizeCategory(zone)
isCustomPageApp(app)
getAppPlacement(app)
normalizeSlug(input)
createStableTabId()
validatePageTabs(tabs)
```

Expected placement inference:

```ts
function isCustomPageApp(app: AppDocument): boolean {
  return Boolean(app.pageId && app.tabId);
}
```

Root views must use:

```ts
!app.pageId
```

before applying normal zone filtering.

### 4.3 Avoid duplicate category normalization

If `normalizeCategory()` is duplicated in multiple components, move it into a shared utility only if the change is small and safe. Update all callers and verify legacy behavior.

## 5. Phase 2 — Add Firestore CRUD for Content Pages

Prefer adding the new functions to `src/lib/firestore.ts` if the file remains manageable. If it becomes too large, create:

```text
src/lib/content-pages.ts
```

This still complies with the rule that Firestore logic lives under `src/lib/`.

### 5.1 Collection

Use:

```text
contentPages
```

### 5.2 Required functions

Implement typed helpers similar to:

```ts
getContentPages(): Promise<ContentPageDocument[]>
getEnabledContentPages(): Promise<ContentPageDocument[]>
getContentPageById(id: string): Promise<ContentPageDocument | null>
getContentPageBySlug(slug: string): Promise<ContentPageDocument | null>
addContentPage(input): Promise<string>
updateContentPage(id, patch): Promise<void>
deleteContentPage(id): Promise<void>
reorderContentPages(orderedIds: string[]): Promise<void>
isContentPageSlugAvailable(slug: string, excludeId?: string): Promise<boolean>
countAppsForPage(pageId: string): Promise<number>
countAppsForTab(pageId: string, tabId: string): Promise<number>
```

Use Firestore timestamps consistently with the current code.

### 5.3 Query strategy

For the first release:

- `getContentPages()` may fetch all pages and sort by `order`;
- `getContentPageBySlug()` should query by `slug` with a limit of one;
- custom page cards can be queried by `pageId` and sorted client-side if avoiding a new composite index;
- document any required Firestore composite index if `where(pageId)` plus `orderBy(order)` is used.

### 5.4 Add custom-card helpers

Add functions or extend existing ones:

```ts
getAppsForPage(pageId: string): Promise<AppDocument[]>
getAppsForTab(pageId: string, tabId: string): Promise<AppDocument[]>
reorderAppsWithinPlacement(...): Promise<void>
```

Root `getApps()` can remain broad, but public filtering must exclude custom-page cards from fixed categories.

## 6. Phase 3 — Build Admin Content Page Management

### 6.1 Add dashboard section

Add a clear admin navigation choice:

```text
จัดการการ์ด
จัดการหน้าที่สร้างเอง
```

Do not overload the existing card list with page-builder controls.

Possible components:

```text
src/app/components/ContentPageManager.tsx
src/app/components/ContentPageFormModal.tsx
```

Use the project’s existing modal patterns.

### 6.2 Content page list

Show:

- title;
- slug;
- number of tabs;
- enabled/disabled state;
- move up/down controls;
- edit button;
- delete button.

Optional if inexpensive:

- number of assigned cards.

### 6.3 Create/edit page modal

Fields:

```text
ชื่อหน้า
Slug
รายการแท็บ
สถานะเปิดใช้งาน
```

Tab editor behavior:

- start with one blank tab for new pages;
- add tab row;
- rename tab;
- move tab up/down;
- remove tab;
- show total count;
- preserve existing tab IDs during edit;
- assign an ID only to a newly created tab;
- normalize `order` before saving.

Do not regenerate tab IDs when a title changes.

### 6.4 Slug validation

- auto-fill from title only while the slug has not been manually edited;
- validate format before submit;
- check uniqueness before write;
- show a Thai error message;
- warn when editing an existing slug.

### 6.5 Delete safety

Before deleting a page:

1. count assigned cards;
2. if count > 0, block deletion;
3. tell the admin to move or delete those cards first;
4. if count = 0, require confirmation and delete.

Before removing a tab from an existing page:

1. count assigned cards for that tab;
2. if count > 0, block removal;
3. preserve the tab in the saved page;
4. show a clear Thai message.

Avoid cascade deletion in this release.

## 7. Phase 4 — Extend the Existing App Form

Modify:

```text
src/app/components/AppFormModal.tsx
```

### 7.1 New placement state

Add state conceptually equivalent to:

```ts
const [placementMode, setPlacementMode] = useState<"root" | "custom">("root");
const [selectedPageId, setSelectedPageId] = useState("");
const [selectedTabId, setSelectedTabId] = useState("");
```

Load enabled and/or all content pages as appropriate for admin editing.

### 7.2 Placement UI

Add:

```text
ตำแหน่งการแสดงผล
[หมวดหลักเดิม] [หน้าที่สร้างเอง]
```

Root mode:

- show existing zone selector;
- hide page and tab selectors.

Custom mode:

- show page dropdown;
- after selecting a page, show its tab dropdown;
- reset selected tab when selected page changes;
- show a useful empty state when no custom page exists.

### 7.3 Initial edit state

For an existing app:

```text
app.pageId + app.tabId present
→ custom mode
→ preselect page and tab

otherwise
→ root mode
→ preselect normalized existing zone
```

### 7.4 Submit mapping

Root mode write:

```ts
{
  zone: selectedCanonicalZone,
  pageId: deleteField() or omitted,
  tabId: deleteField() or omitted
}
```

Custom mode write:

```ts
{
  zone: "app",
  pageId: selectedPageId,
  tabId: selectedTabId
}
```

Important: when moving a custom card back to a root category, remove persisted `pageId` and `tabId`. Setting them to `undefined` may not remove existing Firestore fields, so use the project’s update strategy correctly, potentially `deleteField()`.

### 7.5 Preserve upload behavior

Do not rewrite image upload unless required.

Preserve:

- file type validation;
- 2 MB maximum;
- progress state;
- preview;
- Firebase Storage URL saved to `iconUrl`;
- existing image retained when no new upload occurs.

## 8. Phase 5 — Make Root Public Filtering Safe

Modify the public card filtering path, likely in:

```text
src/app/components/HomeContent.tsx
```

Current root behavior must become conceptually:

```ts
const rootApps = apps.filter((app) => !app.pageId);
const visibleApps = rootApps.filter(
  (app) => normalizeCategory(app.zone) === selectedCategory
);
```

This prevents custom cards using internal `zone: "app"` from appearing in the existing App tab.

Verify:

- `isEnabled !== false` remains the visibility rule;
- default category remains `quiz`;
- all legacy mappings remain valid.

## 9. Phase 6 — Add Public Custom Page Launchers

### 9.1 New component

Recommended:

```text
src/app/components/ContentPageLauncherGrid.tsx
```

Responsibilities:

- render enabled pages;
- sort by page order;
- link to `/hub/[slug]`;
- use Liquid Glass styling;
- show a consistent `lucide-react` icon;
- handle zero pages without leaving awkward empty space.

### 9.2 Integrate into homepage

Load enabled pages and render the launcher section without removing the existing ZoneSwitcher and AppGrid.

Minimize duplicate Firestore subscriptions or fetches.

Possible order:

```text
Page header
Custom page launcher grid
ZoneSwitcher
Existing AppGrid
```

Confirm the final placement visually on mobile and desktop.

## 10. Phase 7 — Add Dynamic Public Page Route

Create:

```text
src/app/hub/[slug]/page.tsx
```

Depending on the Firebase client architecture, use a client component for data loading:

```text
src/app/components/ContentPageView.tsx
```

### 10.1 Page loading

- read slug from route params;
- fetch page by slug;
- reject missing page;
- reject `isEnabled === false`;
- sort enabled tabs by order;
- fetch apps for page;
- filter out disabled cards.

### 10.2 Tab behavior

- select first enabled tab by default;
- tab click changes active tab;
- if the active tab becomes invalid after data refresh, fall back to first enabled tab;
- allow horizontal tab scrolling on small screens;
- preserve visible focus states and keyboard accessibility.

### 10.3 Card rendering

Reuse `AppGrid` and `AppCard` where possible.

Do not duplicate card visual logic.

Filter:

```ts
app.pageId === page.id && app.tabId === activeTabId
```

Sort by `order` inside the active tab.

### 10.4 Page states

Provide polished states for:

- loading;
- page not found;
- disabled page;
- no tabs;
- no cards in active tab;
- Firestore error.

Add a visible link/button back to the homepage.

## 11. Phase 8 — Make Reordering Placement-Aware

Audit the existing `reorderApp()` and `normalizeAppOrders()` behavior.

Do not continue using global order normalization for custom cards.

Implement scoped ordering:

```ts
interface AppOrderScope {
  mode: "root" | "custom";
  zone?: "app" | "ebook" | "quiz";
  pageId?: string;
  tabId?: string;
}
```

Rules:

- root reorder affects only cards without `pageId` in one normalized zone;
- custom reorder affects only cards matching one `pageId + tabId`;
- moving a card to another scope assigns it the next valid order in the destination scope;
- optionally normalize the source scope after a move.

Use Firestore batch writes where the current project already does so.

## 12. Phase 9 — Admin Card List Improvements

Update the admin card list so placement is understandable.

Display either:

```text
หมวดหลัก: Quiz
```

or:

```text
หน้า: โครงงาน
แท็บ: โครงงานฟิสิกส์
```

Add placement filters if the current dashboard becomes difficult to use:

- all;
- root category;
- custom page;
- custom tab.

This filter is recommended but may be deferred if the card count is still small.

## 13. Phase 10 — Firestore Rules and Index Review

If rules are versioned in the repository:

- add read/write handling for `contentPages` consistent with current policy;
- do not make broad public write permissions;
- verify public reads needed by homepage and `/hub/[slug]`;
- document any composite index required by custom-card queries.

If rules are not present:

- do not invent deployment claims;
- add a documentation note stating which collection and queries require rule/index verification in Firebase Console.

## 14. Phase 11 — Documentation Updates

Update:

```text
README.md
Architech.md
AGENTS.md or project skill file when architecture rules change
```

Document:

- new `contentPages` collection;
- embedded tab schema;
- optional `pageId` and `tabId` on apps;
- root/custom placement rules;
- `/hub/[slug]` public route;
- delete safety behavior;
- scoped ordering behavior;
- any new Firestore index requirements.

Do not leave documentation describing only the old three-category model.

## 15. Phase 12 — Verification

### 15.1 Automated checks

Run:

```bash
npm run lint
npm run build
```

Run existing tests if present.

If adding tests is practical, prioritize:

- `normalizeSlug()`;
- legacy category normalization;
- root filtering excludes `pageId` cards;
- placement inference;
- stable tab IDs after rename/reorder;
- delete safety guards;
- scoped ordering.

### 15.2 Manual acceptance test

Perform this exact scenario:

1. Confirm existing App/Ebook/Quiz data appears correctly.
2. Log in as admin.
3. Create page title `โครงงาน`.
4. Set slug `projects`.
5. Add tabs:
   - `โครงงานฟิสิกส์`
   - `โครงงานบูรณาการ`
   - `ผลงานนักเรียน`
6. Save page.
7. Confirm homepage shows `โครงงาน`.
8. Open `/hub/projects`.
9. Confirm all three tabs appear in order.
10. Add a new card:
    - placement: custom page;
    - page: โครงงาน;
    - tab: โครงงานฟิสิกส์;
    - upload an image;
    - enter a valid URL.
11. Confirm the card appears in the correct tab.
12. Confirm it does not appear in root App.
13. Move it to `ผลงานนักเรียน`.
14. Confirm it moves correctly.
15. Move it back to root Quiz.
16. Confirm `pageId` and `tabId` are removed and it appears in Quiz.
17. Disable the custom page and confirm homepage launcher disappears.
18. Confirm direct public access is unavailable or treated as not found.
19. Re-enable the page.
20. Add a card back into a custom tab.
21. Attempt to delete that tab and confirm deletion is blocked.
22. Attempt to delete the page and confirm deletion is blocked.
23. Delete or move the child card.
24. Delete the now-empty tab/page successfully.
25. Test at mobile and desktop widths.

## 16. Expected Files to Add or Modify

The exact list depends on the repository audit, but likely includes:

```text
src/lib/content-types.ts                         # possible new file
src/lib/firestore.ts                             # modify
src/lib/content-pages.ts                         # optional new file
src/app/components/AppFormModal.tsx              # modify
src/app/components/HomeContent.tsx               # modify
src/app/components/ContentPageManager.tsx        # new
src/app/components/ContentPageFormModal.tsx      # new
src/app/components/ContentPageLauncherGrid.tsx   # new
src/app/components/ContentPageView.tsx           # new
src/app/admin/dashboard/page.tsx                 # modify
src/app/hub/[slug]/page.tsx                      # new
src/app/globals.css                              # modify
README.md                                        # modify
Architech.md                                     # modify
AGENTS.md and/or project skill documentation     # modify if needed
```

Avoid creating files that duplicate existing abstractions.

## 17. Completion Report Format

At completion, report:

1. files added;
2. files modified;
3. Firestore schema changes;
4. backward compatibility decisions;
5. public routes added;
6. admin workflows added;
7. delete-safety behavior;
8. lint result;
9. build result;
10. tests performed;
11. remaining risks or manual Firebase configuration;
12. any requirement intentionally deferred.

Do not claim success if lint/build or key acceptance checks fail. State failures clearly with the exact cause.
