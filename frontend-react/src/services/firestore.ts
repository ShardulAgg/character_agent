import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  setDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  ImageMetadata,
  VoiceMetadata,
  Project,
  User,
  EmailUser,
  COLLECTIONS,
} from '../types/firestore';

export class FirestoreService {
  // Email-based user operations
  static async createOrUpdateEmailUser(email: string, displayName?: string): Promise<EmailUser> {
    try {
      // Use email as document ID (replace invalid characters)
      const emailDocId = email.replace(/[@.]/g, '_');
      const userRef = doc(db, COLLECTIONS.EMAIL_USERS, emailDocId);
      
      // Check if user already exists
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        // Update existing user's last active time
        const updateData = {
          lastActive: serverTimestamp(),
          ...(displayName && { displayName }),
        };
        
        await updateDoc(userRef, updateData);
        
        const userData = userSnap.data() as EmailUser;
        return {
          ...userData,
          lastActive: new Date(),
          ...(displayName && { displayName }),
        };
      } else {
        // Create new user
        const newUserData = {
          email,
          displayName: displayName || '',
          imageIds: [],
          voiceIds: [],
          projectIds: [],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          lastActive: serverTimestamp(),
        };
        
        await setDoc(userRef, newUserData);
        
        return {
          email,
          displayName: displayName || '',
          imageIds: [],
          voiceIds: [],
          projectIds: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          lastActive: new Date(),
        };
      }
    } catch (error) {
      console.error('Error creating/updating email user:', error);
      throw error;
    }
  }

  static async getEmailUser(email: string): Promise<EmailUser | null> {
    try {
      const emailDocId = email.replace(/[@.]/g, '_');
      const userRef = doc(db, COLLECTIONS.EMAIL_USERS, emailDocId);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const data = userSnap.data();
        return {
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          lastActive: data.lastActive?.toDate() || new Date(),
        } as EmailUser;
      }
      return null;
    } catch (error) {
      console.error('Error getting email user:', error);
      throw error;
    }
  }

  static async addImageToUser(email: string, imageId: string): Promise<void> {
    try {
      const emailDocId = email.replace(/[@.]/g, '_');
      const userRef = doc(db, COLLECTIONS.EMAIL_USERS, emailDocId);
      
      // Get current user data
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.data() as EmailUser;
        const updatedImageIds = [...(userData.imageIds || []), imageId];
        
        await updateDoc(userRef, {
          imageIds: updatedImageIds,
          updatedAt: serverTimestamp(),
          lastActive: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error('Error adding image to user:', error);
      throw error;
    }
  }

  static async addVoiceToUser(email: string, voiceId: string): Promise<void> {
    try {
      const emailDocId = email.replace(/[@.]/g, '_');
      const userRef = doc(db, COLLECTIONS.EMAIL_USERS, emailDocId);
      
      // Get current user data
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.data() as EmailUser;
        const updatedVoiceIds = [...(userData.voiceIds || []), voiceId];
        
        await updateDoc(userRef, {
          voiceIds: updatedVoiceIds,
          updatedAt: serverTimestamp(),
          lastActive: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error('Error adding voice to user:', error);
      throw error;
    }
  }

  static async addProjectToUser(email: string, projectId: string): Promise<void> {
    try {
      const emailDocId = email.replace(/[@.]/g, '_');
      const userRef = doc(db, COLLECTIONS.EMAIL_USERS, emailDocId);
      
      // Get current user data
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.data() as EmailUser;
        const updatedProjectIds = [...(userData.projectIds || []), projectId];
        
        await updateDoc(userRef, {
          projectIds: updatedProjectIds,
          updatedAt: serverTimestamp(),
          lastActive: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error('Error adding project to user:', error);
      throw error;
    }
  }

  // User operations (existing)
  static async createUser(userData: Omit<User, 'createdAt'>): Promise<string> {
    try {
      const userDoc = {
        ...userData,
        createdAt: serverTimestamp(),
      };
      
      // Use the user's UID as the document ID
      const userRef = doc(db, COLLECTIONS.USERS, userData.uid);
      await updateDoc(userRef, userDoc);
      return userData.uid;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  static async getUser(uid: string): Promise<User | null> {
    try {
      const userRef = doc(db, COLLECTIONS.USERS, uid);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const data = userSnap.data();
        return {
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
        } as User;
      }
      return null;
    } catch (error) {
      console.error('Error getting user:', error);
      throw error;
    }
  }

  // Image metadata operations
  static async createImageMetadata(imageData: Omit<ImageMetadata, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const imageDoc = {
        ...imageData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      
      const docRef = await addDoc(collection(db, COLLECTIONS.IMAGES), imageDoc);
      return docRef.id;
    } catch (error) {
      console.error('Error creating image metadata:', error);
      throw error;
    }
  }

  static async getImageMetadata(imageId: string): Promise<ImageMetadata | null> {
    try {
      const imageRef = doc(db, COLLECTIONS.IMAGES, imageId);
      const imageSnap = await getDoc(imageRef);
      
      if (imageSnap.exists()) {
        const data = imageSnap.data();
        return {
          id: imageSnap.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        } as ImageMetadata;
      }
      return null;
    } catch (error) {
      console.error('Error getting image metadata:', error);
      throw error;
    }
  }

  static async updateImageMetadata(imageId: string, updates: Partial<ImageMetadata>): Promise<void> {
    try {
      const imageRef = doc(db, COLLECTIONS.IMAGES, imageId);
      await updateDoc(imageRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error updating image metadata:', error);
      throw error;
    }
  }

  static async getUserImages(userId: string, limitCount = 50): Promise<ImageMetadata[]> {
    try {
      const q = query(
        collection(db, COLLECTIONS.IMAGES),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      })) as ImageMetadata[];
    } catch (error) {
      console.error('Error getting user images:', error);
      throw error;
    }
  }

  // Voice metadata operations
  static async createVoiceMetadata(voiceData: Omit<VoiceMetadata, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const voiceDoc = {
        ...voiceData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      
      const docRef = await addDoc(collection(db, COLLECTIONS.VOICES), voiceDoc);
      return docRef.id;
    } catch (error) {
      console.error('Error creating voice metadata:', error);
      throw error;
    }
  }

  static async getVoiceMetadata(voiceId: string): Promise<VoiceMetadata | null> {
    try {
      const voiceRef = doc(db, COLLECTIONS.VOICES, voiceId);
      const voiceSnap = await getDoc(voiceRef);
      
      if (voiceSnap.exists()) {
        const data = voiceSnap.data();
        return {
          id: voiceSnap.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        } as VoiceMetadata;
      }
      return null;
    } catch (error) {
      console.error('Error getting voice metadata:', error);
      throw error;
    }
  }

  static async updateVoiceMetadata(voiceId: string, updates: Partial<VoiceMetadata>): Promise<void> {
    try {
      const voiceRef = doc(db, COLLECTIONS.VOICES, voiceId);
      await updateDoc(voiceRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error updating voice metadata:', error);
      throw error;
    }
  }

  static async getUserVoices(userId: string, limitCount = 50): Promise<VoiceMetadata[]> {
    try {
      const q = query(
        collection(db, COLLECTIONS.VOICES),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      })) as VoiceMetadata[];
    } catch (error) {
      console.error('Error getting user voices:', error);
      throw error;
    }
  }

  // Project operations
  static async createProject(projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const projectDoc = {
        ...projectData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      
      const docRef = await addDoc(collection(db, COLLECTIONS.PROJECTS), projectDoc);
      return docRef.id;
    } catch (error) {
      console.error('Error creating project:', error);
      throw error;
    }
  }

  static async getProject(projectId: string): Promise<Project | null> {
    try {
      const projectRef = doc(db, COLLECTIONS.PROJECTS, projectId);
      const projectSnap = await getDoc(projectRef);
      
      if (projectSnap.exists()) {
        const data = projectSnap.data();
        return {
          id: projectSnap.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        } as Project;
      }
      return null;
    } catch (error) {
      console.error('Error getting project:', error);
      throw error;
    }
  }

  static async updateProject(projectId: string, updates: Partial<Project>): Promise<void> {
    try {
      const projectRef = doc(db, COLLECTIONS.PROJECTS, projectId);
      await updateDoc(projectRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error updating project:', error);
      throw error;
    }
  }

  static async getUserProjects(userId: string, limitCount = 50): Promise<Project[]> {
    try {
      const q = query(
        collection(db, COLLECTIONS.PROJECTS),
        where('userId', '==', userId),
        orderBy('updatedAt', 'desc'),
        limit(limitCount)
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      })) as Project[];
    } catch (error) {
      console.error('Error getting user projects:', error);
      throw error;
    }
  }

  // Delete operations
  static async deleteImage(imageId: string): Promise<void> {
    try {
      const imageRef = doc(db, COLLECTIONS.IMAGES, imageId);
      await deleteDoc(imageRef);
    } catch (error) {
      console.error('Error deleting image:', error);
      throw error;
    }
  }

  static async deleteVoice(voiceId: string): Promise<void> {
    try {
      const voiceRef = doc(db, COLLECTIONS.VOICES, voiceId);
      await deleteDoc(voiceRef);
    } catch (error) {
      console.error('Error deleting voice:', error);
      throw error;
    }
  }

  static async deleteProject(projectId: string): Promise<void> {
    try {
      const projectRef = doc(db, COLLECTIONS.PROJECTS, projectId);
      await deleteDoc(projectRef);
    } catch (error) {
      console.error('Error deleting project:', error);
      throw error;
    }
  }
}