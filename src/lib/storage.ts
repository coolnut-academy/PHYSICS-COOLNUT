// Firebase Storage Helper Functions
// ============================================
// Handles image uploads with progress tracking

import { getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { app } from "./firebase";

// Initialize Firebase Storage
const storage = getStorage(app);

export interface UploadProgress {
    progress: number; // 0-100
    status: 'pending' | 'uploading' | 'success' | 'error';
    downloadURL?: string;
    error?: string;
}

/**
 * Upload an image file to Firebase Storage with progress tracking
 * @param file - The file to upload
 * @param onProgress - Callback for progress updates
 * @param folder - The folder path in storage (default: 'app-icons')
 * @returns Promise with the download URL
 */
export async function uploadImage(
    file: File, 
    onProgress?: (progress: UploadProgress) => void,
    folder: string = "app-icons"
): Promise<string> {
    return new Promise((resolve, reject) => {
        // Generate a unique filename
        const timestamp = Date.now();
        const sanitizedName = file.name.replace(/[^a-zA-Z0-9.]/g, "_");
        const fileName = `${timestamp}_${sanitizedName}`;

        // Create reference
        const storageRef = ref(storage, `${folder}/${fileName}`);

        // Start upload with resumable
        const uploadTask = uploadBytesResumable(storageRef, file, {
            contentType: file.type,
        });

        // Track progress
        uploadTask.on(
            'state_changed',
            (snapshot) => {
                const progress = Math.round(
                    (snapshot.bytesTransferred / snapshot.totalBytes) * 100
                );
                console.log(`Upload is ${progress}% done`);
                onProgress?.({
                    progress,
                    status: 'uploading',
                });
            },
            (error) => {
                console.error("Upload error:", error);
                onProgress?.({
                    progress: 0,
                    status: 'error',
                    error: error.message,
                });
                reject(new Error("Failed to upload image: " + error.message));
            },
            async () => {
                try {
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                    console.log("Image uploaded successfully:", downloadURL);
                    onProgress?.({
                        progress: 100,
                        status: 'success',
                        downloadURL,
                    });
                    resolve(downloadURL);
                } catch (error) {
                    reject(error);
                }
            }
        );
    });
}

/**
 * Delete an image from Firebase Storage
 */
export async function deleteImage(imageUrl: string): Promise<void> {
    try {
        if (!imageUrl.includes("firebasestorage.googleapis.com") &&
            !imageUrl.includes("firebasestorage.app")) {
            console.log("Not a Firebase Storage URL, skipping delete");
            return;
        }

        const imageRef = ref(storage, imageUrl);
        await deleteObject(imageRef);
        console.log("Image deleted successfully");
    } catch (error) {
        console.warn("Error deleting image (may not exist):", error);
    }
}

export { storage };
