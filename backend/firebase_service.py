import firebase_admin
from firebase_admin import credentials, firestore, storage
import os
from typing import List, Dict, Optional
import logging

# Initialize Firebase Admin SDK
def initialize_firebase():
    """Initialize Firebase Admin SDK"""
    try:
        # Check if already initialized
        firebase_admin.get_app()
    except ValueError:
        # Initialize with service account key or default credentials
        service_account_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH")
        
        if service_account_path and os.path.exists(service_account_path):
            # Use service account key file
            cred = credentials.Certificate(service_account_path)
            firebase_admin.initialize_app(cred, {
                'storageBucket': os.getenv("FIREBASE_STORAGE_BUCKET", "tiktok-genie.firebasestorage.app")
            })
        else:
            # Use default credentials (for GCP deployment)
            firebase_admin.initialize_app(options={
                'storageBucket': os.getenv("FIREBASE_STORAGE_BUCKET", "tiktok-genie.firebasestorage.app")
            })
    
    return firestore.client()

class FirebaseService:
    def __init__(self):
        self.db = initialize_firebase()
        self.bucket = storage.bucket()
        
    async def get_all_email_users(self) -> List[Dict]:
        """Get all users from email_users collection"""
        try:
            users_ref = self.db.collection('email_users')
            docs = users_ref.stream()
            
            users = []
            for doc in docs:
                user_data = doc.to_dict()
                user_data['id'] = doc.id
                users.append(user_data)
                
            return users
        except Exception as e:
            logging.error(f"Error getting email users: {e}")
            raise
    
    async def get_image_metadata(self, image_id: str) -> Optional[Dict]:
        """Get image metadata by ID"""
        try:
            doc_ref = self.db.collection('images').document(image_id)
            doc = doc_ref.get()
            
            if doc.exists:
                data = doc.to_dict()
                data['id'] = doc.id
                return data
            return None
        except Exception as e:
            logging.error(f"Error getting image metadata {image_id}: {e}")
            return None
    
    async def get_voice_metadata(self, voice_id: str) -> Optional[Dict]:
        """Get voice metadata by ID"""
        try:
            doc_ref = self.db.collection('voices').document(voice_id)
            doc = doc_ref.get()
            
            if doc.exists:
                data = doc.to_dict()
                data['id'] = doc.id
                return data
            return None
        except Exception as e:
            logging.error(f"Error getting voice metadata {voice_id}: {e}")
            return None
    
    async def download_file_from_storage(self, storage_path: str) -> bytes:
        """Download file from Firebase Storage"""
        try:
            blob = self.bucket.blob(storage_path)
            return blob.download_as_bytes()
        except Exception as e:
            logging.error(f"Error downloading file {storage_path}: {e}")
            raise
    
    async def get_user_media_files(self, user_data: Dict) -> Dict:
        """Get all media files for a user"""
        result = {
            'user_email': user_data.get('email'),
            'images': [],
            'voices': [],
            'errors': []
        }
        
        # Process images
        image_ids = user_data.get('imageIds', [])
        for image_id in image_ids:
            try:
                image_metadata = await self.get_image_metadata(image_id)
                if image_metadata:
                    # Download image file
                    storage_path = image_metadata.get('storagePath')
                    if storage_path:
                        image_data = await self.download_file_from_storage(storage_path)
                        result['images'].append({
                            'id': image_id,
                            'metadata': image_metadata,
                            'file_data': image_data,
                            'file_size': len(image_data)
                        })
                else:
                    result['errors'].append(f"Image metadata not found: {image_id}")
            except Exception as e:
                result['errors'].append(f"Error processing image {image_id}: {str(e)}")
        
        # Process voices
        voice_ids = user_data.get('voiceIds', [])
        for voice_id in voice_ids:
            try:
                voice_metadata = await self.get_voice_metadata(voice_id)
                if voice_metadata:
                    # Download voice file
                    storage_path = voice_metadata.get('storagePath')
                    if storage_path:
                        voice_data = await self.download_file_from_storage(storage_path)
                        result['voices'].append({
                            'id': voice_id,
                            'metadata': voice_metadata,
                            'file_data': voice_data,
                            'file_size': len(voice_data)
                        })
                else:
                    result['errors'].append(f"Voice metadata not found: {voice_id}")
            except Exception as e:
                result['errors'].append(f"Error processing voice {voice_id}: {str(e)}")
        
        return result