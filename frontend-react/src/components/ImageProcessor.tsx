import React, { useState } from 'react';
import { FileUpload } from './FileUpload';
import { Button } from './Button';
import { EmailDialog } from './EmailDialog';
import { apiService } from '../services/api';
import { FirebaseStorageService, UploadProgress } from '../services/firebase-storage';
import { FirestoreService } from '../services/firestore';
import { ImageVariation, FirebaseUploadResponse } from '../types/api';
import { ImageMetadata } from '../types/firestore';
import { Image as ImageIcon, Loader2, Cloud, Database } from 'lucide-react';

interface ImageProcessorProps {
  onEmailUpdate?: (email: string) => void;
}

export const ImageProcessor: React.FC<ImageProcessorProps> = ({ onEmailUpdate }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [generating, setGenerating] = useState(false);
  const [firebaseResult, setFirebaseResult] = useState<FirebaseUploadResponse | null>(null);
  const [imageMetadata, setImageMetadata] = useState<ImageMetadata | null>(null);
  const [variations, setVariations] = useState<ImageVariation[]>([]);
  const [numVariations, setNumVariations] = useState(5);
  const [error, setError] = useState<string>('');
  const [imageType, setImageType] = useState<'face' | 'torso' | null>(null);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setError('');
    setVariations([]);
    setFirebaseResult(null);
    setImageMetadata(null);
    setUploadProgress(null);
  };

  const handleUploadClick = () => {
    if (!selectedFile) return;

    if (!userEmail) {
      setShowEmailDialog(true);
      return;
    }

    handleFirebaseUpload();
  };

  const handleEmailSubmit = (email: string) => {
    setUserEmail(email);
    onEmailUpdate?.(email); // Notify parent component
    // Auto-start upload after email is provided
    setTimeout(() => {
      handleFirebaseUpload();
    }, 100);
  };

  const handleFirebaseUpload = async () => {
    if (!selectedFile || !userEmail || !imageType) return;

    // Validate file
    const validation = FirebaseStorageService.validateFile(selectedFile, 'image');
    if (!validation.valid) {
      setError(validation.error || 'Invalid file');
      return;
    }

    setUploading(true);
    setError('');

    try {
      // Upload to Firebase Storage
      const storageResult = await FirebaseStorageService.uploadFile(
        selectedFile,
        'images',
        (progress) => setUploadProgress(progress)
      );

      setFirebaseResult(storageResult);
      setUploadProgress(null);

      // Save metadata to Firestore (using email as userId for simplicity)
      const userId = userEmail.replace(/[@.]/g, '_'); // Convert email to safe ID
      const imageData: Omit<ImageMetadata, 'id' | 'createdAt' | 'updatedAt'> = {
        type: 'image',
        userId: userId,
        userEmail: userEmail,
        fileName: storageResult.name,
        originalName: selectedFile.name,
        storagePath: storageResult.path,
        downloadUrl: storageResult.url,
        fileSize: selectedFile.size,
        mimeType: selectedFile.type,
        processingStatus: 'pending',
        variations: [],
        imageType: imageType, // Add image type to metadata
      };

      const metadataId = await FirestoreService.createImageMetadata(imageData);
      const savedMetadata = await FirestoreService.getImageMetadata(metadataId);
      setImageMetadata(savedMetadata);

      // Create/update email user and add image reference
      await FirestoreService.createOrUpdateEmailUser(userEmail);
      await FirestoreService.addImageToUser(userEmail, metadataId);

    } catch (err) {
      setError('Failed to upload image. Please try again.');
      console.error('Upload error:', err);
      setUploadProgress(null);
    } finally {
      setUploading(false);
    }
  };

  const handleGenerateVariations = async () => {
    if (!firebaseResult || !imageMetadata) return;

    setGenerating(true);
    setError('');

    try {
      // Update processing status
      await FirestoreService.updateImageMetadata(imageMetadata.id, {
        processingStatus: 'processing',
      });

      const response = await apiService.processImageFromFirebase({
        firebase_url: firebaseResult.url,
        filename: firebaseResult.name,
        num_variations: numVariations,
      });

      setVariations(response.variations.images || []);

      // Update metadata with results
      await FirestoreService.updateImageMetadata(imageMetadata.id, {
        processingStatus: 'completed',
        variations: response.variations.images?.map((variation, index) => ({
          id: `${imageMetadata.id}_${index}`,
          angle: variation.angle || 'unknown',
          status: 'completed' as const,
          createdAt: new Date(),
        })) || [],
      });

    } catch (err) {
      setError('Failed to generate variations. Please try again.');
      console.error('Generation error:', err);

      // Update error status in Firestore
      if (imageMetadata) {
        await FirestoreService.updateImageMetadata(imageMetadata.id, {
          processingStatus: 'failed',
          processingError: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    } finally {
      setGenerating(false);
    }
  };

  const imageAccept = {
    'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp']
  };

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <ImageIcon className="h-5 w-5 text-gray-900" />
            <h2 className="text-lg font-bold text-gray-900">Photos</h2>
            <Cloud className="h-4 w-4 text-blue-500 ml-auto" />
            <Database className="h-4 w-4 text-green-500" />
          </div>
          <p className="text-sm text-gray-600">Upload photos for your AI character</p>
        </div>

        {userEmail && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="text-sm text-blue-800">
              <span className="font-medium">Email:</span> {userEmail}
              <button
                onClick={() => setUserEmail('')}
                className="ml-2 text-blue-600 hover:text-blue-800 underline text-xs"
              >
                Change
              </button>
            </div>
          </div>
        )}

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
                onClick={handleUploadClick}
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

          {firebaseResult && imageMetadata && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                <div className="flex items-center mb-2">
                  <Cloud className="h-4 w-4 text-green-600 mr-2" />
                  <Database className="h-4 w-4 text-green-600 mr-2" />
                  <span className="font-medium text-green-800">Uploaded & Saved</span>
                </div>
                <div className="text-sm space-y-1 text-gray-600">
                  <div>
                    <span className="font-medium">Type:</span> {imageType}
                  </div>
                  <div>
                    <span className="font-medium">File:</span> {firebaseResult.name}
                  </div>
                  <div>
                    <span className="font-medium">Email:</span> {userEmail}
                  </div>
                  <div>
                    <span className="font-medium">Metadata ID:</span> <span className="font-mono text-xs">{imageMetadata.id}</span>
                  </div>
                  <div>
                    <span className="font-medium">Status:</span>
                    <span className={`ml-2 px-2 py-1 rounded text-xs ${
                      imageMetadata.processingStatus === 'completed' ? 'bg-green-100 text-green-800' :
                      imageMetadata.processingStatus === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                      imageMetadata.processingStatus === 'failed' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {imageMetadata.processingStatus}
                    </span>
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

      <EmailDialog
        isOpen={showEmailDialog}
        onClose={() => setShowEmailDialog(false)}
        onSubmit={handleEmailSubmit}
        title="Enter Your Email"
        description="Please provide your email address to upload and process images."
      />
    </>
  );
};
