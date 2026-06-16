// Firestore Database Helper Functions
// ============================================
// CRUD operations for app management - NO CACHE, direct to database

import {
    collection,
    doc,
    getDocs,
    getDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    orderBy,
    writeBatch,
    Timestamp,
    where,
    limit,
    deleteField,
} from "firebase/firestore";
import { db } from "./firebase";

// Collection name for apps
const APPS_COLLECTION = "apps";

// App data interface matching the existing AppData type
export interface AppDocument {
    id?: string;
    name: string;
    url: string;
    iconUrl: string;
    zone: "app" | "ebook" | "quiz" | "student" | "teacher" | "both";
    color?: string;
    order: number;
    isEnabled?: boolean;
    pageId?: string;
    tabId?: string;
    createdAt?: Timestamp;
    updatedAt?: Timestamp;
}

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

/**
 * Get all apps from Firestore, ordered by 'order' field
 * ALWAYS fetch from server - no caching
 */
export async function getApps(): Promise<AppDocument[]> {
    try {
        const appsRef = collection(db, APPS_COLLECTION);
        const q = query(appsRef, orderBy("order", "asc"));
        
        // ALWAYS fetch from server, never use cache
        const snapshot = await getDocs(q);

        const apps = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        })) as AppDocument[];

        console.log(`Fetched ${apps.length} apps from database`);
        return apps;
    } catch (error) {
        console.error("Error fetching apps:", error);
        throw new Error("Failed to fetch apps from database");
    }
}

/**
 * Get a single app by ID
 */
export async function getAppById(appId: string): Promise<AppDocument | null> {
    try {
        const docRef = doc(db, APPS_COLLECTION, appId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() } as AppDocument;
        }
        return null;
    } catch (error) {
        console.error("Error fetching app:", error);
        throw new Error("Failed to fetch app from database");
    }
}

/**
 * Normalize legacy zone values to canonical categories.
 * This is the single source of truth — import from here.
 */
export function normalizeCategory(zone: string): "app" | "ebook" | "quiz" {
    if (zone === "teacher") return "ebook";
    if (zone === "student") return "quiz";
    if (zone === "both") return "app";
    return zone as "app" | "ebook" | "quiz";
}

/** Check whether an app is placed inside a custom page. */
export function isCustomPageApp(app: AppDocument): boolean {
    return Boolean(app.pageId && app.tabId);
}

/** Clean and normalize a slug string for URL use. */
export function cleanSlug(input: string): string {
    return input
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");
}

/**
 * Add a new app to Firestore
 */
export async function addApp(
    appData: Omit<AppDocument, "id" | "order" | "createdAt" | "updatedAt">
): Promise<string> {
    try {
        // Get the current highest order in the same scope
        const allApps = await getApps();
        const isCustom = Boolean(appData.pageId && appData.tabId);
        
        const scopeApps = allApps.filter((a) => {
            if (isCustom) {
                return a.pageId === appData.pageId && a.tabId === appData.tabId;
            } else {
                return !a.pageId && normalizeCategory(a.zone) === normalizeCategory(appData.zone);
            }
        });
        
        const maxOrder = scopeApps.length > 0 ? Math.max(...scopeApps.map((a) => a.order || 0)) : -1;

        const cleanData: Record<string, unknown> = { ...appData };
        if (!cleanData.pageId) delete cleanData.pageId;
        if (!cleanData.tabId) delete cleanData.tabId;

        const newApp = {
            ...cleanData,
            order: maxOrder + 1,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        };

        const docRef = await addDoc(collection(db, APPS_COLLECTION), newApp);
        console.log("App added to database with ID:", docRef.id);
        
        return docRef.id;
    } catch (error) {
        console.error("Error adding app:", error);
        throw new Error("Failed to add app to database");
    }
}

/**
 * Update an existing app
 */
export async function updateApp(
    appId: string,
    appData: Partial<Omit<AppDocument, "id" | "createdAt">>
): Promise<void> {
    try {
        const docRef = doc(db, APPS_COLLECTION, appId);
        const finalData: Record<string, unknown> = { ...appData };
        
        if (finalData.pageId === null || finalData.pageId === undefined || finalData.pageId === "") {
            finalData.pageId = deleteField();
        }
        if (finalData.tabId === null || finalData.tabId === undefined || finalData.tabId === "") {
            finalData.tabId = deleteField();
        }

        await updateDoc(docRef, {
            ...finalData,
            updatedAt: Timestamp.now(),
        });
        console.log("App updated in database:", appId);
    } catch (error) {
        console.error("Error updating app:", error);
        throw new Error("Failed to update app in database");
    }
}

/**
 * Delete an app from Firestore
 */
