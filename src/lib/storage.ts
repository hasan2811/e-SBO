
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
        let errorMessage = 'Gagal mengunggah file. Silakan periksa koneksi Anda.';
        switch (error.code) {
          case 'storage/unauthorized':
            errorMessage = 'Upload Gagal: Izin ditolak. Konfigurasi CORS di Firebase Storage mungkin belum diatur dengan benar. Lihat README.md untuk detail.';
            break;
          case 'storage/canceled':
            errorMessage = 'Upload telah dibatalkan.';
            break;
          case 'storage/unknown':
            errorMessage = 'Terjadi kesalahan yang tidak diketahui di server penyimpanan. Coba lagi nanti.';
            break;
        }
        reject(new Error(errorMessage));
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
