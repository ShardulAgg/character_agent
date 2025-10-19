export interface User {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  createdAt: Date;
}

// New email-based user interface
export interface EmailUser {
  email: string; // This serves as the document ID
  displayName?: string;
  imageIds: string[]; // Array of image document IDs
  voiceIds: string[]; // Array of voice document IDs
  projectIds: string[]; // Array of project document IDs
  createdAt: Date;
  updatedAt: Date;
  lastActive?: Date;
}

export interface BaseMediaItem {
  id: string;
  userId: string;
  userEmail: string;
  fileName: string;
  originalName: string;
  storagePath: string;
  downloadUrl: string;
  fileSize: number;
  mimeType: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ImageMetadata extends BaseMediaItem {
  type: 'image';
  width?: number;
  height?: number;
  variations?: ImageVariationMetadata[];
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  processingError?: string;
}

export interface ImageVariationMetadata {
  id: string;
  angle: string;
  storagePath?: string;
  downloadUrl?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
}

export interface VoiceMetadata extends BaseMediaItem {
  type: 'voice';
  duration?: number;
  voiceSignature?: VoiceSignatureMetadata;
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  processingError?: string;
}

export interface VoiceSignatureMetadata {
  id: string;
  text: string;
  storagePath?: string;
  downloadUrl?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
}

export interface Project {
  id: string;
  userId: string;
  userEmail: string;
  name: string;
  description?: string;
  imageId?: string;
  voiceId?: string;
  status: 'draft' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  updatedAt: Date;
}

// Firestore collection names
export const COLLECTIONS = {
  USERS: 'users',
  EMAIL_USERS: 'email_users', // New email-based user collection
  IMAGES: 'images',
  VOICES: 'voices',
  PROJECTS: 'projects',
} as const;