export async function deleteApp(appId: string): Promise<void> {
    try {
        const docRef = doc(db, APPS_COLLECTION, appId);
        await deleteDoc(docRef);
        console.log("App deleted from database:", appId);
    } catch (error) {
        console.error("Error deleting app:", error);
        throw new Error("Failed to delete app from database");
    }
}

/**
 * Reorder an app (placement scope aware)
 */
export async function reorderApp(
    appId: string,
    direction: "up" | "down"
): Promise<void> {
    try {
        const allApps = await getApps();
        const targetApp = allApps.find((a) => a.id === appId);

        if (!targetApp) {
            throw new Error("App not found");
        }

        const isCustom = Boolean(targetApp.pageId && targetApp.tabId);
        const scopeApps = allApps.filter((a) => {
            if (isCustom) {
                return a.pageId === targetApp.pageId && a.tabId === targetApp.tabId;
            } else {
                return !a.pageId && normalizeCategory(a.zone) === normalizeCategory(targetApp.zone);
            }
        });

        const currentIndex = scopeApps.findIndex((a) => a.id === appId);
        if (currentIndex === -1) {
            throw new Error("App not found in scope");
        }

        const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

        if (targetIndex < 0 || targetIndex >= scopeApps.length) {
            console.log("Cannot move further in this direction");
            return;
        }

        const currentAppInScope = scopeApps[currentIndex];
        const targetAppInScope = scopeApps[targetIndex];

        const batch = writeBatch(db);

        const currentDocRef = doc(db, APPS_COLLECTION, currentAppInScope.id!);
        const targetDocRef = doc(db, APPS_COLLECTION, targetAppInScope.id!);

        batch.update(currentDocRef, {
            order: targetAppInScope.order,
            updatedAt: Timestamp.now(),
        });
        batch.update(targetDocRef, {
            order: currentAppInScope.order,
            updatedAt: Timestamp.now(),
        });

        await batch.commit();
        console.log("Apps reordered successfully in database (scoped)");
    } catch (error) {
        console.error("Error reordering app:", error);
        throw new Error("Failed to reorder app");
    }
}

export async function normalizeAppOrders(): Promise<void> {
    try {
        const allApps = await getApps();
        const batch = writeBatch(db);

        // Group apps by scope
        const groups: { [key: string]: AppDocument[] } = {};

        allApps.forEach((app) => {
            let key = "";
            if (app.pageId && app.tabId) {
                key = `custom_${app.pageId}_${app.tabId}`;
            } else {
                key = `root_${normalizeCategory(app.zone)}`;
            }
            if (!groups[key]) {
                groups[key] = [];
            }
            groups[key].push(app);
        });

        let hasChanges = false;
        Object.values(groups).forEach((group) => {
            group.forEach((app, index) => {
                if (app.order !== index) {
                    const docRef = doc(db, APPS_COLLECTION, app.id!);
                    batch.update(docRef, { order: index });
                    hasChanges = true;
                }
            });
        });

        if (hasChanges) {
            await batch.commit();
            console.log("App orders normalized in database (scoped)");
        }
    } catch (error) {
        console.error("Error normalizing orders:", error);
    }
}

// Custom Page Builder Helper Functions
// ============================================

const PAGES_COLLECTION = "contentPages";

export async function getContentPages(): Promise<ContentPageDocument[]> {
    try {
        const pagesRef = collection(db, PAGES_COLLECTION);
        const q = query(pagesRef, orderBy("order", "asc"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        })) as ContentPageDocument[];
    } catch (error) {
        console.error("Error fetching content pages:", error);
        throw new Error("Failed to fetch content pages");
    }
}

export async function getEnabledContentPages(): Promise<ContentPageDocument[]> {
    try {
        const pagesRef = collection(db, PAGES_COLLECTION);
        const q = query(pagesRef, where("isEnabled", "==", true), orderBy("order", "asc"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        })) as ContentPageDocument[];
    } catch (error) {
        console.error("Error fetching enabled content pages:", error);
        throw new Error("Failed to fetch enabled content pages");
    }
}

export async function getContentPageById(id: string): Promise<ContentPageDocument | null> {
    try {
        const docRef = doc(db, PAGES_COLLECTION, id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() } as ContentPageDocument;
        }
        return null;
    } catch (error) {
        console.error("Error fetching content page by id:", error);
        throw new Error("Failed to fetch content page");
    }
}

export async function getContentPageBySlug(slug: string): Promise<ContentPageDocument | null> {
    try {
        const pagesRef = collection(db, PAGES_COLLECTION);
        const q = query(pagesRef, where("slug", "==", slug), limit(1));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
            const firstDoc = snapshot.docs[0];
            return { id: firstDoc.id, ...firstDoc.data() } as ContentPageDocument;
        }
        return null;
    } catch (error) {
        console.error("Error fetching content page by slug:", error);
        throw new Error("Failed to fetch content page by slug");
    }
}

