// Vercel Blob Storage Configuration and Client
import { put, del, head } from '@vercel/blob';

// Environment configuration for Vercel Blob
const BLOB_READ_WRITE_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;

if (!BLOB_READ_WRITE_TOKEN) {
  throw new Error('BLOB_READ_WRITE_TOKEN environment variable is required');
}

// Upload configuration
export const UPLOAD_CONFIG = {
  maxFileSize: 50 * 1024 * 1024, // 50MB
  allowedMimeTypes: [
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
    // Images
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    // Archives
    'application/zip',
    'application/x-rar-compressed',
    'application/x-7z-compressed',
    // Other
    'application/json',
    'application/xml',
  ],
  uploadPrefix: 'documents/', // Organize files under documents/ path
};

// Upload file directly to Vercel Blob
export async function uploadToBlob(
  file: File | Buffer,
  filename: string,
  mimeType: string
): Promise<{ url: string; pathname: string; downloadUrl: string }> {
  try {
    // Generate unique pathname
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const randomString = Math.random().toString(36).substring(2, 8);
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_').replace(/_{2,}/g, '_');
    const pathname = `${UPLOAD_CONFIG.uploadPrefix}${timestamp}/${randomString}_${sanitizedFilename}`;

    // Upload to Vercel Blob
    const blob = await put(pathname, file, {
      access: 'public',
      token: BLOB_READ_WRITE_TOKEN,
      contentType: mimeType,
    });

    return {
      url: blob.url,
      pathname: pathname,
      downloadUrl: blob.downloadUrl,
    };
  } catch (error) {
    console.error('Error uploading to Vercel Blob:', error);
    throw new Error('Failed to upload file to Vercel Blob storage');
  }
}

// Delete file from Vercel Blob
export async function deleteFromBlob(url: string): Promise<boolean> {
  try {
    await del(url, { token: BLOB_READ_WRITE_TOKEN });
    return true;
  } catch (error) {
    console.error('Error deleting from Vercel Blob:', error);
    return false;
  }
}

// Get file metadata from Vercel Blob
export async function getBlobMetadata(url: string): Promise<{
  url: string;
  size: number;
  uploadedAt: Date;
} | null> {
  try {
    const metadata = await head(url, { token: BLOB_READ_WRITE_TOKEN });
    return {
      url: metadata.url,
      size: metadata.size,
      uploadedAt: metadata.uploadedAt,
    };
  } catch (error) {
    console.error('Error getting blob metadata:', error);
    return null;
  }
}

// File validation utilities
export function validateFile(file: { size: number; type: string; name: string }) {
  const errors: string[] = [];

  // Check file size
  if (file.size > UPLOAD_CONFIG.maxFileSize) {
    errors.push(`File size must be less than ${UPLOAD_CONFIG.maxFileSize / (1024 * 1024)}MB`);
  }

  // Check mime type
  if (!UPLOAD_CONFIG.allowedMimeTypes.includes(file.type)) {
    errors.push(`File type ${file.type} is not allowed`);
  }

  // Check filename
  if (file.name.length > 255) {
    errors.push('Filename must be less than 255 characters');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Extract file extension from mime type
export function getFileExtension(mimeType: string): string {
  const mimeToExt: Record<string, string> = {
    'application/pdf': 'pdf',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.ms-excel': 'xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'text/plain': 'txt',
    'text/csv': 'csv',
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'application/zip': 'zip',
  };

  return mimeToExt[mimeType] || 'bin';
}

// Generate a download filename with proper extension
export function generateDownloadFilename(originalName: string, mimeType: string): string {
  const extension = getFileExtension(mimeType);
  
  // If the original name already has the correct extension, use it
  if (originalName.toLowerCase().endsWith(`.${extension}`)) {
    return originalName;
  }
  
  // Otherwise, append the correct extension
  return `${originalName}.${extension}`;
}
