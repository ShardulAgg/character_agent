from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import os
from typing import List, Optional
import aiofiles
from dotenv import load_dotenv
import requests
from elevenlabs.client import ElevenLabs
from elevenlabs import VoiceSettings
from PIL import Image
import io
import base64
from google import genai
from google.genai import types
from PIL import Image
from io import BytesIO
import tempfile
import logging
import ssl
from requests.adapters import HTTPAdapter
import firebase_admin
from firebase_admin import credentials, firestore, storage
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Custom SSLContext to bypass SNI issues for diagnosis
class CustomSSLContextAdapter(HTTPAdapter):
    def init_poolmanager(self, connections, maxsize, block=False):
        context = ssl.create_default_context()
        context.check_hostname = False
        context.verify_mode = ssl.CERT_NONE
        self.poolmanager = requests.packages.urllib3.poolmanager.PoolManager(
            num_pools=connections,
            maxsize=maxsize,
            block=block,
            ssl_context=context
        )

load_dotenv()

# Initialize Firebase Admin SDK
try:
    firebase_cred_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_KEY", "./serviceAccountKey.json")
    firebase_bucket = os.getenv("FIREBASE_STORAGE_BUCKET", "tiktok-genie.firebasestorage.app")
    
    if os.path.exists(firebase_cred_path):
        cred = credentials.Certificate(firebase_cred_path)
        # Explicitly set the project ID from the credentials
        project_id = cred.project_id
        firebase_admin.initialize_app(cred, {
            'storageBucket': firebase_bucket,
            'projectId': project_id,
        })
        db = firestore.client()
        # Add a check to see if we can access the database
        logger.info("Attempting to list collections to verify database access...")
        collections = [col.id for col in db.collections()]
        logger.info(f"Successfully accessed database. Found collections: {collections}")
        bucket = storage.bucket()
        logger.info(f"Firebase Admin SDK initialized successfully with bucket: {firebase_bucket}")
    else:
        logger.warning(f"Firebase service account key not found at: {firebase_cred_path}")
        db = None
        bucket = None
except Exception as e:
    logger.error(f"Failed to initialize Firebase Admin SDK: {e}")
    db = None
    bucket = None

app = FastAPI(title="Image & Voice Processing API")

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

# New models for processing with Firestore metadata
class ProcessImageWithMetadataRequest(BaseModel):
    user_email: str
    image_ids: List[str]  # Support multiple images
    num_variations: int = 5

class ProcessVoiceWithMetadataRequest(BaseModel):
    user_email: str

# Set API keys
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")
NANOBANANA_API_KEY = os.getenv("NANOBANANA_API_KEY")
NANOBANANA_API_URL = os.getenv("NANOBANANA_API_URL", "https://api.nanobanana.com/v1")

if ELEVENLABS_API_KEY:
    elevenlabs_client = ElevenLabs(api_key=ELEVENLABS_API_KEY)
    logger.info("ElevenLabs client initialized.")
else:
    logger.warning("ELEVENLABS_API_KEY not found. ElevenLabs client not initialized.")

# Create upload directories
os.makedirs("uploads/images", exist_ok=True)
os.makedirs("uploads/voices", exist_ok=True)
os.makedirs("outputs", exist_ok=True)

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
        logger.info(f"Received file content size: {len(content)} bytes for {file.filename}")
        await f.write(content)
    
    # Verify file size after writing
    saved_file_size = os.path.getsize(file_path)
    logger.info(f"Image uploaded successfully: {file_path}, Saved size: {saved_file_size} bytes")
    return {"filename": file.filename, "path": file_path}

@app.post("/upload-voice")
async def upload_voice(file: UploadFile = File(...)):
    logger.info(f"Received voice upload request. Filename: {file.filename}, Content-Type: {file.content_type}")
    if not file.content_type or not file.content_type.startswith("audio/"):
        logger.error(f"Invalid content type for voice upload: {file.content_type}")
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
        
        logger.info(f"Making request to: {NANOBANANA_API_URL}/generate-variations")
        logger.info(f"Payload keys: {payload.keys()}")
        logger.info(f"Headers: {headers}")
        
        session = requests.Session()
        session.mount("https://", CustomSSLContextAdapter())
        
        response = session.post(
            f"{NANOBANANA_API_URL}/generate-variations",
            json=payload,
            headers=headers
        )
        
        if response.status_code == 200:
            variations = response.json()
            return {"variations": variations, "status": "success"}
        else:
            raise HTTPException(status_code=500, detail="Failed to generate variations")
            
    except requests.exceptions.SSLError as e:
        logger.error(f"SSL Error during image variation generation: {e}")
        raise HTTPException(status_code=500, detail=f"SSL Error processing image: {str(e)}")
    except Exception as e:
        logger.error(f"General Error during image variation generation: {e}")
        raise HTTPException(status_code=500, detail=f"Error processing image: {str(e)}")

