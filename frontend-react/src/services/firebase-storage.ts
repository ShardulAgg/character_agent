import { 
  ref, 
  uploadBytesResumable, 
  getDownloadURL, 
  deleteObject,
  UploadTaskSnapshot 
} from 'firebase/storage';
import { storage } from '../lib/firebase';

export interface UploadProgress {
  progress: number;
  state: 'running' | 'paused' | 'success' | 'error';
  error?: string;
}

export interface FirebaseUploadResult {
  url: string;
  path: string;
  name: string;
}

export class FirebaseStorageService {
  // Upload file to Firebase Storage
  static async uploadFile(
    file: File, 
    folder: 'images' | 'voices',
    onProgress?: (progress: UploadProgress) => void
  ): Promise<FirebaseUploadResult> {
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `${timestamp}_${sanitizedName}`;
    const filePath = `${folder}/${fileName}`;
    
    const storageRef = ref(storage, filePath);
    const uploadTask = uploadBytesResumable(storageRef, file);

    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot: UploadTaskSnapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          
          if (onProgress) {
            onProgress({
              progress,
              state: snapshot.state === 'running' ? 'running' : 'paused'
            });
          }
        },
        (error) => {
          console.error('Upload failed:', error);
          if (onProgress) {
            onProgress({
              progress: 0,
              state: 'error',
              error: error.message
            });
          }
          reject(error);
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            
            if (onProgress) {
              onProgress({
                progress: 100,
                state: 'success'
              });
            }

            resolve({
              url: downloadURL,
              path: filePath,
              name: fileName
            });
          } catch (error) {
            reject(error);
          }
        }
      );
    });
  }

  // Delete file from Firebase Storage
  static async deleteFile(filePath: string): Promise<void> {
    const storageRef = ref(storage, filePath);
    await deleteObject(storageRef);
  }

  // Get download URL for a file
  static async getDownloadURL(filePath: string): Promise<string> {
    const storageRef = ref(storage, filePath);
    return await getDownloadURL(storageRef);
  }

  // Generate a unique file name
  static generateFileName(originalName: string, folder: string): string {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = originalName.split('.').pop();
    return `${folder}/${timestamp}_${randomString}.${extension}`;
  }

  // Validate file type and size
  static validateFile(file: File, type: 'image' | 'voice'): { valid: boolean; error?: string } {
    const maxSizes = {
      image: 10 * 1024 * 1024, // 10MB
      voice: 50 * 1024 * 1024, // 50MB
    };

    const allowedTypes = {
      image: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
      voice: ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a', 'audio/aac'],
    };

    if (file.size > maxSizes[type]) {
      return {
        valid: false,
        error: `File size must be less than ${maxSizes[type] / (1024 * 1024)}MB`
      };
    }

    if (!allowedTypes[type].includes(file.type)) {
      return {
        valid: false,
        error: `Invalid file type. Allowed types: ${allowedTypes[type].join(', ')}`
      };
    }

    return { valid: true };
  }
}