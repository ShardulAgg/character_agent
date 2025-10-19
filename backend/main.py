from fastapi import FastAPI, File, UploadFile, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import os
from typing import List, Dict, Optional
import aiofiles
from dotenv import load_dotenv
import requests
from elevenlabs import generate, set_api_key
from PIL import Image
import io
import base64
# from google import genai
# from google.genai import types
from PIL import Image
from io import BytesIO
import tempfile
import logging
import asyncio
import sys
import os

# Add current directory to Python path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from firebase_service import FirebaseService
    print("✓ Using real Firebase service")
except ImportError as e:
    print(f"⚠️  Firebase service not available ({e})")
    try:
        from firebase_service_mock import FirebaseService
        print("✓ Using mock Firebase service for development")
    except ImportError as e:
        print(f"❌ Mock service also failed ({e})")
        raise ImportError("Neither firebase_service nor firebase_service_mock could be imported")

load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Image & Voice Processing API")

# Initialize Firebase service
firebase_service = FirebaseService()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models for Firebase requests
class ProcessImageRequest(BaseModel):
    firebase_url: str
    filename: str
    num_variations: int = 5

class ProcessVoiceRequest(BaseModel):
    firebase_url: str
    filename: str
    text: str = "Hello, this is a voice signature"

# Set API keys
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")
NANOBANANA_API_KEY = os.getenv("NANOBANANA_API_KEY")
NANOBANANA_API_URL = os.getenv("NANOBANANA_API_URL", "https://api.nanobanana.com/v1")

if ELEVENLABS_API_KEY:
    set_api_key(ELEVENLABS_API_KEY)

# Create upload directories
os.makedirs("uploads/images", exist_ok=True)
os.makedirs("uploads/voices", exist_ok=True)
os.makedirs("outputs", exist_ok=True)
os.makedirs("downloads", exist_ok=True)

async def download_file_from_url(url: str) -> bytes:
    """Download file from URL and return bytes"""
    try:
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        return response.content
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to download file from URL: {str(e)}")

@app.get("/")
async def root():
    return {"message": "Image & Voice Processing API"}

@app.post("/upload-image")
async def upload_image(file: UploadFile = File(...)):
    # if not file.content_type.startswith("image/"):
    #     raise HTTPException(status_code=400, detail="File must be an image")
    
    file_path = f"uploads/images/{file.filename}"
    async with aiofiles.open(file_path, 'wb') as f:
        content = await file.read()
        await f.write(content)
    
    return {"filename": file.filename, "path": file_path}

@app.post("/upload-voice")
async def upload_voice(file: UploadFile = File(...)):
    if not file.content_type.startswith("audio/"):
        raise HTTPException(status_code=400, detail="File must be an audio file")
    
    file_path = f"uploads/voices/{file.filename}"
    async with aiofiles.open(file_path, 'wb') as f:
        content = await file.read()
        await f.write(content)
    
    return {"filename": file.filename, "path": file_path}

@app.post("/generate-image-variations")
async def generate_image_variations(filename: str, num_variations: int = 5):
    image_path = f"uploads/images/{filename}"
    
    if not os.path.exists(image_path):
        raise HTTPException(status_code=404, detail="Image not found")
    
    try:
        # Read and encode image
        with open(image_path, "rb") as img_file:
            img_data = base64.b64encode(img_file.read()).decode()
        
        # Call NanoBanana API
        headers = {
            "Authorization": f"Bearer {NANOBANANA_API_KEY}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "image": img_data,
            "num_variations": num_variations,
            "angles": ["front", "left", "right", "back", "top"],
            "format": "jpg"
        }
        
        response = requests.post(
            f"{NANOBANANA_API_URL}/generate-variations",
            json=payload,
            headers=headers
        )
        
        if response.status_code == 200:
            variations = response.json()
            return {"variations": variations, "status": "success"}
        else:
            raise HTTPException(status_code=500, detail="Failed to generate variations")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing image: {str(e)}")

# @app.post("/generate-image-variations-gemini")
# async def generate_image_variations(filename: str, num_variations: int = 5):
#     image_path = f"uploads/images/{filename}"
    
#     if not os.path.exists(image_path):
#         raise HTTPException(status_code=404, detail="Image not found")
    
#     try:
#         # Read and encode image
#         with open(image_path, "rb") as img_file:
#             img_data = base64.b64encode(img_file.read()).decode()
        
#         client = genai.Client()

#         prompt = (
#             "Create a picture of my cat eating a nano-banana in a "
#             "fancy restaurant under the Gemini constellation"
#         )

#         image = Image.open("/path/to/cat_image.png")

#         response = client.models.generate_content(
#             model="gemini-2.5-flash-image",
#             contents=[prompt, image]
#         )

#         for part in response.candidates[0].content.parts:
#             if part.text is not None:
#                 print(part.text)
#             elif part.inline_data is not None:
#                 image = Image.open(BytesIO(part.inline_data.data))
#                 image.save(f"outputs/generated_image_{filename}.png")
        
