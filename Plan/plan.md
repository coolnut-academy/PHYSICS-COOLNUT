# Dynamic Content Page Builder — Product and Architecture Plan

## 1. Purpose

Add a Dynamic Content Page Builder to PHYSICS COOLNUT so an administrator can create new public launcher pages without editing source code.

Each custom page will:

- appear as a button/card on the public homepage;
- have an administrator-defined title;
- contain one or more administrator-defined tabs;
- allow cards/apps to be added to a selected tab;
- reuse the existing card workflow: title, destination URL, uploaded image, fallback color, display order, and enabled/disabled state.

Example:

```text
Public homepage
├── Existing fixed areas
│   ├── App
│   ├── Ebook
│   └── Quiz
└── Custom pages
    └── โครงงาน
        ├── Tab: โครงงานฟิสิกส์
        │   ├── Card A
        │   └── Card B
        ├── Tab: โครงงานบูรณาการ
        │   └── Card C
        └── Tab: ผลงานนักเรียน
            └── Card D
```

## 2. Product Goal

Transform PHYSICS COOLNUT from a portal with only three hard-coded categories into a hybrid system that supports:

1. the existing fixed categories (`App`, `Ebook`, and `Quiz`); and
2. administrator-created pages with administrator-created tabs.

The feature must remain simple enough for a teacher/admin to manage without technical knowledge.

## 3. In Scope

### 3.1 Custom page management

An admin can:

- create a custom page;
- define the page title;
- generate or edit a unique URL slug;
- add one or more tabs;
- rename tabs;
- reorder tabs;
- add or remove tabs safely;
- enable or disable a page;
- reorder custom page launch buttons;
- edit or delete a page safely.

### 3.2 Card placement

When creating or editing a card, the admin can choose its destination:

- existing fixed category:
  - App
  - Ebook
  - Quiz
- custom page:
  - select a page;
  - select one tab from that page.

Cards placed in custom pages continue to support:

- card title;
- destination URL;
- uploaded image;
- image preview and upload progress;
- fallback gradient/color;
- enabled/disabled state;
- ordering within the selected tab.

### 3.3 Public experience

A public user can:

- see enabled custom page buttons on the homepage;
- open a custom page;
- switch between enabled tabs;
- see only the cards assigned to the active tab;
- open a card URL in a new browser tab;
- use the experience on mobile and desktop.

## 4. Out of Scope for the First Release

The first release does not need:

- student accounts;
- per-page access permissions;
- nested pages;
- nested tabs;
- drag-and-drop page building;
- rich-text page content;
- analytics per custom page;
- multiple admin roles;
- scheduled publishing;
- page templates;
- card duplication across multiple tabs;
- bulk import/export.

These may be considered later after the core page → tab → card workflow is stable.

## 5. Existing Behavior That Must Remain Stable

The implementation must preserve:

- the existing `App`, `Ebook`, and `Quiz` public categories;
- the default public category of `Quiz`;
- legacy category mappings:
  - `student` → `quiz`
  - `teacher` → `ebook`
  - `both` → `app`
- the existing admin secret-key login flow;
- the `admin_session` HTTP-only cookie;
- the existing Firebase Storage image upload pipeline;
- existing Firestore `apps` documents without requiring an immediate migration;
- current Liquid Glass visual language;
- current mobile responsiveness;
- current card URL-opening behavior.

## 6. Recommended Information Architecture

Use three conceptual levels:

```text
Content Page
└── Tab
    └── App/Card
```

### 6.1 Content page

A top-level public destination created by the admin.

Examples:

- โครงงาน
- คลังข้อสอบ
- ห้องเรียน
- สื่อเสริม

### 6.2 Tab

A category inside one content page.

Examples inside `โครงงาน`:

- ฟิสิกส์
- บูรณาการ
- ผลงานนักเรียน

### 6.3 App/Card

A clickable launcher item with an image and destination URL.

## 7. Recommended Firestore Design

### 7.1 New collection: `contentPages`

Store each custom page as one document.

```ts
interface ContentPageTab {
  id: string;
  title: string;
  order: number;
  isEnabled: boolean;
}

interface ContentPageDocument {
  id?: string;
  title: string;
  slug: string;
  tabs: ContentPageTab[];
  order: number;
  isEnabled: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}
```

### Why embed tabs in the page document?

The project is intentionally compact and currently assumes a small-to-medium catalog with a small admin team. Embedded tabs provide:

