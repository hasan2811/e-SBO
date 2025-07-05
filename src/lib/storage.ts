'use client';

import { ref, getDownloadURL, uploadBytesResumable, type UploadTask } from 'firebase/storage';
import { storage } from '@/lib/firebase';

/**
 * Uploads a file to a specified path in Firebase Storage and reports progress.
 * This is a generic function used for all file uploads (observations, inspections, PTWs, etc.).
 * @param file The file to upload.
 * @param path The storage path (e.g., 'observations', 'inspections').
 * @param userId The UID of the user uploading the file.
 * @param onProgress A callback function to report upload progress (0-100).
 * @param projectId Optional. If provided, the file is stored in a project-specific folder.
 * @returns A promise that resolves with an object containing the public download URL and the storage path of the file.
 */
export function uploadFile(
  file: File,
  path: string,
  userId: string,
  onProgress: (progress: number) => void,
  projectId: string | null = null
): Promise<{ downloadURL: string; storagePath: string; }> {
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
        let errorMessage = 'Gagal mengunggah file. Silakan periksa koneksi Anda.';
        // This is a critical error message to guide the user on the most likely unfixable-by-code issue.
        if (error.code === 'storage/unauthorized' || error.code === 'storage/unknown') {
            errorMessage = `UPLOAD GAGAL: MASALAH KONFIGURASI SERVER. Aplikasi web ini tidak diizinkan untuk mengunggah file. Ini BUKAN masalah koneksi. Untuk memperbaiki, jalankan perintah berikut di terminal Anda: gsutil cors set cors.json gs://hssetech-e1710.appspot.com`;
        } else if (error.code === 'storage/canceled') {
            errorMessage = 'Upload telah dibatalkan.';
        }
        reject(new Error(errorMessage));
      },
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve({ downloadURL, storagePath });
        } catch (error) {
          console.error('Firebase Storage get URL error:', error);
          reject(new Error('Gagal mendapatkan URL unduhan setelah unggah selesai.'));
        }
      }
    );
  });
}
