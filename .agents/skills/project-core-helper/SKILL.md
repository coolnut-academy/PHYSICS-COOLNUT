---
name: project-core-helper
description: ใช้สกิลนี้ทุกครั้งเมื่อผู้ใช้สั่งให้เขียนโค้ดใหม่, แก้ไขโค้ดเดิม, ทำการรีแฟกเตอร์ (Refactor), หาบั๊ก, หรือถามคำถามเชิงสถาปัตยกรรมเกี่ยวกับโปรเจกต์นี้
---

# Project Context & Stack

## ข้อมูลโปรเจกต์

**PHYSICS COOLNUT** เป็นแพลตฟอร์มการเรียนรู้วิชาฟิสิกส์สำหรับนักเรียน ทำหน้าที่เป็น Content Launcher ที่รวบรวมลิงก์สื่อการเรียนรู้ (App, Ebook, Quiz) ในรูปแบบ Card Grid ที่สวยงามด้วยดีไซน์ Liquid Glass แบบ iOS 26

มีสองส่วนหลัก:
- **หน้าสาธารณะ (Public)**: นักเรียนเข้ามาเลือกดูการ์ดตามหมวดหมู่ แล้วกดเปิดลิงก์ในแท็บใหม่
- **หน้าผู้ดูแล (Admin)**: ครูผู้สอนล็อกอินด้วยรหัสลับเพื่อจัดการเนื้อหา (เพิ่ม/แก้ไข/ลบ/เรียงลำดับ/เปิด-ปิดการ์ด)

## เทคโนโลยีสแต็ก (Tech Stack)

| หมวดหมู่             | เทคโนโลยี                                     | เวอร์ชัน        |
| -------------------- | ---------------------------------------------- | --------------- |
| Framework            | Next.js (App Router)                           | 16.1.4          |
| ภาษา                 | TypeScript                                     | ^5              |
| UI Library           | React                                          | 19.2.3          |
| CSS Framework        | Tailwind CSS 4 + Vanilla CSS (`globals.css`)   | ^4              |
| ฟอนต์                | Kanit (Google Fonts) — รองรับ subset ไทย+ละติน  | —               |
| ไอคอน                | lucide-react                                   | ^0.562.0        |
| Database             | Firebase Firestore (Client SDK)                | ^12.9.0         |
| File Storage         | Firebase Storage                               | (อยู่ใน firebase SDK) |
| PostCSS Plugin       | @tailwindcss/postcss                           | ^4              |
| React Compiler       | babel-plugin-react-compiler                    | 1.0.0           |
| Linting              | ESLint 9 + eslint-config-next                  | ^9 / 16.1.4     |
| Package Manager      | npm                                            | —               |
| Deployment           | Vercel                                         | —               |
| PWA Support          | manifest.json (standalone, portrait-primary)   | —               |

## โครงสร้างโฟลเดอร์ (Folder Structure)