- one read to load a page and its tabs;
- simple page creation;
- simple tab reordering;
- stable tab IDs for card references;
- fewer Firestore queries;
- lower implementation complexity.

A separate tabs collection is unnecessary for the first release unless real usage later shows very large tab counts or concurrent editing requirements.

### 7.2 Extend the existing `apps` documents

Preserve all existing fields and add optional placement fields.

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

  // New optional fields
  pageId?: string;
  tabId?: string;

  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}
```

### Placement rules

```text
pageId absent
→ existing root card
→ use zone to place the card in App, Ebook, or Quiz

pageId present + tabId present
→ custom-page card
→ show only inside the matching page and tab
```

For a custom-page card, keep `zone: "app"` internally for compatibility with the existing required field, but public fixed-category filtering must exclude every document that has `pageId`.

This avoids a destructive migration and keeps old documents valid.

## 8. Slug Strategy

Each custom page needs a unique slug.

Example:

```text
Title: โครงงาน
Slug: projects
Public route: /hub/projects
```

Rules:

- auto-generate a slug from the title when possible;
- allow the admin to edit it before saving;
- normalize to lowercase;
- allow letters, numbers, and hyphens;
- trim repeated or leading/trailing hyphens;
- reject duplicates;
- do not silently change an existing page slug during normal title edits;
- changing a slug must display a warning because the public URL changes.

Thai-only titles may need a generated fallback slug such as `page-<short-id>` unless the admin enters an English slug.

## 9. Public Routing

Recommended route:

```text
/hub/[slug]
```

Recommended files:

```text
src/app/hub/[slug]/page.tsx
src/app/components/ContentPageView.tsx
```

Public page behavior:

1. resolve the page by slug;
2. reject missing or disabled pages with the existing not-found experience;
3. sort enabled tabs by `order`;
4. select the first enabled tab by default;
5. fetch cards matching `pageId`;
6. filter cards by active `tabId`;
7. sort cards by `order`;
8. open card URLs with the same behavior as existing cards.

## 10. Homepage Experience

Add a custom-page launcher section to the public homepage without replacing the existing zone switcher.

Recommended structure:

```text
Header
Custom page launcher buttons/cards
Existing App / Ebook / Quiz switcher
Existing card grid
Footer
```

Only enabled custom pages should appear. Sort them by `order`.

A custom page launcher should show at minimum:

- page title;
- a consistent icon such as `FolderOpen`, `LayoutGrid`, or `BookOpen` from `lucide-react`;
- a visual affordance that it opens another page.

Optional page icons can be introduced later. They are not required for the first release.

## 11. Admin Experience

### 11.1 Admin dashboard navigation

Add a dedicated section or view:

```text
Content Cards
Custom Pages
```

The `Custom Pages` area should display:

- page title;
- slug;
- tab count;
- total assigned card count if practical;
- enabled/disabled state;
- order controls;
- edit action;
- delete action.

### 11.2 Create page flow

Admin clicks `สร้างหน้าใหม่` and completes:

- page title;
- slug;
- tabs.

Recommended tab editor:

- starts with one tab row;
- `+ เพิ่มแท็บ` adds another row;
- each row has a title field;
- each row has move up/down controls;
- each row has remove action;
- the current tab count is visible;
- at least one tab is required.

This is safer and more flexible than a number-only field while still allowing the admin to choose the number of tabs.

### 11.3 Extend the add/edit card form

Add a placement selector:

```text
ตำแหน่งการแสดงผล
○ หมวดหลักเดิม
○ หน้าที่สร้างเอง
```

When `หมวดหลักเดิม` is selected:

- show the existing App/Ebook/Quiz selector;
- clear `pageId` and `tabId` before saving.

When `หน้าที่สร้างเอง` is selected:

- show a custom page selector;
- show a tab selector filtered by the selected page;
- require both `pageId` and `tabId`;
- keep image upload and destination URL fields unchanged.

### 11.4 Editing existing cards

- Existing root cards must open in root-placement mode.
- Existing custom-page cards must open with the correct page and tab preselected.
- The admin must be able to move a card:
  - between fixed categories;
  - from a fixed category to a custom page;
  - between tabs;
  - between custom pages;
  - from a custom page back to a fixed category.

## 12. Ordering Rules

Card order must be scoped to its container.

Containers are:

- root `app`;
- root `ebook`;
- root `quiz`;
- each unique `pageId + tabId` pair.

Reordering one custom tab must not modify the order of cards in another tab or in a fixed category.

Custom page order is separate from card order.

Tab order is stored inside each page document.

## 13. Safe Delete Rules

### 13.1 Delete a card

Keep existing behavior:

1. attempt to delete its Firebase Storage image;
2. delete the Firestore document even if image deletion fails.

### 13.2 Delete a tab

Do not silently delete cards.

First-release rule:

- if the tab contains cards, block deletion;
- show how many cards must be moved or deleted first;
- allow deletion only when the tab is empty.

### 13.3 Delete a page

Do not silently delete child cards.

First-release rule:

- if any cards reference the page, block deletion;
- show how many cards must be moved or deleted first;
- allow deletion only when the page has no assigned cards.

This is safer than cascade deletion and reduces accidental content loss.

## 14. Validation Rules

### Content page

- title is required;
- slug is required;
- slug must be unique;
- at least one tab is required;
- every tab needs a non-empty title;
- tab IDs must remain stable during rename and reorder;
- duplicate tab titles should show a warning or be rejected within the same page.

### Card

- name is required;
- destination URL is required and valid;
- root placement requires a valid canonical zone;
- custom placement requires an enabled/existing page and valid tab;
- image validation remains `image/*` and maximum 2 MB;
- missing image continues to use the existing fallback design.

## 15. Backward Compatibility Strategy

No immediate migration is required.

Existing documents:

```ts
{
  zone: "quiz",
  // no pageId
  // no tabId
}
```

remain root cards.

New custom cards:

```ts
{
  zone: "app",
  pageId: "content-page-document-id",
  tabId: "stable-tab-id"
}
```

are excluded from the root App/Ebook/Quiz views and rendered only on their custom page.

Legacy `student`, `teacher`, and `both` values must still normalize exactly as before.

## 16. Security and Operational Considerations

- Do not expose `ADMIN_SECRET_KEY` to the client.
- Do not replace the existing auth model as part of this feature.
- Keep Firebase initialization in the existing singleton.
- Keep Firestore logic inside `src/lib/firestore.ts` unless a dedicated `content-pages.ts` file inside `src/lib/` is clearly justified.
- Review Firestore rules so the new collection follows the same intended read/write policy as the current project.
- Public users need read access to enabled pages and cards.
- Admin write security must remain consistent with the project’s current architecture.

## 17. UI and Design Requirements

- Preserve the current Liquid Glass visual language.
- Use `lucide-react` only for icons.
- Keep Thai UI text readable and UTF-8 safe.
- Support mobile widths at least around 480 px and 640 px breakpoints.
- Long page or tab names must wrap or truncate gracefully.
- Horizontal tab overflow must be scrollable on mobile.
- Loading, empty, error, and not-found states must be polished.

## 18. Empty States

Required empty states:

- no custom pages created;
- custom page exists but has no enabled tabs;
- active tab has no cards;
- no enabled custom pages on the homepage;
- selected page or tab was deleted while editing a card;
- page slug not found.

## 19. Acceptance Criteria

The feature is accepted when all of the following are true:

1. Existing App/Ebook/Quiz cards continue to display correctly.
2. Existing Firestore documents require no manual migration.
3. Admin can create a page titled `โครงงาน`.
4. Admin can create at least three named tabs inside that page.
5. The homepage shows an enabled `โครงงาน` launcher.
6. Clicking the launcher opens `/hub/<slug>`.
7. The public page shows the configured tabs in the configured order.
8. Admin can add a card with uploaded image and URL to a selected tab.
9. The card appears only in the selected custom page and tab.
10. The same card does not leak into the root App category.
11. Admin can move the card to another tab and the public UI updates correctly.
12. Admin can move the card back to App/Ebook/Quiz.
13. Disabling a page hides it from the homepage and prevents normal public access.
14. Disabling a card hides it from the public tab.
15. A non-empty tab cannot be deleted accidentally.
16. A non-empty page cannot be deleted accidentally.
17. Card ordering is independent per root category and per custom tab.
18. Mobile tab switching and card grids remain usable.
19. `npm run lint` passes.
20. `npm run build` passes.

## 20. Future Extensions

After the first release is stable, possible extensions include:

- custom icon/image for each page launcher;
- page descriptions and cover banners;
- duplicate a page or tab;
- card duplication into multiple tabs;
- drag-and-drop ordering;
- analytics by page and tab;
- search across all custom pages;
- reusable page templates;
- permissions and multiple admin accounts;
- import/export configuration as JSON.
