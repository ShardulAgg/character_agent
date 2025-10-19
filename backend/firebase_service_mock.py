# Mock Firebase Service for Development
# This is a temporary mock until firebase-admin can be installed

import logging
from typing import List, Dict, Optional
import asyncio

logger = logging.getLogger(__name__)

class FirebaseService:
    def __init__(self):
        logger.warning("Using mock Firebase service - install firebase-admin for full functionality")
        
    async def get_all_email_users(self) -> List[Dict]:
        """Mock: Return sample users"""
        return [
            {
                'id': 'user_example_com',
                'email': 'user@example.com',
                'imageIds': ['img_123', 'img_456'],
                'voiceIds': ['voice_789'],
                'projectIds': []
            },
            {
                'id': 'test_user_org',
                'email': 'test@user.org',
                'imageIds': ['img_abc'],
                'voiceIds': ['voice_def', 'voice_ghi'],
                'projectIds': []
            }
        ]
    
    async def get_image_metadata(self, image_id: str) -> Optional[Dict]:
        """Mock: Return sample image metadata"""
        return {
            'id': image_id,
            'storagePath': f'images/{image_id}.jpg',
            'originalName': f'photo_{image_id}.jpg',
            'fileSize': 1024000,
            'mimeType': 'image/jpeg'
        }
    
    async def get_voice_metadata(self, voice_id: str) -> Optional[Dict]:
        """Mock: Return sample voice metadata"""
        return {
            'id': voice_id,
            'storagePath': f'voices/{voice_id}.mp3',
            'originalName': f'recording_{voice_id}.mp3',
            'fileSize': 2048000,
            'mimeType': 'audio/mpeg'
        }
    
    async def download_file_from_storage(self, storage_path: str) -> bytes:
        """Mock: Return dummy file data"""
        # Simulate download delay
        await asyncio.sleep(0.1)
        # Return dummy data
        return b'mock_file_data_' + storage_path.encode()
    
    async def get_user_media_files(self, user_data: Dict) -> Dict:
        """Mock: Get all media files for a user"""
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
                    image_data = await self.download_file_from_storage(image_metadata['storagePath'])
                    result['images'].append({
                        'id': image_id,
                        'metadata': image_metadata,
                        'file_data': image_data,
                        'file_size': len(image_data)
                    })
            except Exception as e:
                result['errors'].append(f"Error processing image {image_id}: {str(e)}")
        
        # Process voices
        voice_ids = user_data.get('voiceIds', [])
        for voice_id in voice_ids:
            try:
                voice_metadata = await self.get_voice_metadata(voice_id)
                if voice_metadata:
                    voice_data = await self.download_file_from_storage(voice_metadata['storagePath'])
                    result['voices'].append({
                        'id': voice_id,
                        'metadata': voice_metadata,
                        'file_data': voice_data,
                        'file_size': len(voice_data)
                    })
            except Exception as e:
                result['errors'].append(f"Error processing voice {voice_id}: {str(e)}")
        
        return result