```
PHYSICS-COOLNUT/
├── .agents/                  # ⭐ ไฟล์ AI Skills (อยู่ที่นี่)
├── public/
│   ├── apple-touch-icon.png
│   ├── favicon.png
│   ├── icon.png
│   ├── logo.png              # โลโก้หลักของแอป
│   ├── manifest.json          # PWA manifest
│   └── *.svg                  # ไอคอน SVG ตกค้าง (file, globe, next, vercel, window)
├── src/
│   ├── proxy.ts               # ⛨ Middleware ป้องกัน route /admin/*
│   ├── app/
│   │   ├── globals.css        # 🎨 Design System หลัก (Liquid Glass, animations, 1037 บรรทัด)
│   │   ├── layout.tsx         # Root Layout (Kanit font, SEO metadata, background orbs)
│   │   ├── page.tsx           # หน้าแรก (Server Component → Suspense → HomeContent)
│   │   ├── not-found.tsx      # หน้า 404 แบบ Liquid Glass
│   │   ├── components/
│   │   │   ├── HomeContent.tsx     # ⭐ หน้าหลักฝั่ง Public (fetch, filter, state)
│   │   │   ├── ZoneSwitcher.tsx    # 🔀 Tab Switcher (App / Ebook / Quiz)
│   │   │   ├── AppGrid.tsx        # 📦 Card Grid + Empty State + Count
│   │   │   ├── AppCard.tsx        # 🃏 การ์ดเนื้อหา (icon, hover effects, disabled)
│   │   │   ├── AppFormModal.tsx   # 📝 ฟอร์ม Add/Edit (upload icon, preview, validate)
│   │   │   └── AdminLoginModal.tsx # 🔐 Modal ล็อกอินผู้ดูแล
│   │   ├── admin/
│   │   │   └── dashboard/
│   │   │       └── page.tsx       # 🛠️ Admin Dashboard (CRUD, reorder, toggle, stats)
│   │   └── api/
│   │       └── auth/
│   │           ├── login/route.ts  # POST: ตรวจ secret key → set cookie
│   │           ├── check/route.ts  # GET: ตรวจสอบ session validity
│   │           └── logout/route.ts # POST: ลบ cookie
│   └── lib/
│       ├── firebase.ts        # 🔥 Firebase App Initialization (singleton)
│       ├── firestore.ts       # 📄 CRUD helpers สำหรับ Firestore collection "apps"
│       └── storage.ts         # 📸 Upload/Delete helpers สำหรับ Firebase Storage
├── AGENTS.md                  # กฎเหล็กระดับ repo สำหรับ AI Agent + Human
├── Architech.md               # เอกสาร Architecture ภาพรวม
├── package.json
├── tsconfig.json
├── next.config.ts
├── eslint.config.mjs
├── postcss.config.mjs
└── vercel.json
```

## Firestore Data Model

Collection: `apps`

```ts
interface AppDocument {
  id?: string;
  name: string;                // ชื่อการ์ด (รองรับ HTML เช่น <br>)
  url: string;                 // ลิงก์ปลายทางเมื่อกดการ์ด
  iconUrl: string;             // URL รูปไอคอน (Firebase Storage / external / data:)
  zone: "app" | "ebook" | "quiz" | "student" | "teacher" | "both";
  color?: string;              // Tailwind gradient class สำหรับ fallback icon
  order: number;               // ลำดับการแสดงผล (ascending)
  isEnabled?: boolean;         // false = ซ่อน/ปิดใช้งาน, undefined = เปิดใช้งาน
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}
```

**กฎการแมปหมวดหมู่ Legacy:**
| ค่าเก่า (Legacy) | แมปเป็น      |
| ----------------- | ------------- |
| `student`         | `quiz`        |
| `teacher`         | `ebook`       |
| `both`            | `app`         |

**⚠️ สำคัญ:** เวลาเขียนข้อมูลใหม่ ให้ใช้เฉพาะ `app`, `ebook`, `quiz` เท่านั้น แต่ต้องรองรับค่าเก่าในระบบอ่านข้อมูลเสมอ

## ระบบ Authentication

- **ไม่ใช่** ระบบ multi-user — ใช้ secret key เดียวสำหรับ admin ทั้งหมด
- Admin ล็อกอินผ่าน `/api/auth/login` → ตรวจสอบ `ADMIN_SECRET_KEY` (env var ฝั่ง server) → สร้าง Base64 session token → เซ็ต HTTP-only cookie (`admin_session`)
- Session อายุ 24 ชั่วโมง
- `src/proxy.ts` ทำหน้าที่เป็น middleware ตรวจ cookie ก่อนเข้าถึง `/admin/*`
- Session หมดอายุ → redirect ไป `/?showLogin=true&expired=true`

## Environment Variables

| ตัวแปร                                     | ขอบเขต    | คำอธิบาย                         |
| ------------------------------------------ | --------- | -------------------------------- |
| `NEXT_PUBLIC_FIREBASE_API_KEY`             | Public    | Firebase API Key                 |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`         | Public    | Firebase Auth Domain             |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID`          | Public    | Firebase Project ID              |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`      | Public    | Firebase Storage Bucket          |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Public    | Firebase Messaging Sender ID     |
| `NEXT_PUBLIC_FIREBASE_APP_ID`             | Public    | Firebase App ID                  |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`      | Public    | Firebase Measurement ID          |
| `ADMIN_SECRET_KEY`                         | Server    | รหัสลับสำหรับล็อกอิน Admin (**ห้ามขึ้นต้นด้วย NEXT_PUBLIC_**) |

