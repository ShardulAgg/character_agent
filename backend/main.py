from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import os
from typing import List
import aiofiles
from dotenv import load_dotenv
import requests
from elevenlabs import generate, set_api_key
from PIL import Image
import io
import base64
from google import genai
from google.genai import types
from PIL import Image
from io import BytesIO
import tempfile

load_dotenv()

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

@app.post("/generate-image-variations-gemini")
async def generate_image_variations(filename: str, num_variations: int = 5):
    image_path = f"uploads/images/{filename}"
    
    if not os.path.exists(image_path):
        raise HTTPException(status_code=404, detail="Image not found")
    
    try:
        # Read and encode image
        with open(image_path, "rb") as img_file:
            img_data = base64.b64encode(img_file.read()).decode()
        
        client = genai.Client()

        prompt = (
            "Create a picture of my cat eating a nano-banana in a "
            "fancy restaurant under the Gemini constellation"
        )

        image = Image.open("/path/to/cat_image.png")

        response = client.models.generate_content(
            model="gemini-2.5-flash-image",
            contents=[prompt, image]
        )

        for part in response.candidates[0].content.parts:
            if part.text is not None:
                print(part.text)
            elif part.inline_data is not None:
                image = Image.open(BytesIO(part.inline_data.data))
                image.save(f"outputs/generated_image_{filename}.png")
        
        return {"response": response.to_dict(), "status": "success"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing image: {str(e)}")
        

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

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)