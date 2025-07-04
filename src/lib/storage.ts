
'use client';

import { ref, getDownloadURL, uploadBytesResumable, type UploadTask, deleteObject } from 'firebase/storage';
import { storage } from '@/lib/firebase';

/**
 * Uploads a file to a specified path in Firebase Storage and reports progress.
 * This is a generic function used for all file uploads (observations, inspections, PTWs, etc.).
 * @param file The file to upload.
 * @param path The storage path (e.g., 'observations', 'inspections').
 * @param userId The UID of the user uploading the file.
 * @param onProgress A callback function to report upload progress (0-100).
 * @param projectId Optional. If provided, the file is stored in a project-specific folder.
 * @returns A promise that resolves with the public download URL of the file.
 */
export function uploadFile(
  file: File,
  path: string,
  userId: string,
  onProgress: (progress: number) => void,
  projectId: string | null = null
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file || !userId) {
      return reject(new Error('File or user ID is missing.'));
    }

    const fileName = `${Date.now()}-${file.name}`;
    const storagePath = projectId
      ? `projects/${projectId}/${path}/${userId}/${fileName}`
      : `${path}/${userId}/${fileName}`;
      
    const storageRef = ref(storage, storagePath);
    const uploadTask: UploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        onProgress(progress);
      },
      (error) => {
        console.error('Firebase Storage upload error:', error);
        if (error.code === 'storage/unauthorized') {
            const detailedError = 'Gagal mengunggah file karena masalah izin. Ini bisa disebabkan oleh dua hal: 1) Konfigurasi CORS di Firebase Storage belum diatur (lihat README.md), atau 2) Aturan keamanan (storage.rules) tidak mengizinkan unggahan ini. Silakan periksa kedua hal tersebut.';
            reject(new Error(detailedError));
        } else {
            reject(new Error('Gagal mengunggah file. Silakan periksa koneksi Anda.'));
        }
      },
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadURL);
        } catch (error) {
          console.error('Firebase Storage get URL error:', error);
          reject(new Error('Gagal mendapatkan URL unduhan setelah unggah selesai.'));
        }
      }
    );
  });
}


/**
 * Deletes a file from Firebase Storage based on its download URL.
 * @param fileUrl The public download URL of the file to delete.
 * @returns A promise that resolves when the file is deleted.
 */
export function deleteFile(fileUrl: string | undefined): Promise<void> {
  // Don't try to delete placeholder images or invalid URLs
  if (!fileUrl || fileUrl.includes('placehold.co') || !fileUrl.startsWith('https://firebasestorage.googleapis.com')) {
    return Promise.resolve();
  }
  
  try {
    const storageRef = ref(storage, fileUrl);
    return deleteObject(storageRef).catch((error) => {
      // It's okay if the file doesn't exist (e.g., already deleted), so we can ignore 'object-not-found'.
      if (error.code === 'storage/object-not-found') {
        console.warn(`File not found for deletion, probably already deleted: ${fileUrl}`);
      } else {
        // For other errors, we log them but don't re-throw.
        // This prevents the entire Firestore document deletion from failing if a storage file deletion fails for some reason.
        console.error("Error deleting file from storage:", error);
      }
    });
  } catch (error) {
    console.error(`Invalid URL provided to deleteFile: ${fileUrl}`, error);
    return Promise.resolve();
  }
}