## Design System

ระบบ UI ใช้ธีม **Liquid Glass** แบบ iOS 26 ที่กำหนดไว้ใน `src/app/globals.css` (1,037 บรรทัด):

- **CSS Variables:** กำหนดค่า glass-bg, glass-border, glass-shadow, glass-blur ฯลฯ ที่ `:root`
- **Reusable Classes:** `glass-card`, `glass-button`, `glass-button-primary`, `glass-input`, `glass-header`, `glass-modal`, `glass-zone-switcher`, `glass-icon-container`, `glass-backdrop`
- **Animations:** `fade-in`, `fade-in-up`, `fade-in-down`, `float`, `pulse-slow`, `shimmer`, `gradient-shift`, `glow`, `liquid-morph`, `ripple`, `glint`, `sparkle-pulse`
- **สีหลัก:** Cyan (`#0ea5e9`) → Purple (`#a855f7`) gradient, พื้นหลัง Slate light
- **Typography:** ฟอนต์ Kanit (น้ำหนัก 100-900, subset ไทย+ละติน)
- **Responsive:** Mobile-first, ปรับ border-radius ที่ `max-width: 640px` และ `480px`

---

## กฎเหล็กและข้อจำกัด (Constraints)

### 1. กฎด้าน Codebase ทั่วไป

- ✅ **ใช้ TypeScript เท่านั้น** — ห้ามเขียน `.js` หรือ `.jsx` ในโค้ดใหม่
- ✅ **Path Alias:** ใช้ `@/*` ซึ่งแมปไปที่ `./src/*` (ดู `tsconfig.json`)
- ✅ **Strict Mode เปิดอยู่** — `tsconfig.json` ตั้ง `"strict": true`
- ✅ **React Compiler เปิดอยู่** — `next.config.ts` ตั้ง `reactCompiler: true`
- ✅ **ESLint ใช้ flat config** — `eslint.config.mjs` ใช้ `eslint-config-next/core-web-vitals` + `/typescript`

### 2. กฎด้านโครงสร้างไฟล์

- ✅ คอมโพเนนต์ทั้งหมดอยู่ใน `src/app/components/`
- ✅ Firebase logic แยกเป็น 3 ไฟล์ใน `src/lib/`: `firebase.ts`, `firestore.ts`, `storage.ts`
- ✅ API Route ทุก endpoint อยู่ภายใต้ `src/app/api/`
- ✅ Middleware/Proxy อยู่ที่ `src/proxy.ts`
- ❌ **ห้าม** สร้างไฟล์ Firestore/Storage logic ใหม่นอก `src/lib/` — ต่อเติมในไฟล์ที่มีอยู่แล้ว
- ❌ **ห้าม** commit `.env.local` หรือ `.env*` (อยู่ใน `.gitignore` แล้ว)

### 3. กฎด้าน Styling

- ✅ **ใช้ Tailwind CSS 4** — import ผ่าน `@import "tailwindcss"` ใน `globals.css`
- ✅ **ใช้ Vanilla CSS สำหรับ reusable components** — class เช่น `glass-card`, `glass-button` กำหนดไว้ใน `globals.css`
- ✅ รักษาภาษาดีไซน์ Liquid Glass ที่มีอยู่ (glassmorphism, soft gradients, blur effects)
- ✅ ใช้ `lucide-react` สำหรับไอคอนเท่านั้น — ห้ามเพิ่ม icon library อื่น
- ❌ **ห้ามลบ** CSS class ที่มีอยู่ใน `globals.css` โดยไม่จำเป็น — อาจถูกใช้ในหลายที่

### 4. กฎด้าน Data & Firebase

