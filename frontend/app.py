import streamlit as st
import requests
import os
from PIL import Image
import io
import base64
from dotenv import load_dotenv

load_dotenv()

# Configuration
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")

st.set_page_config(
    page_title="Image & Voice Processing",
    page_icon="🎥",
    layout="wide"
)

st.title("🎥 Image & Voice Processing WebApp")
st.markdown("Generate image variations and voice signatures using AI")

# Sidebar for configuration
st.sidebar.header("Configuration")
num_variations = st.sidebar.slider("Number of Image Variations", 1, 10, 5)
voice_text = st.sidebar.text_area("Text for Voice Signature", "Hello, this is a voice signature")

# Main content
col1, col2 = st.columns(2)

with col1:
    st.header("📸 Image Processing")
    
    uploaded_image = st.file_uploader(
        "Upload an image", 
        type=['png', 'jpg', 'jpeg'],
        key="image_uploader"
    )
    
    if uploaded_image:
        # Display uploaded image
        image = Image.open(uploaded_image)
        st.image(image, caption="Uploaded Image", use_column_width=True)
        
        # Upload to backend
        if st.button("Generate Image Variations", key="generate_variations"):
            with st.spinner("Uploading and processing image..."):
                try:
                    # Upload image
                    files = {"file": uploaded_image}
                    upload_response = requests.post(f"{BACKEND_URL}/upload-image", files=files)
                    
                    if upload_response.status_code == 200:
                        filename = upload_response.json()["filename"]
                        st.success(f"Image uploaded: {filename}")
                        
                        # Generate variations
                        variation_response = requests.post(
                            f"{BACKEND_URL}/generate-image-variations",
                            params={"filename": filename, "num_variations": num_variations}
                        )
                        
                        if variation_response.status_code == 200:
                            variations = variation_response.json()["variations"]
                            st.success("Image variations generated successfully!")
                            
                            # Display variations (mock display since actual API response format may vary)
                            st.subheader("Generated Variations")
                            for i, variation in enumerate(variations.get("images", [])):
                                st.write(f"Variation {i+1}: {variation.get('angle', 'Unknown angle')}")
                                
                        else:
                            st.error(f"Failed to generate variations: {variation_response.text}")
                    else:
                        st.error(f"Failed to upload image: {upload_response.text}")
                        
                except Exception as e:
                    st.error(f"Error: {str(e)}")

with col2:
    st.header("🎤 Voice Processing")
    
    uploaded_voice = st.file_uploader(
        "Upload a voice file", 
        type=['mp3', 'wav', 'ogg', 'm4a'],
        key="voice_uploader"
    )
    
    if uploaded_voice:
        # Display audio player
        st.audio(uploaded_voice, format=uploaded_voice.type)
        
        # Upload to backend
        if st.button("Generate Voice Signature", key="generate_signature"):
            with st.spinner("Uploading and processing voice..."):
                try:
                    # Upload voice file
                    files = {"file": uploaded_voice}
                    upload_response = requests.post(f"{BACKEND_URL}/upload-voice", files=files)
                    
                    if upload_response.status_code == 200:
                        filename = upload_response.json()["filename"]
                        st.success(f"Voice file uploaded: {filename}")
                        
                        # Generate voice signature
                        signature_response = requests.post(
                            f"{BACKEND_URL}/generate-voice-signature",
                            params={"filename": filename, "text": voice_text}
                        )
                        
                        if signature_response.status_code == 200:
                            result = signature_response.json()
                            st.success("Voice signature generated successfully!")
                            
                            st.subheader("Voice Signature Details")
                            st.write(f"Original file: {result['original_voice']}")
                            st.write(f"Text used: {result['text_used']}")
                            st.write(f"Signature saved to: {result['signature_path']}")
                            
                        else:
                            st.error(f"Failed to generate voice signature: {signature_response.text}")
                    else:
                        st.error(f"Failed to upload voice file: {upload_response.text}")
                        
                except Exception as e:
                    st.error(f"Error: {str(e)}")

# Status section
st.header("🔧 System Status")

col1, col2, col3 = st.columns(3)

with col1:
    if st.button("Check Backend Health"):
        try:
            response = requests.get(f"{BACKEND_URL}/health")
            if response.status_code == 200:
                st.success("✅ Backend is healthy")
            else:
                st.error("❌ Backend is not responding")
        except Exception as e:
            st.error(f"❌ Cannot connect to backend: {str(e)}")

with col2:
    st.metric("Backend URL", BACKEND_URL)

with col3:
    st.metric("Max Variations", num_variations)

# Footer
st.markdown("---")
st.markdown("Built with FastAPI + Streamlit • Deployed on Google Cloud Platform")