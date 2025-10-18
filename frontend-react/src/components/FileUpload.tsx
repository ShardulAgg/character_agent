import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { X, Image, Music } from 'lucide-react';
import { cn, formatFileSize, getFileType } from '../lib/utils';

interface FileUploadProps {
  accept: Record<string, string[]>;
  maxSize?: number;
  onFileSelect: (file: File) => void;
  selectedFile?: File | null;
  className?: string;
  type: 'image' | 'audio';
}

export const FileUpload: React.FC<FileUploadProps> = ({
  accept,
  maxSize = 10 * 1024 * 1024, // 10MB default
  onFileSelect,
  selectedFile,
  className,
  type,
}) => {
  const [error, setError] = useState<string>('');

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      setError('');
      const file = acceptedFiles[0];
      
      if (file) {
        if (file.size > maxSize) {
          setError(`File size must be less than ${formatFileSize(maxSize)}`);
          return;
        }
        
        const fileType = getFileType(file);
        if (fileType !== type) {
          setError(`Please select a valid ${type} file`);
          return;
        }
        
        onFileSelect(file);
      }
    },
    [maxSize, onFileSelect, type]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxFiles: 1,
  });

  const removeFile = () => {
    setError('');
    onFileSelect(null as any);
  };

  const Icon = type === 'image' ? Image : Music;

  return (
    <div className={cn('w-full', className)}>
      {!selectedFile ? (
        <div
          {...getRootProps()}
          className={cn(
            'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
            isDragActive
              ? 'border-primary-500 bg-primary-50'
              : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
          )}
        >
          <input {...getInputProps()} />
          <Icon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-lg font-medium text-gray-900 mb-2">
            {isDragActive
              ? `Drop your ${type} file here`
              : `Upload ${type} file`}
          </p>
          <p className="text-sm text-gray-500">
            Drag and drop or click to select
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Max size: {formatFileSize(maxSize)}
          </p>
        </div>
      ) : (
        <div className="border-2 border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Icon className="h-8 w-8 text-primary-500" />
              <div>
                <p className="font-medium text-gray-900">{selectedFile.name}</p>
                <p className="text-sm text-gray-500">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>
            </div>
            <button
              onClick={removeFile}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
          
          {type === 'image' && (
            <div className="mt-4">
              <img
                src={URL.createObjectURL(selectedFile)}
                alt="Preview"
                className="max-w-full h-48 object-contain rounded-lg"
              />
            </div>
          )}
          
          {type === 'audio' && (
            <div className="mt-4">
              <audio controls className="w-full">
                <source src={URL.createObjectURL(selectedFile)} type={selectedFile.type} />
                Your browser does not support the audio element.
              </audio>
            </div>
          )}
        </div>
      )}
      
      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};