import React, { useState } from 'react';
import { FileUpload } from './FileUpload';
import { Button } from './Button';
import { EmailDialog } from './EmailDialog';
import { apiService } from '../services/api';
import { FirebaseStorageService, UploadProgress } from '../services/firebase-storage';
import { FirestoreService } from '../services/firestore';
import { FirebaseUploadResponse } from '../types/api';
import { VoiceMetadata } from '../types/firestore';
import { Music, Loader2, Cloud, Database } from 'lucide-react';

interface VoiceProcessorProps {
  onEmailUpdate?: (email: string) => void;
}

export const VoiceProcessor: React.FC<VoiceProcessorProps> = ({ onEmailUpdate }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [generating, setGenerating] = useState(false);
  const [firebaseResult, setFirebaseResult] = useState<FirebaseUploadResponse | null>(null);
  const [voiceMetadata, setVoiceMetadata] = useState<VoiceMetadata | null>(null);
  const [signatureResult, setSignatureResult] = useState<any>(null);
  const [voiceText, setVoiceText] = useState('Hello, this is a voice signature');
  const [error, setError] = useState<string>('');

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setError('');
    setSignatureResult(null);
    setFirebaseResult(null);
    setVoiceMetadata(null);
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
    if (!selectedFile || !userEmail) return;

    // Validate file
    const validation = FirebaseStorageService.validateFile(selectedFile, 'voice');
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
        'voices',
        (progress) => setUploadProgress(progress)
      );
      
      setFirebaseResult(storageResult);
      setUploadProgress(null);

      // Save metadata to Firestore (using email as userId for simplicity)
      const userId = userEmail.replace(/[@.]/g, '_'); // Convert email to safe ID
      const voiceData: Omit<VoiceMetadata, 'id' | 'createdAt' | 'updatedAt'> = {
        type: 'voice',
        userId: userId,
        userEmail: userEmail,
        fileName: storageResult.name,
        originalName: selectedFile.name,
        storagePath: storageResult.path,
        downloadUrl: storageResult.url,
        fileSize: selectedFile.size,
        mimeType: selectedFile.type,
        processingStatus: 'pending',
      };

      const metadataId = await FirestoreService.createVoiceMetadata(voiceData);
      const savedMetadata = await FirestoreService.getVoiceMetadata(metadataId);
      setVoiceMetadata(savedMetadata);

      // Create/update email user and add voice reference
      await FirestoreService.createOrUpdateEmailUser(userEmail);
      await FirestoreService.addVoiceToUser(userEmail, metadataId);

    } catch (err) {
      setError('Failed to upload voice file. Please try again.');
      console.error('Upload error:', err);
      setUploadProgress(null);
    } finally {
      setUploading(false);
    }
  };

  const handleGenerateSignature = async () => {
    if (!firebaseResult || !voiceMetadata) return;

    setGenerating(true);
    setError('');

    try {
      // Update processing status
      await FirestoreService.updateVoiceMetadata(voiceMetadata.id, {
        processingStatus: 'processing',
      });

      const response = await apiService.processVoiceFromFirebase({
        firebase_url: firebaseResult.url,
        filename: firebaseResult.name,
        text: voiceText,
      });
      
      setSignatureResult(response);

      // Update metadata with results
      await FirestoreService.updateVoiceMetadata(voiceMetadata.id, {
        processingStatus: 'completed',
        voiceSignature: {
          id: `${voiceMetadata.id}_signature`,
          text: voiceText,
          storagePath: response.signature_path,
          status: 'completed' as const,
          createdAt: new Date(),
        },
      });

    } catch (err) {
      setError('Failed to generate voice signature. Please try again.');
      console.error('Generation error:', err);
      
      // Update error status in Firestore
      if (voiceMetadata) {
        await FirestoreService.updateVoiceMetadata(voiceMetadata.id, {
          processingStatus: 'failed',
          processingError: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    } finally {
      setGenerating(false);
    }
  };

  const audioAccept = {
    'audio/*': ['.mp3', '.wav', '.ogg', '.m4a', '.aac']
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center mb-6">
          <Music className="h-6 w-6 text-primary-600 mr-3" />
          <h2 className="text-xl font-semibold text-gray-900">Voice Processing</h2>
          <Cloud className="h-5 w-5 text-blue-500 ml-2" />
          <Database className="h-5 w-5 text-green-500 ml-1" />
        </div>

        {userEmail && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <div className="text-sm text-blue-800">
              <span className="font-medium">Email:</span> {userEmail}
              <button
                onClick={() => setUserEmail('')}
                className="ml-2 text-blue-600 hover:text-blue-800 underline"
              >
                Change
              </button>
            </div>
          </div>
        )}

        <div className="space-y-6">{' '}
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

          {firebaseResult && voiceMetadata && (
            <div className="space-y-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center mb-2">
                  <Cloud className="h-5 w-5 text-green-600 mr-2" />
                  <Database className="h-5 w-5 text-green-600 mr-2" />
                  <span className="font-medium text-green-800">Uploaded & Saved</span>
                </div>
                <div className="text-sm space-y-1">
                  <div>
                    <span className="font-medium text-gray-700">File:</span>
                    <span className="text-gray-600 ml-2">{firebaseResult.name}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Email:</span>
                    <span className="text-gray-600 ml-2">{userEmail}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Metadata ID:</span>
                    <span className="text-gray-600 ml-2 font-mono text-xs">{voiceMetadata.id}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Status:</span>
                    <span className={`ml-2 px-2 py-1 rounded text-xs ${
                      voiceMetadata.processingStatus === 'completed' ? 'bg-green-100 text-green-800' :
                      voiceMetadata.processingStatus === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                      voiceMetadata.processingStatus === 'failed' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {voiceMetadata.processingStatus}
                    </span>
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

      <EmailDialog
        isOpen={showEmailDialog}
        onClose={() => setShowEmailDialog(false)}
        onSubmit={handleEmailSubmit}
        title="Enter Your Email"
        description="Please provide your email address to upload and process voice files."
      />
    </>
  );
};