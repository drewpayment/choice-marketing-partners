'use client';

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, FileText, AlertCircle, CheckCircle2, X } from 'lucide-react';

interface UploadFile {
  file: File;
  id: string;
  name: string;
  description: string;
  uploadProgress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
  documentId?: number;
}

interface DocumentUploadProps {
  onUploadComplete?: (documentId: number) => void;
  onUploadError?: (error: string) => void;
  maxFiles?: number;
}

export function DocumentUpload({ 
  onUploadComplete, 
  onUploadError, 
  maxFiles = 5 
}: DocumentUploadProps) {
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const removeFile = useCallback((id: string) => {
    setUploadFiles(files => files.filter(f => f.id !== id));
  }, []);

  const updateFile = useCallback((id: string, updates: Partial<UploadFile>) => {
    setUploadFiles(files => 
      files.map(f => f.id === id ? { ...f, ...updates } : f)
    );
  }, []);

  const addFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const remainingSlots = maxFiles - uploadFiles.length;
    const filesToAdd = fileArray.slice(0, remainingSlots);

    const newUploadFiles: UploadFile[] = filesToAdd.map(file => ({
      file,
      id: generateId(),
      name: file.name.replace(/\.[^/.]+$/, ''), // Remove extension for editable name
      description: '',
      uploadProgress: 0,
      status: 'pending',
    }));

    setUploadFiles(prev => [...prev, ...newUploadFiles]);
  }, [maxFiles, uploadFiles.length]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      addFiles(files);
    }
    // Reset input
    event.target.value = '';
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
    
    const files = event.dataTransfer.files;
    if (files) {
      addFiles(files);
    }
  };

  const uploadSingleFile = async (uploadFile: UploadFile): Promise<void> => {
    updateFile(uploadFile.id, { status: 'uploading', uploadProgress: 0 });

    try {
      // Create FormData for direct upload to Vercel Blob
      updateFile(uploadFile.id, { uploadProgress: 10 });
      
      const formData = new FormData();
      formData.append('file', uploadFile.file);
      formData.append('description', uploadFile.description);

      updateFile(uploadFile.id, { uploadProgress: 30 });

      // Upload directly to our API that handles Vercel Blob
      const uploadResponse = await fetch('/api/documents/upload-url', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!uploadResponse.ok) {
        const error = await uploadResponse.json();
        throw new Error(error.error || 'Upload failed');
      }

      updateFile(uploadFile.id, { uploadProgress: 80 });

      const result = await uploadResponse.json();
      
      updateFile(uploadFile.id, { 
        status: 'completed', 
        uploadProgress: 100,
        documentId: result.document.id,
      });

      onUploadComplete?.(result.document.id);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      updateFile(uploadFile.id, { 
        status: 'error', 
        error: errorMessage,
        uploadProgress: 0,
      });
      onUploadError?.(errorMessage);
    }
  };

  const handleUploadAll = async () => {
    const pendingFiles = uploadFiles.filter(f => f.status === 'pending');
    if (pendingFiles.length === 0) return;

    setIsUploading(true);

    // Upload files sequentially to avoid overwhelming the server
    for (const file of pendingFiles) {
      await uploadSingleFile(file);
    }

    setIsUploading(false);
  };

  const canUpload = uploadFiles.some(f => f.status === 'pending') && !isUploading;
  const hasCompletedUploads = uploadFiles.some(f => f.status === 'completed');

  return (
    <div className="space-y-6">
      {/* Cloud Storage Notice */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              ☁️
            </div>
            <div>
              <h3 className="font-medium text-blue-900">Secure Cloud Storage</h3>
              <p className="text-sm text-blue-700">
                All new document uploads are securely stored in the cloud with automatic backups and global accessibility.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* File Drop Zone */}
      <Card>
        <CardContent className="p-6">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center transition-colors
              ${isDragging 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400'
              }
              ${uploadFiles.length >= maxFiles ? 'opacity-50 pointer-events-none' : ''}
            `}
          >
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <div className="space-y-2">
              <p className="text-lg font-medium">
                {uploadFiles.length >= maxFiles 
                  ? `Maximum ${maxFiles} files allowed`
                  : 'Drop files here or click to browse'
                }
              </p>
              <p className="text-sm text-gray-500">
                Support for PDFs, Word docs, Excel sheets, images, and more
              </p>
              <p className="text-xs text-gray-400">
                Maximum file size: 50MB per file
              </p>
            </div>
            
            {uploadFiles.length < maxFiles && (
              <Label htmlFor="file-upload" className="cursor-pointer">
                <Input
                  id="file-upload"
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.jpg,.jpeg,.png,.gif,.webp,.svg,.zip,.rar,.7z,.json,.xml"
                />
                <Button type="button" variant="outline" className="mt-4">
                  Browse Files
                </Button>
              </Label>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Upload Queue */}
      {uploadFiles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Upload Queue ({uploadFiles.length}/{maxFiles})</span>
              {canUpload && (
                <Button onClick={handleUploadAll} disabled={isUploading}>
                  Upload All
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {uploadFiles.map((uploadFile) => (
              <div
                key={uploadFile.id}
                className="border rounded-lg p-4 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3 flex-1">
                    <FileText className="h-6 w-6 text-gray-400" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {uploadFile.file.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {(uploadFile.file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  
                  {/* Status Icon */}
                  <div className="flex items-center space-x-2">
                    {uploadFile.status === 'completed' && (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    )}
                    {uploadFile.status === 'error' && (
                      <AlertCircle className="h-5 w-5 text-red-500" />
                    )}
                    {uploadFile.status === 'pending' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(uploadFile.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Editable Fields */}
                {uploadFile.status === 'pending' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor={`name-${uploadFile.id}`} className="text-xs">
                        Document Name
                      </Label>
                      <Input
                        id={`name-${uploadFile.id}`}
                        value={uploadFile.name}
                        onChange={(e) => updateFile(uploadFile.id, { name: e.target.value })}
                        placeholder="Enter document name"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`desc-${uploadFile.id}`} className="text-xs">
                        Description (Optional)
                      </Label>
                      <Input
                        id={`desc-${uploadFile.id}`}
                        value={uploadFile.description}
                        onChange={(e) => updateFile(uploadFile.id, { description: e.target.value })}
                        placeholder="Brief description"
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                )}

                {/* Progress Bar */}
                {uploadFile.status === 'uploading' && (
                  <div className="space-y-1">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${uploadFile.uploadProgress}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500">
                      Uploading... {uploadFile.uploadProgress}%
                    </p>
                  </div>
                )}

                {/* Error Message */}
                {uploadFile.status === 'error' && uploadFile.error && (
                  <div className="border border-red-200 bg-red-50 rounded-lg p-3 flex items-start space-x-2">
                    <AlertCircle className="h-4 w-4 text-red-500 mt-0.5" />
                    <div className="text-sm text-red-700">
                      {uploadFile.error}
                    </div>
                  </div>
                )}

                {/* Success Message */}
                {uploadFile.status === 'completed' && (
                  <div className="border border-green-200 bg-green-50 rounded-lg p-3 flex items-start space-x-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                    <div className="text-sm text-green-700">
                      Upload completed successfully!
                    </div>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Clear Completed */}
      {hasCompletedUploads && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            onClick={() => setUploadFiles(files => files.filter(f => f.status !== 'completed'))}
          >
            Clear Completed
          </Button>
        </div>
      )}
    </div>
  );
}