- ✅ Collection ชื่อ `"apps"` — ห้ามเปลี่ยนชื่อ
- ✅ Field `zone` — เป็นชื่อที่ persist ใน Firestore ห้ามเปลี่ยนเป็น `category` โดยไม่ทำ migration
- ✅ เขียนข้อมูลใหม่ให้ใช้เฉพาะ zone: `"app"`, `"ebook"`, `"quiz"`
- ✅ อ่านข้อมูลต้องรองรับค่า legacy: `"student"`, `"teacher"`, `"both"` เสมอ
- ✅ `isEnabled` ค่า `undefined` ถือว่าเปิดใช้งาน (default true)
- ✅ ลบการ์ดต้องพยายามลบ icon จาก Storage ด้วย แต่ถ้าลบ icon ไม่สำเร็จ **ห้ามให้ขัดจังหวะ** การลบ document
- ✅ Firebase App ใช้ singleton pattern — `getApps().length` ตรวจก่อน `initializeApp()`

### 5. กฎด้าน Auth & Security

- ❌ **ห้ามเปิดเผย** `ADMIN_SECRET_KEY` ไปยังฝั่ง client
- ✅ ตัวแปร Firebase สาธารณะใช้ prefix `NEXT_PUBLIC_`
- ✅ Admin cookie ชื่อ `admin_session` — httpOnly, secure (production), sameSite strict
- ❌ **ห้ามเปลี่ยน** ระบบ auth โดยไม่ได้รับอนุญาตจากเจ้าของโปรเจกต์

### 6. กฎด้านภาษาและ Encoding

- ✅ ข้อความ UI ส่วนใหญ่เป็น **ภาษาไทย** (UTF-8)
- ✅ `html lang="th"` — ตั้งค่าภาษาไทยเป็นค่าเริ่มต้น
- ⚠️ **ระวังเรื่อง PowerShell** — การเขียนไฟล์ที่มีข้อความไทยผ่าน PowerShell อาจเกิดปัญหา encoding ให้ใช้เครื่องมือแก้ไขไฟล์โดยตรงแทน

### 7. กฎด้าน Next.js Image

- ✅ `next.config.ts` อนุญาต remote image จาก:
  - `firebasestorage.googleapis.com`
  - `*.firebasestorage.app`
  - `*.gstatic.com`, `*.google.com`
  - `*.canva.com`, `*.quizizz.com`, `*.kahoot.com`, `*.youtube.com`
- ⚠️ หากเพิ่ม image source ใหม่ ต้องเพิ่ม `remotePatterns` ใน `next.config.ts` ด้วย

### 8. กฎด้าน Git & การแก้ไขที่ปลอดภัย

- ❌ **ห้ามรัน** destructive git commands โดยไม่ได้รับอนุญาต
- ❌ **ห้ามย้อนกลับ** (revert) การเปลี่ยนแปลงที่ไม่เกี่ยวข้อง
- ✅ ให้สร้าง patch ขนาดเล็ก ตรวจทานได้ง่าย แทนการ rewrite ขนาดใหญ่
- ⚠️ หากเห็นการเปลี่ยนแปลงที่ไม่คาดคิดขณะทำงาน ให้หยุดและถามผู้ใช้ก่อน

---

## ขั้นตอนการทำงานมาตรฐาน (Workflow)

### Step 1: ทำความเข้าใจบริบท

ก่อนแก้ไขโค้ดใด ๆ ให้ตรวจสอบสิ่งเหล่านี้:

1. **อ่านไฟล์นี้ (SKILL.md)** เพื่อทำความเข้าใจสถาปัตยกรรมและข้อจำกัด
2. **อ่าน `AGENTS.md`** ที่ root ของโปรเจกต์ — มีกฎเหล็กเพิ่มเติมระดับ repo
3. **ตรวจสอบ `Architech.md`** สำหรับ runtime flow และ module boundaries
4. **ดู Source Map** ด้านล่างเพื่อหาไฟล์ที่เกี่ยวข้อง

### Step 2: ระบุไฟล์ที่ต้องแตะ

ใช้ตารางนี้เพื่อค้นหาไฟล์ที่ถูกต้องตามประเภทงาน:

| ประเภทงาน                        | ไฟล์ที่ต้องตรวจสอบ/แก้ไข                                      |
| -------------------------------- | ------------------------------------------------------------- |
| เพิ่ม/แก้ UI หน้าสาธารณะ         | `src/app/components/HomeContent.tsx`, `AppGrid.tsx`, `AppCard.tsx` |
| แก้ไข Tab Switcher               | `src/app/components/ZoneSwitcher.tsx`                          |
| แก้ไข Admin Dashboard            | `src/app/admin/dashboard/page.tsx`                            |
| แก้ไข Add/Edit Form              | `src/app/components/AppFormModal.tsx`                          |
| แก้ไขระบบ Login                   | `src/app/components/AdminLoginModal.tsx`, `src/app/api/auth/login/route.ts` |
| แก้ไข Auth Logic                 | `src/app/api/auth/*/route.ts`, `src/proxy.ts`                 |
| แก้ไข Firestore CRUD             | `src/lib/firestore.ts`                                        |
| แก้ไข Image Upload/Delete        | `src/lib/storage.ts`                                          |
| แก้ไข Firebase Config            | `src/lib/firebase.ts`                                         |
| แก้ไข Styling / Design System    | `src/app/globals.css`                                         |
| แก้ไข SEO / Meta / Font          | `src/app/layout.tsx`                                          |
| แก้ไข 404 Page                   | `src/app/not-found.tsx`                                       |
| แก้ไข Remote Image Domains       | `next.config.ts`                                              |
| เพิ่ม Route ใหม่                  | สร้างโฟลเดอร์ใน `src/app/` ตาม App Router convention          |
| เพิ่ม API Endpoint ใหม่          | สร้างโฟลเดอร์ใน `src/app/api/` พร้อม `route.ts`              |

### Step 3: เขียน/แก้ไขโค้ด

ปฏิบัติตามสิ่งเหล่านี้ขณะเขียนโค้ด:

- **Component ใหม่:** ใช้ `"use client"` directive เมื่อต้องการ state/effects/event handlers (โปรเจกต์นี้ส่วนใหญ่เป็น Client Component)
- **Type Safety:** ใช้ `interface` แทน `type` สำหรับ Props, ใช้ TypeScript strict mode
- **Import Style:** ใช้ `@/lib/...` และ `@/app/...` path alias
- **Error Handling:** ใช้ try-catch, log ด้วย `console.error()`, แสดงข้อความภาษาไทยให้ผู้ใช้
- **State Management:** ใช้ React Hooks เท่านั้น (`useState`, `useEffect`, `useCallback`) — ไม่มี external state library
- **Data Fetching:** เรียก Firestore SDK โดยตรงจากฝั่ง client ผ่าน helper functions ใน `src/lib/firestore.ts`
- **Icons:** import จาก `lucide-react` เท่านั้น
- **Category Logic:** ต้อง normalize ค่า legacy (`student`→`quiz`, `teacher`→`ebook`, `both`→`app`) ทุกครั้งที่อ่านข้อมูล

### Step 4: ตรวจสอบ Styling

- ตรวจสอบว่า CSS class ที่ใช้มีอยู่แล้วใน `globals.css` หรือ Tailwind
- ถ้าต้องสร้าง class ใหม่ ให้เพิ่มใน `globals.css` ตาม pattern ที่มีอยู่ (Liquid Glass style)
- ตรวจสอบ responsive: ทดสอบที่ `640px` (sm) และ `480px` (mobile) เป็นอย่างน้อย

### Step 5: รัน Lint & Build เพื่อตรวจสอบ

```bash
# ตรวจสอบ lint errors
npm run lint

# ตรวจสอบว่า build ผ่าน
npm run build
```

⚠️ **ต้องรัน lint + build ก่อนส่งมอบงาน** เว้นแต่เป็นการแก้ไขเล็กน้อยที่ไม่กระทบโค้ด

### Step 6: คำสั่งที่ใช้บ่อย

```bash
# ติดตั้ง dependencies
npm install

# รัน dev server (เปิดที่ http://localhost:3000)
npm run dev

# ตรวจสอบ lint
npm run lint

# Build สำหรับ production
npm run build

# รัน production server
npm run start
```

### Step 7: สร้าง Mock Data (ถ้าจำเป็น)

