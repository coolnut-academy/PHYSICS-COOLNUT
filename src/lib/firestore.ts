// Firestore Database Helper Functions
// ============================================
// CRUD operations for app management with caching

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
    enableIndexedDbPersistence,
    getDocsFromCache,
    getDocsFromServer,
} from "firebase/firestore";
import { db } from "./firebase";

// Enable offline persistence for faster loading
enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
        console.warn('Multiple tabs open, persistence enabled in first tab only');
    } else if (err.code === 'unimplemented') {
        console.warn('Browser does not support persistence');
    }
});

// Collection name for apps
const APPS_COLLECTION = "apps";

// Simple memory cache
let appsCache: AppDocument[] | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 30000; // 30 seconds

// App data interface matching the existing AppData type
export interface AppDocument {
    id?: string;
    name: string;
    url: string;
    iconUrl: string;
    zone: "student" | "teacher" | "both";
    color?: string;
    order: number;
    isEnabled?: boolean;
    createdAt?: Timestamp;
    updatedAt?: Timestamp;
}

/**
 * Get all apps from Firestore, ordered by 'order' field
 * Uses cache first strategy for better performance
 */
export async function getApps(forceRefresh = false): Promise<AppDocument[]> {
    const now = Date.now();
    
    // Return memory cache if valid
    if (!forceRefresh && appsCache && (now - lastFetchTime) < CACHE_DURATION) {
        console.log("Using memory cache");
        return appsCache;
    }

    try {
        const appsRef = collection(db, APPS_COLLECTION);
        const q = query(appsRef, orderBy("order", "asc"));
        
        // Try cache first
        let snapshot;
        try {
            snapshot = await getDocsFromCache(q);
            console.log("Using Firestore cache");
        } catch {
            // Fall back to server
            snapshot = await getDocsFromServer(q);
            console.log("Using Firestore server");
        }

        const apps = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        })) as AppDocument[];

        // Update memory cache
        appsCache = apps;
        lastFetchTime = now;

        return apps;
    } catch (error) {
        console.error("Error fetching apps:", error);
        // Return stale cache if available
        if (appsCache) {
            console.log("Returning stale cache due to error");
            return appsCache;
        }
        throw new Error("Failed to fetch apps");
    }
}

/**
 * Clear the memory cache
 */
export function clearAppsCache(): void {
    appsCache = null;
    lastFetchTime = 0;
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
        throw new Error("Failed to fetch app");
    }
}

/**
 * Add a new app to Firestore
 */
export async function addApp(
    appData: Omit<AppDocument, "id" | "order" | "createdAt" | "updatedAt">
): Promise<string> {
    try {
        // Get the current highest order
        const apps = await getApps();
        const maxOrder = apps.length > 0 ? Math.max(...apps.map((a) => a.order || 0)) : -1;

        const newApp = {
            ...appData,
            order: maxOrder + 1,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        };

        const docRef = await addDoc(collection(db, APPS_COLLECTION), newApp);
        console.log("App added with ID:", docRef.id);
        
        // Clear cache to force refresh
        clearAppsCache();
        
        return docRef.id;
    } catch (error) {
        console.error("Error adding app:", error);
        throw new Error("Failed to add app");
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
        await updateDoc(docRef, {
            ...appData,
            updatedAt: Timestamp.now(),
        });
        console.log("App updated:", appId);
        
        // Clear cache
        clearAppsCache();
    } catch (error) {
        console.error("Error updating app:", error);
        throw new Error("Failed to update app");
    }
}

/**
 * Delete an app from Firestore
 */
export async function deleteApp(appId: string): Promise<void> {
    try {
        const docRef = doc(db, APPS_COLLECTION, appId);
        await deleteDoc(docRef);
        console.log("App deleted:", appId);
        
        // Clear cache
        clearAppsCache();
    } catch (error) {
        console.error("Error deleting app:", error);
        throw new Error("Failed to delete app");
    }
}

/**
 * Reorder an app
 */
export async function reorderApp(
    appId: string,
    direction: "up" | "down"
): Promise<void> {
    try {
        const apps = await getApps();
        const currentIndex = apps.findIndex((a) => a.id === appId);

        if (currentIndex === -1) {
            throw new Error("App not found");
        }

        const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

        if (targetIndex < 0 || targetIndex >= apps.length) {
            console.log("Cannot move further in this direction");
            return;
        }

        const currentApp = apps[currentIndex];
        const targetApp = apps[targetIndex];

        const batch = writeBatch(db);

        const currentDocRef = doc(db, APPS_COLLECTION, currentApp.id!);
        const targetDocRef = doc(db, APPS_COLLECTION, targetApp.id!);

        batch.update(currentDocRef, {
            order: targetApp.order,
            updatedAt: Timestamp.now(),
        });
        batch.update(targetDocRef, {
            order: currentApp.order,
            updatedAt: Timestamp.now(),
        });

        await batch.commit();
        console.log("Apps reordered successfully");
        
        // Clear cache
        clearAppsCache();
    } catch (error) {
        console.error("Error reordering app:", error);
        throw new Error("Failed to reorder app");
    }
}

export async function normalizeAppOrders(): Promise<void> {
    try {
        const apps = await getApps();
        const batch = writeBatch(db);

        apps.forEach((app, index) => {
            if (app.order !== index) {
                const docRef = doc(db, APPS_COLLECTION, app.id!);
                batch.update(docRef, { order: index });
            }
        });

        await batch.commit();
        console.log("App orders normalized");
        clearAppsCache();
    } catch (error) {
        console.error("Error normalizing orders:", error);
    }
}
