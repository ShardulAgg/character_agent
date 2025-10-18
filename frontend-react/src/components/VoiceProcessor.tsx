import React, { useState } from 'react';
import { FileUpload } from './FileUpload';
import { Button } from './Button';
import { apiService } from '../services/api';
import { Music, Loader2 } from 'lucide-react';

export const VoiceProcessor: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [uploadedFilename, setUploadedFilename] = useState<string>('');
  const [signatureResult, setSignatureResult] = useState<any>(null);
  const [voiceText, setVoiceText] = useState('Hello, this is a voice signature');
  const [error, setError] = useState<string>('');

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setError('');
    setSignatureResult(null);
    setUploadedFilename('');
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setError('');

    try {
      const response = await apiService.uploadVoice(selectedFile);
      setUploadedFilename(response.filename);
    } catch (err) {
      setError('Failed to upload voice file. Please try again.');
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleGenerateSignature = async () => {
    if (!uploadedFilename) return;

    setGenerating(true);
    setError('');

    try {
      const response = await apiService.generateVoiceSignature(
        uploadedFilename,
        voiceText
      );
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
      </div>

      <div className="space-y-6">
        <FileUpload
          accept={audioAccept}
          onFileSelect={handleFileSelect}
          selectedFile={selectedFile}
          type="audio"
          maxSize={50 * 1024 * 1024} // 50MB for audio files
        />

        {selectedFile && !uploadedFilename && (
          <Button
            onClick={handleUpload}
            loading={uploading}
            className="w-full"
          >
            Upload Voice File
          </Button>
        )}

        {uploadedFilename && (
          <div className="space-y-4">
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

            <div className="text-sm text-green-600 bg-green-50 p-3 rounded-md">
              ✅ Voice file uploaded successfully: {uploadedFilename}
            </div>
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
                  <span className="font-medium text-gray-700">Original File:</span>
                  <p className="text-gray-600">{signatureResult.original_voice}</p>
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