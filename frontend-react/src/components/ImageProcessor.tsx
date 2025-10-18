import React, { useState } from 'react';
import { FileUpload } from './FileUpload';
import { Button } from './Button';
import { apiService } from '../services/api';
import { ImageVariation } from '../types/api';
import { Image as ImageIcon, Loader2 } from 'lucide-react';

export const ImageProcessor: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [uploadedFilename, setUploadedFilename] = useState<string>('');
  const [variations, setVariations] = useState<ImageVariation[]>([]);
  const [numVariations, setNumVariations] = useState(5);
  const [error, setError] = useState<string>('');

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setError('');
    setVariations([]);
    setUploadedFilename('');
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setError('');

    try {
      const response = await apiService.uploadImage(selectedFile);
      setUploadedFilename(response.filename);
    } catch (err) {
      setError('Failed to upload image. Please try again.');
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleGenerateVariations = async () => {
    if (!uploadedFilename) return;

    setGenerating(true);
    setError('');

    try {
      const response = await apiService.generateImageVariations(
        uploadedFilename,
        numVariations
      );
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

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center mb-6">
        <ImageIcon className="h-6 w-6 text-primary-600 mr-3" />
        <h2 className="text-xl font-semibold text-gray-900">Image Processing</h2>
      </div>

      <div className="space-y-6">
        <FileUpload
          accept={imageAccept}
          onFileSelect={handleFileSelect}
          selectedFile={selectedFile}
          type="image"
          maxSize={10 * 1024 * 1024} // 10MB
        />

        {selectedFile && !uploadedFilename && (
          <Button
            onClick={handleUpload}
            loading={uploading}
            className="w-full"
          >
            Upload Image
          </Button>
        )}

        {uploadedFilename && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label htmlFor="numVariations" className="block text-sm font-medium text-gray-700">
                  Number of Variations
                </label>
                <input
                  type="number"
                  id="numVariations"
                  min="1"
                  max="10"
                  value={numVariations}
                  onChange={(e) => setNumVariations(parseInt(e.target.value) || 5)}
                  className="mt-1 block w-20 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
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

            <div className="text-sm text-green-600 bg-green-50 p-3 rounded-md">
              ✅ Image uploaded successfully: {uploadedFilename}
            </div>
          </div>
        )}

        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
            ❌ {error}
          </div>
        )}

        {variations.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Generated Variations</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {variations.map((variation, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="text-center">
                    <div className="w-full h-32 bg-gray-100 rounded-lg flex items-center justify-center mb-3">
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