import { db } from '../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

export async function testFirestoreConnection() {
  try {
    console.log('Testing Firestore connection...');
    
    // Test 1: Try to read from a collection
    const testCollection = collection(db, 'test');
    console.log('✓ Collection reference created');
    
    // Test 2: Try a simple query (this will create the connection)
    const snapshot = await getDocs(testCollection);
    console.log('✓ Firestore query successful, docs:', snapshot.size);
    
    return { success: true, message: 'Firestore connection successful' };
  } catch (error: any) {
    console.error('✗ Firestore connection failed:', error);
    
    // Check specific error types
    if (error.code === 'permission-denied') {
      return { 
        success: false, 
        message: 'Permission denied - check Firestore security rules',
        error: error.code
      };
    } else if (error.code === 'unavailable') {
      return { 
        success: false, 
        message: 'Firestore unavailable - check network/project configuration',
        error: error.code
      };
    } else {
      return { 
        success: false, 
        message: error.message || 'Unknown Firestore error',
        error: error.code || 'unknown'
      };
    }
  }
}