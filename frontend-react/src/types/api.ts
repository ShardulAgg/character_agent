export interface UploadResponse {
  filename: string;
  path: string;
}

export interface FirebaseUploadResponse {
  url: string;
  path: string;
  name: string;
}

export interface ImageVariation {
  angle: string;
  url?: string;
  data?: string;
}

export interface ImageVariationsResponse {
  variations: {
    images: ImageVariation[];
  };
  status: string;
}

export interface VoiceSignatureResponse {
  signature_path: string;
  original_voice: string;
  text_used: string;
  status: string;
}

export interface HealthResponse {
  status: string;
}

export interface ProcessImageRequest {
  firebase_url: string;
  filename: string;
  num_variations?: number;
}

export interface ProcessVoiceRequest {
  firebase_url: string;
  filename: string;
  text: string;
}