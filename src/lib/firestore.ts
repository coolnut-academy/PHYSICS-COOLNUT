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
    zone: "student" | "teacher" | "both";
    color?: string;
    order: number;
    isEnabled?: boolean;
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
        await updateDoc(docRef, {
            ...appData,
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
        console.log("Apps reordered successfully in database");
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
        console.log("App orders normalized in database");
    } catch (error) {
        console.error("Error normalizing orders:", error);
    }
}
