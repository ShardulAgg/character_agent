import React, { useState } from 'react';
import { FileUpload } from './FileUpload';
import { Button } from './Button';
import { apiService } from '../services/api';
import { FirebaseStorageService, UploadProgress } from '../services/firebase-storage';
import { ImageVariation, FirebaseUploadResponse } from '../types/api';
import { Image as ImageIcon, Loader2, Cloud } from 'lucide-react';

export const ImageProcessor: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [generating, setGenerating] = useState(false);
  const [firebaseResult, setFirebaseResult] = useState<FirebaseUploadResponse | null>(null);
  const [variations, setVariations] = useState<ImageVariation[]>([]);
  const [numVariations, setNumVariations] = useState(5);
  const [error, setError] = useState<string>('');

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setError('');
    setVariations([]);
    setFirebaseResult(null);
    setUploadProgress(null);
  };

  const handleFirebaseUpload = async () => {
    if (!selectedFile) return;

    // Validate file
    const validation = FirebaseStorageService.validateFile(selectedFile, 'image');
    if (!validation.valid) {
      setError(validation.error || 'Invalid file');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const result = await FirebaseStorageService.uploadFile(
        selectedFile,
        'images',
        (progress) => setUploadProgress(progress)
      );
      
      setFirebaseResult(result);
      setUploadProgress(null);
    } catch (err) {
      setError('Failed to upload image to Firebase. Please try again.');
      console.error('Firebase upload error:', err);
      setUploadProgress(null);
    } finally {
      setUploading(false);
    }
  };

  const handleGenerateVariations = async () => {
    if (!firebaseResult) return;

    setGenerating(true);
    setError('');

    try {
      const response = await apiService.processImageFromFirebase({
        firebase_url: firebaseResult.url,
        filename: firebaseResult.name,
        num_variations: numVariations,
      });
      
      setVariations(response.variations.images || []);
    } catch (err) {
      setError('Failed to generate variations. Please try again.');
      console.error('Generation error:', err);
    } finally {
      setGenerating(false);
    }
  };

  const imageAccept = {
    'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp']
  };

  const [imageType, setImageType] = useState<'face' | 'torso' | null>(null);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <ImageIcon className="h-5 w-5 text-gray-900" />
          <h2 className="text-lg font-bold text-gray-900">Photos</h2>
        </div>
        <p className="text-sm text-gray-600">Upload photos for your AI character</p>
      </div>

      <div className="space-y-6">
        {/* Image Type Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-3">
            Select photo type
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setImageType('face')}
              className={`p-4 rounded-lg border-2 transition-all ${
                imageType === 'face'
                  ? 'border-gray-900 bg-gray-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="text-center">
                <div className="text-lg font-semibold text-gray-900 mb-1">Face</div>
                <div className="text-xs text-gray-600">Close-up headshot</div>
              </div>
            </button>
            <button
              onClick={() => setImageType('torso')}
              className={`p-4 rounded-lg border-2 transition-all ${
                imageType === 'torso'
                  ? 'border-gray-900 bg-gray-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="text-center">
                <div className="text-lg font-semibold text-gray-900 mb-1">Torso</div>
                <div className="text-xs text-gray-600">Upper body shot</div>
              </div>
            </button>
          </div>
        </div>

        {/* File Upload */}
        {imageType && (
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Upload {imageType === 'face' ? 'face' : 'torso'} photo
            </label>
            <FileUpload
              accept={imageAccept}
              onFileSelect={handleFileSelect}
              selectedFile={selectedFile}
              type="image"
              maxSize={10 * 1024 * 1024}
            />
          </div>
        )}

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
            <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
              <div className="flex items-center mb-2">
                <Cloud className="h-4 w-4 text-green-600 mr-2" />
                <span className="font-medium text-green-800">Uploaded to Firebase</span>
              </div>
              <div className="text-sm space-y-1 text-gray-600">
                <div>
                  <span className="font-medium">File:</span> {firebaseResult.name}
                </div>
                <div>
                  <span className="font-medium">Path:</span> <span className="font-mono text-xs">{firebaseResult.path}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label htmlFor="numVariations" className="block text-sm font-medium text-gray-700 mb-1">
                  Number of Variations
                </label>
                <input
                  type="number"
                  id="numVariations"
                  min="1"
                  max="10"
                  value={numVariations}
                  onChange={(e) => setNumVariations(parseInt(e.target.value) || 5)}
                  className="block w-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                />
              </div>
              
              <Button
                onClick={handleGenerateVariations}
                loading={generating}
                disabled={generating}
              >
                {generating ? (
                  <>
                    <Loader2 className="animate-spin h-4 w-4 mr-2" />
                    Generating...
                  </>
                ) : (
                  'Generate Variations'
                )}
              </Button>
            </div>
          </div>
        )}

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 p-3 rounded-md">
            {error}
          </div>
        )}

        {variations.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-gray-900">Generated Variations</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {variations.map((variation, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 bg-white">
                  <div className="text-center">
                    <div className="w-full h-32 bg-gray-100 rounded-md flex items-center justify-center mb-3">
                      <ImageIcon className="h-8 w-8 text-gray-400" />
                    </div>
                    <p className="text-sm font-medium text-gray-900">
                      Variation {index + 1}
                    </p>
                    <p className="text-xs text-gray-500">
                      Angle: {variation.angle || 'Unknown'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};