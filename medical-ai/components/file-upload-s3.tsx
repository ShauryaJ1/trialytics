'use client';

import { useState } from 'react';
import { X, Upload, File, Check } from 'lucide-react';

export interface UploadedFile {
  name: string;
  size: number;
  type: string;
  s3Key: string;
  presignedUrl: string;
  uploadedAt: Date;
}

interface FileUploadS3Props {
  onFilesUploaded: (files: UploadedFile[]) => void;
  uploadedFiles: UploadedFile[];
  onRemoveFile: (index: number) => void;
}

export function FileUploadS3({ 
  onFilesUploaded, 
  uploadedFiles,
  onRemoveFile 
}: FileUploadS3Props) {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleUpload = async (files: FileList) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    const uploadedFilesList: UploadedFile[] = [];

    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/s3-upload', {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          const data = await response.json();
          uploadedFilesList.push({
            name: file.name,
            size: file.size,
            type: file.type,
            s3Key: data.key,
            presignedUrl: data.presignedUrl,
            uploadedAt: new Date(),
          });
        } else {
          console.error(`Failed to upload ${file.name}`);
        }
      }

      if (uploadedFilesList.length > 0) {
        onFilesUploaded([...uploadedFiles, ...uploadedFilesList]);
      }
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files) {
      handleUpload(e.dataTransfer.files);
    }
  };

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-4 transition-colors ${
          dragActive 
            ? 'border-blue-400 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
        } ${uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          multiple
          onChange={(e) => e.target.files && handleUpload(e.target.files)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={uploading}
          accept=".csv,.xpt,.pdf,.json,.txt,.py,.ipynb"
        />
        
        <div className="text-center">
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <div className="animate-spin h-8 w-8 border-3 border-blue-500 border-t-transparent rounded-full"></div>
              <span className="text-sm text-gray-600">Uploading to S3...</span>
            </div>
          ) : (
            <>
              <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
              <p className="text-sm text-gray-600">
                Drop files here or click to browse
              </p>
              <p className="text-xs text-gray-500 mt-1">
                CSV, XPT, PDF, JSON, TXT, Python, Notebooks
              </p>
            </>
          )}
        </div>
      </div>

      {/* Uploaded files list */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-gray-700 uppercase">
            Uploaded Files ({uploadedFiles.length})
          </h3>
          {uploadedFiles.map((file, index) => (
            <div
              key={`${file.s3Key}-${index}`}
              className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-200"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <File className="h-4 w-4 text-gray-400 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-700 truncate">
                    {file.name}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span>{formatFileSize(file.size)}</span>
                    <span>•</span>
                    <span className="truncate" title={file.s3Key}>
                      s3://.../{ file.s3Key.split('/').pop()}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Check className="h-3 w-3 text-green-500" />
                      Ready
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => onRemoveFile(index)}
                className="ml-2 p-1 hover:bg-gray-200 rounded transition-colors"
                title="Remove file"
              >
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>
          ))}
          
          <div className="mt-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-xs text-blue-700">
              💡 Files are available to the AI via presigned URLs. You can ask it to load and analyze them!
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