#         return {"response": response.to_dict(), "status": "success"}
        
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"Error processing image: {str(e)}")
        

@app.post("/generate-voice-signature")
async def generate_voice_signature(filename: str, text: str = "Hello, this is a voice signature"):
    voice_path = f"uploads/voices/{filename}"
    
    if not os.path.exists(voice_path):
        raise HTTPException(status_code=404, detail="Voice file not found")
    
    try:
        # Generate voice signature using Eleven Labs
        audio = generate(
            text=text,
            voice="Adam",  # Default voice, can be customized
            model="eleven_monolingual_v1"
        )
        
        # Save generated audio
        output_path = f"outputs/voice_signature_{filename}"
        with open(output_path, "wb") as f:
            f.write(audio)
        
        return {
            "signature_path": output_path,
            "original_voice": voice_path,
            "text_used": text,
            "status": "success"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating voice signature: {str(e)}")

@app.post("/process-image-firebase")
async def process_image_firebase(request: ProcessImageRequest):
    """Process image from Firebase Storage URL"""
    try:
        # Download image from Firebase URL
        image_data = await download_file_from_url(request.firebase_url)
        
        # Save to temporary file for processing
        with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as temp_file:
            temp_file.write(image_data)
            temp_file_path = temp_file.name
        
        try:
            # Process with Gemini API (if available)
            client = genai.Client()
            
            # Load image
            image = Image.open(temp_file_path)
            
            prompt = (
                f"Generate {request.num_variations} different angle variations of this image. "
                "Create variations with different perspectives like front, left, right, back, and top views. "
                "Maintain the style and content while changing the viewing angle."
            )
            
            response = client.models.generate_content(
                model="gemini-2.5-flash-image",
                contents=[prompt, image]
            )
            
            variations = []
            angles = ["front", "left", "right", "back", "top"]
            
            for i in range(min(request.num_variations, len(angles))):
                variations.append({
                    "angle": angles[i],
                    "status": "generated"
                })
            
            # Save response for debugging
            output_path = f"outputs/gemini_response_{request.filename}.json"
            with open(output_path, "w") as f:
                import json
                json.dump(response.to_dict(), f, indent=2)
            
            return {
                "variations": {"images": variations},
                "status": "success",
                "firebase_url": request.firebase_url,
                "response_saved": output_path
            }
            
        finally:
            # Clean up temporary file
            os.unlink(temp_file_path)
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing image from Firebase: {str(e)}")

@app.post("/process-voice-firebase")
async def process_voice_firebase(request: ProcessVoiceRequest):
    """Process voice from Firebase Storage URL"""
    try:
        # Download voice file from Firebase URL
        voice_data = await download_file_from_url(request.firebase_url)
        
        # Save to temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.mp3') as temp_file:
            temp_file.write(voice_data)
            temp_file_path = temp_file.name
        
        try:
            # Generate voice signature using Eleven Labs
            audio = generate(
                text=request.text,
                voice="Adam",  # Default voice, can be customized
                model="eleven_monolingual_v1"
            )
            
            # Save generated audio
            output_path = f"outputs/voice_signature_firebase_{request.filename}"
            with open(output_path, "wb") as f:
                f.write(audio)
            
            return {
                "signature_path": output_path,
                "original_firebase_url": request.firebase_url,
                "text_used": request.text,
                "status": "success"
            }
            
        finally:
            # Clean up temporary file
            os.unlink(temp_file_path)
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing voice from Firebase: {str(e)}")

# New Batch Processing Models
class BatchProcessingStatus(BaseModel):
    status: str
    total_users: int
    processed_users: int
    current_user: Optional[str] = None
    errors: List[str] = []

class UserProcessingResult(BaseModel):
    user_email: str
    images_count: int
    voices_count: int
    total_files_downloaded: int
    total_size_bytes: int
    errors: List[str]

class BatchProcessingResult(BaseModel):
    status: str
    total_users_processed: int
    successful_users: int
    failed_users: int
    total_files_downloaded: int
    total_size_bytes: int
    processing_time_seconds: float
    user_results: List[UserProcessingResult]
    global_errors: List[str]

# Global variable to track batch processing status
batch_status = BatchProcessingStatus(
    status="idle",
    total_users=0,
    processed_users=0,
    current_user=None,
    errors=[]
)

@app.post("/batch-process-users", response_model=Dict)
async def batch_process_users(background_tasks: BackgroundTasks):
    """Start batch processing of all email users and their media files"""
    global batch_status
    
    if batch_status.status == "processing":
        return {
            "message": "Batch processing is already in progress",
            "status": batch_status.status,
            "progress": f"{batch_status.processed_users}/{batch_status.total_users}"
        }
    
    # Start background processing
    background_tasks.add_task(process_all_users)
    
    return {
        "message": "Batch processing started",
        "status": "processing",
        "endpoint": "/batch-process-status"
    }

@app.get("/batch-process-status", response_model=BatchProcessingStatus)
async def get_batch_processing_status():
    """Get current status of batch processing"""
    return batch_status

@app.get("/batch-process-results")
async def get_batch_processing_results():
    """Get detailed results of the last batch processing run"""
    # This would typically be stored in a database or file
    # For now, return current status
    return batch_status

async def process_all_users():
    """Background task to process all users and download their media"""
    global batch_status
    import time
    
    start_time = time.time()
    
    try:
        # Reset status
        batch_status.status = "processing"
        batch_status.processed_users = 0
        batch_status.errors = []
        batch_status.current_user = None
        
        # Get all email users
        logger.info("Starting batch processing of email users")
        users = await firebase_service.get_all_email_users()
        batch_status.total_users = len(users)
        
        user_results = []
        total_files = 0
        total_size = 0
        successful_users = 0
        failed_users = 0
        
        logger.info(f"Found {len(users)} users to process")
        
        for user in users:
            user_email = user.get('email', 'unknown')
            batch_status.current_user = user_email
            
            logger.info(f"Processing user: {user_email}")
            
            try:
                # Get user's media files
                user_media = await firebase_service.get_user_media_files(user)
                
                # Count files and calculate size
                images_count = len(user_media['images'])
                voices_count = len(user_media['voices'])
                user_files = images_count + voices_count
                user_size = sum(item['file_size'] for item in user_media['images']) + \
                           sum(item['file_size'] for item in user_media['voices'])
                
                # Save files to local storage (optional)
                await save_user_media_to_disk(user_email, user_media)
                
                # Create user result
                user_result = UserProcessingResult(
                    user_email=user_email,
                    images_count=images_count,
                    voices_count=voices_count,
                    total_files_downloaded=user_files,
                    total_size_bytes=user_size,
                    errors=user_media['errors']
                )
                
                user_results.append(user_result)
                total_files += user_files
                total_size += user_size
                
                if user_media['errors']:
                    logger.warning(f"User {user_email} had errors: {user_media['errors']}")
                    failed_users += 1
                else:
                    successful_users += 1
                
                logger.info(f"Completed user {user_email}: {user_files} files, {user_size} bytes")
                
            except Exception as e:
                error_msg = f"Failed to process user {user_email}: {str(e)}"
                logger.error(error_msg)
                batch_status.errors.append(error_msg)
                failed_users += 1
                
                # Add failed user result
                user_results.append(UserProcessingResult(
                    user_email=user_email,
                    images_count=0,
                    voices_count=0,
                    total_files_downloaded=0,
                    total_size_bytes=0,
                    errors=[str(e)]
                ))
            
            batch_status.processed_users += 1
        
        # Calculate final results
        processing_time = time.time() - start_time
        
        # Update final status
        batch_status.status = "completed"
        batch_status.current_user = None
        
        # Store detailed results (in a real app, you'd save this to a database)
        final_result = BatchProcessingResult(
            status="completed",
            total_users_processed=len(users),
            successful_users=successful_users,
            failed_users=failed_users,
            total_files_downloaded=total_files,
            total_size_bytes=total_size,
            processing_time_seconds=processing_time,
            user_results=user_results,
            global_errors=batch_status.errors
        )
        
        logger.info(f"Batch processing completed: {total_files} files, {total_size} bytes, {processing_time:.2f}s")
        
    except Exception as e:
        batch_status.status = "failed"
        batch_status.current_user = None
        error_msg = f"Batch processing failed: {str(e)}"
        batch_status.errors.append(error_msg)
        logger.error(error_msg)

async def save_user_media_to_disk(user_email: str, user_media: Dict):
    """Save user's media files to local disk (optional)"""
    try:
        # Create user directory
        safe_email = user_email.replace('@', '_').replace('.', '_')
        user_dir = f"downloads/{safe_email}"
        os.makedirs(user_dir, exist_ok=True)
        os.makedirs(f"{user_dir}/images", exist_ok=True)
        os.makedirs(f"{user_dir}/voices", exist_ok=True)
        
        # Save images
        for image in user_media['images']:
            filename = image['metadata'].get('originalName', f"image_{image['id']}")
            filepath = os.path.join(user_dir, 'images', filename)
            
            async with aiofiles.open(filepath, 'wb') as f:
                await f.write(image['file_data'])
        
        # Save voices
        for voice in user_media['voices']:
            filename = voice['metadata'].get('originalName', f"voice_{voice['id']}")
            filepath = os.path.join(user_dir, 'voices', filename)
            
            async with aiofiles.open(filepath, 'wb') as f:
                await f.write(voice['file_data'])
                
    except Exception as e:
        logger.error(f"Error saving media for user {user_email}: {str(e)}")

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)