@app.post("/generate-image-variations-gemini")
async def generate_image_variations_gemini(filename: str, num_variations: int = 5):
    logger.info(f"Received request for generate_image_variations_gemini with filename: {filename}")
    image_path = f"uploads/images/{filename}"
    
    if not os.path.exists(image_path):
        raise HTTPException(status_code=404, detail="Image not found")
    
    try:
        client = genai.Client()

        prompt = (
            """As the Visual Persona Generator, your critical task is to produce five distinct, highly photorealistic, and naturally engaging angle shots of the person from the provided image(s), explicitly optimized for TikTok Reels. These should embody a User-Generated Content (UGC) aesthetic, prioritizing natural lighting and authentic poses. Each output must meticulously preserve the subject's likeness, facial features, hair, clothing, and overall style from the original input, ensuring seamless visual consistency across all images. Maintain vibrant, natural lighting and consistent color grading.
Please render these five distinct shots as separate image outputs.
The five TikTok-ready shots should include:
Face Close-up (Dynamic Close-up - Engaging Gaze): A head-and-shoulders shot with the subject facing slightly forward, featuring a confident, subtly smiling, and directly engaging expression towards the camera. Emphasize crisp focus on the face, illuminated by bright, soft front lighting, against a contemporary, softly blurred background.
Torso Shot (Confident Stance): A shot from the waist up, with the subject turned 3/4 to the left, actively looking off-camera (as if at something interesting), with arms casually crossed or one hand playfully on the hip. The setting should be a modern, bright, and aesthetically pleasing interior (e.g., minimalist cafe, sunlit home office).
Full-Body Shot (Urban Exploration): A full-body shot, capturing the subject in a natural, walking or slightly paused pose (e.g., hands casually in pockets, looking over shoulder), facing 3/4 to the right. The background should be a vibrant, well-lit urban street or a picturesque park path during a clear day, conveying a sense of casual exploration.
Profile Shot (Thoughtful Moment): A clear profile view of the subject looking to the left, as if pondering or observing something, against a simple, uncluttered outdoor background (e.g., sky, subtle foliage) with soft, natural light, creating a serene and reflective mood.
Over-the-Shoulder Interaction (Digital Engagement): A medium shot from slightly behind the subject's right shoulder, showing them actively and subtly interacting with a tablet or smartphone screen held at eye level. Their face should be partially visible, conveying focused digital engagement in a clean, contemporary interior space (e.g., desk, lounge area).
Ensure all poses are natural and suitable for video clips."""

        )

        logger.info(f"Checking image file: {image_path}")
        if not os.path.exists(image_path):
            logger.error(f"Image file does not exist: {image_path}")
            raise HTTPException(status_code=500, detail=f"Image file not found on server: {image_path}")
        
        file_size = os.path.getsize(image_path)
        logger.info(f"Image file exists. Path: {image_path}, Size: {file_size} bytes")

        image = Image.open(image_path)
        logger.info(f"Successfully opened image: {image_path}")

        logger.info(f"Attempting to generate content with model: gemini-2.5-flash-image")
        response = client.models.generate_content(
            model="gemini-2.5-flash-image",
            contents=[prompt, image]
        )
        logger.info(f"Received response from generate_content.")

        generated_images_info = []
        image_count = 0
        for candidate in response.candidates:
            for part in candidate.content.parts:
                if part.text:
                    logger.info(f"Generated text: {part.text}")
                if part.inline_data:
                    logger.info(f"Received inline_data. Mime type: {part.inline_data.mime_type}, Data length: {len(part.inline_data.data)}")
                    # Log first 50 bytes of base64 data for inspection
                    logger.info(f"Inline data (first 50 chars): {part.inline_data.data[:50]}...")
                    try:
                        # The inline_data.data is already raw bytes, no need to base64 decode
                        image_bytes = part.inline_data.data
                        logger.info(f"Raw image_bytes length: {len(image_bytes)}")
                        # Log first 20 bytes of raw image data for inspection
                        logger.info(f"Raw image_bytes (first 20 bytes): {image_bytes[:20]}")
                        image = Image.open(BytesIO(image_bytes))
                        
                        name, ext = os.path.splitext(filename)
                        output_filename = f"outputs/generated_image_{name}_{image_count}{ext}"
                        image.save(output_filename)
                        logger.info(f"Saved generated image to: {output_filename}")
                        generated_images_info.append({"filename": os.path.basename(output_filename), "path": output_filename})
                        image_count += 1
                    except Exception as img_e:
                        logger.error(f"Error processing generated image part: {img_e}")
        
        if not generated_images_info:
            logger.warning("No images were generated or processed from the Gemini response.")
            # Return a default or error response if no images were generated
            return JSONResponse(status_code=200, content={"variations": [], "status": "success", "message": "No image variations generated."})

        return {"variations": {"images": generated_images_info}, "status": "success"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing image: {str(e)}")
        

@app.post("/generate-voice-signature")
async def generate_voice_signature(filename: str, text: str = "Hello, this is a voice signature"):
    voice_path = f"uploads/voices/{filename}"
    
    if not os.path.exists(voice_path):
        raise HTTPException(status_code=404, detail="Voice file not found")
    
    try:
        # Read the uploaded voice file content
        with open(voice_path, "rb") as voice_file:
            voice_audio_content = voice_file.read()
        
        logger.info(f"Type of voice_audio_content: {type(voice_audio_content)}")
        logger.info(f"Length of voice_audio_content: {len(voice_audio_content)} bytes")
        logger.info(f"First 50 bytes of voice_audio_content: {voice_audio_content[:50]}")

        if not elevenlabs_client:
            logger.error("ElevenLabs client not initialized. ELEVENLABS_API_KEY might be missing.")
            raise HTTPException(status_code=500, detail="ElevenLabs client not initialized. API key missing or invalid.")

        try:
            # Create a temporary voice clone using the uploaded audio content
            cloned_voice = elevenlabs_client.voices.ivc.create(
                name=f"Temporary Voice Signature for {filename}",
                files=[BytesIO(voice_audio_content)]
            )
            logger.info(f"Created temporary voice clone with ID: {cloned_voice.voice_id}")
        except Exception as clone_e:
            logger.error(f"Error creating voice clone: {clone_e}")
            raise HTTPException(status_code=500, detail=f"Error creating voice clone: {str(clone_e)}")
        
        # Return the voice_id as requested by the user
        return {
            "voice_id": cloned_voice.voice_id,
            "original_voice": voice_path, # Re-adding original_voice as it seems the client expects it
            "text_used": text,
            "status": "success"
        }
        
    except Exception as e:
        logger.error(f"Error generating voice signature: {str(e)}")
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

@app.post("/process-image-with-metadata")
async def process_image_with_metadata(request: ProcessImageWithMetadataRequest):
    """
    Complete flow: Query Firestore → Download from Firebase → Process → Upload results → Update metadata
    """
    if not db or not bucket:
        raise HTTPException(status_code=500, detail="Firebase not initialized. Check service account configuration.")
    
    try:
        logger.info(f"Processing {len(request.image_ids)} image(s) for user: {request.user_email}")
        
        # Step 1: Query Firestore to get all image metadata
        images_data = []
        image_refs = []
        temp_files = []
        
        for image_id in request.image_ids:
            image_ref = db.collection('images').document(image_id)
            image_doc = image_ref.get()
            
            if not image_doc.exists:
                raise HTTPException(status_code=404, detail=f"Image metadata not found for ID: {image_id}")
            
            image_data = image_doc.to_dict()
            
            # Verify user owns this image
            if image_data.get('userEmail') != request.user_email:
                raise HTTPException(status_code=403, detail=f"Unauthorized: Image {image_id} does not belong to this user")
            
            images_data.append(image_data)
            image_refs.append(image_ref)
            logger.info(f"Retrieved image metadata: {image_data.get('fileName')}")
        
        # Step 2: Update all images status to processing
        for image_ref in image_refs:
            image_ref.update({
                'processingStatus': 'processing',
                'updatedAt': firestore.SERVER_TIMESTAMP
            })
        
        # Step 3: Download all images from Firebase Storage
        pil_images = []
        for image_data in images_data:
            download_url = image_data.get('downloadUrl')
            if not download_url:
                raise HTTPException(status_code=400, detail=f"No download URL found for {image_data.get('fileName')}")
            
            logger.info(f"Downloading image from: {download_url}")
            image_bytes = await download_file_from_url(download_url)
            
            # Save to temporary file
            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.jpg')
            temp_file.write(image_bytes)
            temp_file.close()
            temp_files.append(temp_file.name)
            
            # Open as PIL Image
            pil_images.append(Image.open(temp_file.name))
        
        try:
            # Step 4: Process with Gemini API
            client = genai.Client()
            
            prompt = (
                """As the Visual Persona Generator, your critical task is to produce five distinct, highly photorealistic, and naturally engaging angle shots of the person from the provided image, explicitly optimized for TikTok Reels. These should embody a User-Generated Content (UGC) aesthetic, prioritizing natural lighting and authentic poses. Each output must meticulously preserve the subject's likeness, facial features, hair, clothing, and overall style from the original input, ensuring seamless visual consistency across all images. Maintain vibrant, natural lighting and consistent color grading.
Please render these five distinct shots as separate image outputs, each with a vertical aspect ratio of 9:16.
The five TikTok-ready shots should include:
Face Close-up (Dynamic Close-up - Engaging Gaze): A head-and-shoulders shot with the subject facing slightly forward, featuring a confident, subtly smiling, and directly engaging expression towards the camera. Emphasize crisp focus on the face, illuminated by bright, soft front lighting, against a contemporary, softly blurred background.
Torso Shot (Confident Stance): A shot from the waist up, with the subject turned 3/4 to the left, actively looking off-camera (as if at something interesting), with arms casually crossed or one hand playfully on the hip. The setting should be a modern, bright, and aesthetically pleasing interior (e.g., minimalist cafe, sunlit home office).
Full-Body Shot (Urban Exploration): A full-body shot, capturing the subject in a natural, walking or slightly paused pose (e.g., hands casually in pockets, looking over shoulder), facing 3/4 to the right. The background should be a vibrant, well-lit urban street or a picturesque park path during a clear day, conveying a sense of casual exploration.
Profile Shot (Thoughtful Moment): A clear profile view of the subject looking to the left, as if pondering or observing something, against a simple, uncluttered outdoor background (e.g., sky, subtle foliage) with soft, natural light, creating a serene and reflective mood.
Over-the-Shoulder Interaction (Digital Engagement): A medium shot from slightly behind the subject's right shoulder, showing them actively and subtly interacting with a tablet or smartphone screen held at eye level. Their face should be partially visible, conveying focused digital engagement in a clean, contemporary interior space (e.g., desk, lounge area).
Ensure all poses are natural and suitable for video clips."""
            )
            
            logger.info("Generating image variations with Gemini...")
            response = client.models.generate_content(
                model="gemini-2.5-flash-image",
                contents=[prompt] + pil_images
            )
            
            # Step 6: Upload generated images to Firebase Storage and collect metadata
            variations_metadata = []
            image_count = 0
            angles = ["face_closeup", "torso_shot", "fullbody_shot", "profile_shot", "shoulder_interaction"]
            
            for candidate in response.candidates:
                for part in candidate.content.parts:
                    if part.inline_data:
                        try:
                            # Get image bytes
                            generated_image_bytes = part.inline_data.data
                            generated_image = Image.open(BytesIO(generated_image_bytes))
                            
                            # Create combined ID from all image IDs
                            combined_id = "_".join(request.image_ids)
                            
                            # Create filename for Firebase Storage
                            angle_name = angles[image_count] if image_count < len(angles) else f"variation_{image_count}"
                            firebase_filename = f"outputs/{request.user_email.replace('@', '_').replace('.', '_')}/{combined_id}_{angle_name}_{image_count}.jpg"
                            
                            # Upload to Firebase Storage
                            blob = bucket.blob(firebase_filename)
                            
                            # Convert PIL Image to bytes
                            img_byte_arr = BytesIO()
                            generated_image.save(img_byte_arr, format='JPEG')
                            img_byte_arr.seek(0)
                            
                            blob.upload_from_file(img_byte_arr, content_type='image/jpeg')
                            blob.make_public()
                            
                            firebase_url = blob.public_url
                            logger.info(f"Uploaded variation {image_count} to Firebase: {firebase_url}")
                            
                            # Add to variations metadata
                            variations_metadata.append({
                                'id': f"{combined_id}_{image_count}",
                                'angle': angle_name,
                                'storagePath': firebase_filename,
                                'downloadUrl': firebase_url,
                                'status': 'completed',
                                'createdAt': datetime.utcnow()
                            })
                            
                            image_count += 1
                            
                            if image_count >= request.num_variations:
                                break
                                
                        except Exception as img_e:
                            logger.error(f"Error processing generated image: {img_e}")
                    
                    if image_count >= request.num_variations:
                        break
                
                if image_count >= request.num_variations:
                    break
            
            # Step 7: Update Firestore metadata with results for all images
            for image_ref in image_refs:
                image_ref.update({
                    'processingStatus': 'completed',
                    'variations': variations_metadata,
                    'updatedAt': firestore.SERVER_TIMESTAMP
                })
            
            logger.info(f"Successfully processed {image_count} variations")
            
            return {
                "status": "success",
                "image_ids": request.image_ids,
                "user_email": request.user_email,
                "variations_count": image_count,
                "variations": variations_metadata
            }
            
        finally:
            # Clean up all temporary files
            for temp_file_path in temp_files:
                try:
                    os.unlink(temp_file_path)
                except Exception as cleanup_error:
                    logger.warning(f"Failed to cleanup temp file {temp_file_path}: {cleanup_error}")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in process_image_with_metadata: {str(e)}")
        
        # Update Firestore with error status for all images
        if db:
            try:
                for image_id in request.image_ids:
                    image_ref = db.collection('images').document(image_id)
                    image_ref.update({
                        'processingStatus': 'failed',
                        'processingError': str(e),
                        'updatedAt': firestore.SERVER_TIMESTAMP
                    })
            except Exception as update_error:
                logger.error(f"Failed to update error status in Firestore: {update_error}")
        
        raise HTTPException(status_code=500, detail=f"Error processing image: {str(e)}")

@app.post("/process-voice-with-metadata")
async def process_voice_with_metadata(request: ProcessVoiceWithMetadataRequest):
    """
    Finds a user's voice file, clones it, and saves the clone ID to Firestore.
    """
    if not db:
        raise HTTPException(status_code=500, detail="Firebase not initialized.")
    if not elevenlabs_client:
        raise HTTPException(status_code=500, detail="ElevenLabs client not initialized.")

    voice_ref = None
    try:
        logger.info(f"Processing voice for user: {request.user_email}")

        # Step 1: Find the user's voice document in Firestore
        voices_query = db.collection('voices').where('userEmail', '==', request.user_email).limit(1).stream()
        
        voice_doc = next(voices_query, None)
        if not voice_doc:
            raise HTTPException(status_code=404, detail=f"No voice file found for user: {request.user_email}")

        voice_ref = voice_doc.reference
        voice_data = voice_doc.to_dict()
        voice_id = voice_doc.id
        
        logger.info(f"Found voice document: {voice_id}")

        # Step 2: Update status to 'processing'
        voice_ref.update({'processingStatus': 'processing', 'updatedAt': firestore.SERVER_TIMESTAMP})

        # Step 3: Download voice file from Firebase Storage
        download_url = voice_data.get('downloadUrl')
        if not download_url:
            raise HTTPException(status_code=400, detail="No download URL found in metadata.")
        
        voice_bytes = await download_file_from_url(download_url)

        # Step 4: Create voice clone with ElevenLabs
        cloned_voice = elevenlabs_client.voices.ivc.create(
            name=f"Voice for {voice_id}",
            files=[BytesIO(voice_bytes)]
        )
        logger.info(f"Created voice clone with ID: {cloned_voice.voice_id}")

        # Step 5: Save the clone ID to Firestore
        voice_ref.update({
            'processingStatus': 'completed',
            'voiceSignature': {
                'cloneId': cloned_voice.voice_id,
                'status': 'completed',
                'createdAt': datetime.utcnow()
            },
            'updatedAt': firestore.SERVER_TIMESTAMP
        })

        return {
            "status": "success",
            "voice_id": voice_id,
            "clone_id": cloned_voice.voice_id
        }

    except Exception as e:
        logger.error(f"Error in process_voice_with_metadata: {str(e)}")
        if voice_ref:
            try:
                voice_ref.update({
                    'processingStatus': 'failed',
                    'processingError': str(e),
                    'updatedAt': firestore.SERVER_TIMESTAMP
                })
            except Exception as update_error:
                logger.error(f"Failed to update error status in Firestore: {update_error}")
        raise HTTPException(status_code=500, detail=f"Error processing voice: {str(e)}")


@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
