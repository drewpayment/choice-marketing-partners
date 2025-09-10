// API Route: Upload documents directly to Vercel Blob storage
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { uploadToBlob, validateFile } from '@/lib/storage/vercel-blob';
import { DocumentRepository } from '@/lib/repositories/DocumentRepository';

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const description = formData.get('description') as string || '';

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file
    const validation = validateFile({
      size: file.size,
      type: file.type,
      name: file.name,
    });

    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.errors.join(', ') },
        { status: 400 }
      );
    }

    // Upload to Vercel Blob
    const uploadResult = await uploadToBlob(file, file.name, file.type);

    // Save document record to database using DocumentRepository
    const documentRepository = new DocumentRepository();
    const document = await documentRepository.createDocument({
      name: file.name,
      description: description,
      fileSize: file.size,
      mimeType: file.type,
      blobUrl: uploadResult.url,
      blobPathname: uploadResult.pathname,
      downloadUrl: uploadResult.downloadUrl,
      uploadedBy: session.user.email,
    });

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        name: document.name,
        description: document.description,
        fileSize: document.fileSize,
        mimeType: document.mimeType,
        downloadUrl: document.downloadUrl,
        uploadedBy: document.uploadedBy,
        createdAt: document.createdAt,
      },
    });
  } catch (error) {
    console.error('Upload error:', error);

    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}
