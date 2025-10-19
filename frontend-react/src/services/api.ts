import axios from 'axios';
import {
  UploadResponse,
  ImageVariationsResponse,
  VoiceSignatureResponse,
  HealthResponse,
} from '../types/api';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

export const apiService = {
  // Health check
  async checkHealth(): Promise<HealthResponse> {
    const response = await api.get<HealthResponse>('/health');
    return response.data;
  },

  // Upload image
  async uploadImage(file: File): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post<UploadResponse>('/upload-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Upload voice
  async uploadVoice(file: File): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post<UploadResponse>('/upload-voice', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Generate image variations
  async generateImageVariations(
    filename: string,
    numVariations: number = 5
  ): Promise<ImageVariationsResponse> {
    console.log(`Calling /generate-image-variations with filename: ${filename}`);
    const response = await api.post<ImageVariationsResponse>(
      '/generate-image-variations',
      null,
      {
        params: {
          filename,
          num_variations: numVariations,
        },
      }
    );
    return response.data;
  },

  async generateImageVariationsGemini(
    filename: string,
    numVariations: number = 5
  ): Promise<ImageVariationsResponse> {
    console.log(`Calling /generate-image-variations-gemini with filename: ${filename}`);
    const response = await api.post<ImageVariationsResponse>(
      '/generate-image-variations-gemini',
      null,
      {
        params: {
          filename,
          num_variations: numVariations,
        },
      }
    );
    return response.data;
  },

  // Generate voice signature
  async generateVoiceSignature(
    filename: string,
    text: string = 'Hello, this is a voice signature'
  ): Promise<VoiceSignatureResponse> {
    const response = await api.post<VoiceSignatureResponse>(
      '/generate-voice-signature',
      null,
      {
        params: {
          filename,
          text,
        },
      }
    );
    return response.data;
  },
};