import React, { useState } from 'react';
import { FileUpload } from './FileUpload';
import { Button } from './Button';
import { apiService } from '../services/api';
import { FirebaseStorageService, UploadProgress } from '../services/firebase-storage';
import { FirebaseUploadResponse } from '../types/api';
import { Music, Loader2, Cloud } from 'lucide-react';

export const VoiceProcessor: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [generating, setGenerating] = useState(false);
  const [firebaseResult, setFirebaseResult] = useState<FirebaseUploadResponse | null>(null);
  const [signatureResult, setSignatureResult] = useState<any>(null);
  const [voiceText, setVoiceText] = useState('Hello, this is a voice signature');
  const [error, setError] = useState<string>('');

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setError('');
    setSignatureResult(null);
    setFirebaseResult(null);
    setUploadProgress(null);
  };

  const handleFirebaseUpload = async () => {
    if (!selectedFile) return;

    // Validate file
    const validation = FirebaseStorageService.validateFile(selectedFile, 'voice');
    if (!validation.valid) {
      setError(validation.error || 'Invalid file');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const result = await FirebaseStorageService.uploadFile(
        selectedFile,
        'voices',
        (progress) => setUploadProgress(progress)
      );
      
      setFirebaseResult(result);
      setUploadProgress(null);
    } catch (err) {
      setError('Failed to upload voice file to Firebase. Please try again.');
      console.error('Firebase upload error:', err);
      setUploadProgress(null);
    } finally {
      setUploading(false);
    }
  };

  const handleGenerateSignature = async () => {
    if (!firebaseResult) return;

    setGenerating(true);
    setError('');

    try {
      const response = await apiService.processVoiceFromFirebase({
        firebase_url: firebaseResult.url,
        filename: firebaseResult.name,
        text: voiceText,
      });
      
      setSignatureResult(response);
    } catch (err) {
      setError('Failed to generate voice signature. Please try again.');
      console.error('Generation error:', err);
    } finally {
      setGenerating(false);
    }
  };

  const audioAccept = {
    'audio/*': ['.mp3', '.wav', '.ogg', '.m4a', '.aac']
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center mb-6">
        <Music className="h-6 w-6 text-primary-600 mr-3" />
        <h2 className="text-xl font-semibold text-gray-900">Voice Processing</h2>
        <Cloud className="h-5 w-5 text-blue-500 ml-2" />
      </div>

      <div className="space-y-6">
        <FileUpload
          accept={audioAccept}
          onFileSelect={handleFileSelect}
          selectedFile={selectedFile}
          type="audio"
          maxSize={50 * 1024 * 1024} // 50MB for audio files
        />

        {selectedFile && !firebaseResult && (
          <div className="space-y-4">
            <Button
              onClick={handleFirebaseUpload}
              loading={uploading}
              className="w-full"
            >
              {uploading ? 'Uploading to Firebase...' : 'Upload to Firebase Storage'}
            </Button>

            {uploadProgress && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Upload Progress</span>
                  <span>{Math.round(uploadProgress.progress)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      uploadProgress.state === 'error' 
                        ? 'bg-red-500' 
                        : uploadProgress.state === 'success'
                        ? 'bg-green-500'
                        : 'bg-blue-500'
                    }`}
                    style={{ width: `${uploadProgress.progress}%` }}
                  />
                </div>
                {uploadProgress.error && (
                  <p className="text-sm text-red-600">{uploadProgress.error}</p>
                )}
              </div>
            )}
          </div>
        )}

        {firebaseResult && (
          <div className="space-y-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center mb-2">
                <Cloud className="h-5 w-5 text-green-600 mr-2" />
                <span className="font-medium text-green-800">Uploaded to Firebase</span>
              </div>
              <div className="text-sm space-y-1">
                <div>
                  <span className="font-medium text-gray-700">File:</span>
                  <span className="text-gray-600 ml-2">{firebaseResult.name}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Storage Path:</span>
                  <span className="text-gray-600 ml-2 font-mono text-xs">{firebaseResult.path}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">URL:</span>
                  <a 
                    href={firebaseResult.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 ml-2 text-xs break-all"
                  >
                    {firebaseResult.url.length > 50 
                      ? `${firebaseResult.url.substring(0, 50)}...` 
                      : firebaseResult.url
                    }
                  </a>
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="voiceText" className="block text-sm font-medium text-gray-700 mb-2">
                Text for Voice Signature
              </label>
              <textarea
                id="voiceText"
                rows={3}
                value={voiceText}
                onChange={(e) => setVoiceText(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                placeholder="Enter the text to generate voice signature..."
              />
            </div>
            
            <Button
              onClick={handleGenerateSignature}
              loading={generating}
              disabled={generating}
              className="w-full"
            >
              {generating ? (
                <>
                  <Loader2 className="animate-spin h-4 w-4 mr-2" />
                  Generating Signature...
                </>
              ) : (
                'Generate Voice Signature'
              )}
            </Button>
          </div>
        )}

        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
            ❌ {error}
          </div>
        )}

        {signatureResult && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Voice Signature Generated</h3>
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Original Firebase URL:</span>
                  <p className="text-gray-600 break-all font-mono text-xs">{firebaseResult?.url}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Signature Path:</span>
                  <p className="text-gray-600">{signatureResult.signature_path}</p>
                </div>
              </div>
              <div>
                <span className="font-medium text-gray-700">Text Used:</span>
                <p className="text-gray-600 italic">"{signatureResult.text_used}"</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};