export async function isContentPageSlugAvailable(slug: string, excludeId?: string): Promise<boolean> {
    try {
        const page = await getContentPageBySlug(slug);
        if (!page) return true;
        if (excludeId && page.id === excludeId) return true;
        return false;
    } catch (error) {
        console.error("Error checking slug availability:", error);
        return false;
    }
}

export async function addContentPage(
    pageData: Omit<ContentPageDocument, "id" | "order" | "createdAt" | "updatedAt">
): Promise<string> {
    try {
        const pages = await getContentPages();
        const maxOrder = pages.length > 0 ? Math.max(...pages.map((p) => p.order || 0)) : -1;
        const newPage = {
            ...pageData,
            order: maxOrder + 1,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        };
        const docRef = await addDoc(collection(db, PAGES_COLLECTION), newPage);
        return docRef.id;
    } catch (error) {
        console.error("Error adding content page:", error);
        throw new Error("Failed to add content page");
    }
}

export async function updateContentPage(
    pageId: string,
    pageData: Partial<Omit<ContentPageDocument, "id" | "createdAt">>
): Promise<void> {
    try {
        const docRef = doc(db, PAGES_COLLECTION, pageId);
        await updateDoc(docRef, {
            ...pageData,
            updatedAt: Timestamp.now(),
        });
    } catch (error) {
        console.error("Error updating content page:", error);
        throw new Error("Failed to update content page");
    }
}

export async function deleteContentPage(pageId: string): Promise<void> {
    try {
        const docRef = doc(db, PAGES_COLLECTION, pageId);
        await deleteDoc(docRef);
    } catch (error) {
        console.error("Error deleting content page:", error);
        throw new Error("Failed to delete content page");
    }
}

export async function reorderContentPage(
    pageId: string,
    direction: "up" | "down"
): Promise<void> {
    try {
        const pages = await getContentPages();
        const currentIndex = pages.findIndex((p) => p.id === pageId);
        if (currentIndex === -1) throw new Error("Content page not found");

        const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
        if (targetIndex < 0 || targetIndex >= pages.length) return;

        const currentPage = pages[currentIndex];
        const targetPage = pages[targetIndex];

        const batch = writeBatch(db);
        const currentDocRef = doc(db, PAGES_COLLECTION, currentPage.id!);
        const targetDocRef = doc(db, PAGES_COLLECTION, targetPage.id!);

        batch.update(currentDocRef, {
            order: targetPage.order,
            updatedAt: Timestamp.now(),
        });
        batch.update(targetDocRef, {
            order: currentPage.order,
            updatedAt: Timestamp.now(),
        });

        await batch.commit();
    } catch (error) {
        console.error("Error reordering content page:", error);
        throw new Error("Failed to reorder content page");
    }
}

// Custom-card query helpers
// ============================================

/** Count how many apps reference a given content page. */
export async function countAppsForPage(pageId: string): Promise<number> {
    try {
        const appsRef = collection(db, APPS_COLLECTION);
        const q = query(appsRef, where("pageId", "==", pageId));
        const snapshot = await getDocs(q);
        return snapshot.size;
    } catch (error) {
        console.error("Error counting apps for page:", error);
        return 0;
    }
}

/** Count how many apps reference a specific tab within a page. */
export async function countAppsForTab(pageId: string, tabId: string): Promise<number> {
    try {
        const appsRef = collection(db, APPS_COLLECTION);
        const q = query(appsRef, where("pageId", "==", pageId), where("tabId", "==", tabId));
        const snapshot = await getDocs(q);
        return snapshot.size;
    } catch (error) {
        console.error("Error counting apps for tab:", error);
        return 0;
    }
}

/** Get all apps assigned to a given content page. */
export async function getAppsForPage(pageId: string): Promise<AppDocument[]> {
    try {
        const appsRef = collection(db, APPS_COLLECTION);
        const q = query(appsRef, where("pageId", "==", pageId), orderBy("order", "asc"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map((d) => ({
            id: d.id,
            ...d.data(),
        })) as AppDocument[];
    } catch (error) {
        console.error("Error fetching apps for page:", error);
        throw new Error("Failed to fetch apps for page");
    }
}

/** Get all apps assigned to a specific tab within a page. */
export async function getAppsForTab(pageId: string, tabId: string): Promise<AppDocument[]> {
    try {
        const appsRef = collection(db, APPS_COLLECTION);
        const q = query(appsRef, where("pageId", "==", pageId), where("tabId", "==", tabId), orderBy("order", "asc"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map((d) => ({
            id: d.id,
            ...d.data(),
        })) as AppDocument[];
    } catch (error) {
        console.error("Error fetching apps for tab:", error);
        throw new Error("Failed to fetch apps for tab");
    }
}