โปรเจกต์นี้ **ไม่มี** local mock database — ทุกอย่างเชื่อมต่อ Firestore จริง
ถ้าต้องการทดสอบโดยไม่ต้องเชื่อมต่อ Firebase:

1. สร้าง mock ของ `getApps()` ที่ return ข้อมูลตัวอย่าง
2. ข้อมูลตัวอย่างต้องมีครบทุก field ตาม `AppDocument` interface
3. ต้องมีตัวอย่าง zone ทุกประเภท: `"app"`, `"ebook"`, `"quiz"` และอย่างน้อยหนึ่ง legacy value
4. ต้องมีตัวอย่าง `isEnabled: false` อย่างน้อย 1 รายการ

ตัวอย่าง Mock Data:

```ts
const mockApps: AppDocument[] = [
  {
    id: "1",
    name: "ฟิสิกส์ ม.4",
    url: "https://example.com",
    iconUrl: "",
    zone: "quiz",
    color: "from-blue-500 to-cyan-500",
    order: 0,
    isEnabled: true,
  },
  {
    id: "2",
    name: "E-Book<br>บทที่ 1",
    url: "https://example.com",
    iconUrl: "",
    zone: "ebook",
    color: "from-purple-500 to-violet-600",
    order: 1,
    isEnabled: false,
  },
];
```

---

## ข้อมูลเพิ่มเติมสำหรับ AI Agent

### Key Patterns ที่ใช้ในโปรเจกต์

1. **Singleton Firebase Init:** `firebase.ts` ใช้ `getApps().length` ตรวจก่อน init
2. **Category Normalization:** ฟังก์ชัน `normalizeCategory()` ซ้ำกันใน `HomeContent.tsx` และ `AppFormModal.tsx` — ถ้ารีแฟกเตอร์ ควรดึงออกเป็น shared utility
3. **Form Modal Pattern:** `AppFormModal` + `AdminLoginModal` ใช้ pattern เดียวกัน: `isOpen` → render null ถ้า false, backdrop click → close, Escape key → close
4. **API Response Pattern:** ทุก API route return `{ success: boolean, ... }` หรือ `{ authenticated: boolean }` เป็น JSON
5. **Image Validation:** อัพโหลดไฟล์ต้องเป็น `image/*` ขนาดไม่เกิน 2MB, ชื่อไฟล์ sanitize เป็น `{timestamp}_{sanitizedName}`
6. **Batch Write:** `reorderApp()` และ `normalizeAppOrders()` ใช้ Firestore `writeBatch()` เพื่อ atomic update

### ไฟล์สำคัญพร้อมขนาดโดยประมาณ

| ไฟล์                          | บรรทัด | ความรับผิดชอบหลัก                       |
| ----------------------------- | ------ | --------------------------------------- |
| `globals.css`                 | 1,037  | Design System ทั้งหมด                   |
| `admin/dashboard/page.tsx`    | 577    | Admin CRUD UI + Stats + Modals         |
| `AppFormModal.tsx`            | 482    | ฟอร์ม Add/Edit + Upload                 |
| `AdminLoginModal.tsx`         | 333    | Modal ล็อกอินพร้อม animation             |
| `HomeContent.tsx`             | 305    | State management + Filtering หน้าหลัก  |
| `firestore.ts`               | 207    | CRUD + Reorder + Normalize             |
| `AppCard.tsx`                 | 177    | UI การ์ดพร้อม Liquid Glass effects      |
| `layout.tsx`                  | 139    | Root layout + SEO + Font + Background  |
| `ZoneSwitcher.tsx`            | 125    | Tab switcher animation                  |
| `storage.ts`                  | 104    | Upload/Delete with progress             |
| `not-found.tsx`               | 102    | 404 page                                |
| `proxy.ts`                    | 71     | Route protection middleware             |
| `AppGrid.tsx`                 | 68     | Grid + Empty state + Count              |
| `auth/check/route.ts`        | 76     | Session validation API                  |
| `auth/login/route.ts`        | 69     | Login API                               |
| `page.tsx`                    | 49     | Entry point + Suspense loading          |
| `auth/logout/route.ts`       | 33     | Logout API                              |
| `firebase.ts`                | 33     | Firebase singleton init                  |
