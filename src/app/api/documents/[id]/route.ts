// API Route: Individual document operations
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { DocumentRepository } from '@/lib/repositories/DocumentRepository';
import { z } from 'zod';

const documentRepository = new DocumentRepository();

// Update document schema
const updateDocumentSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Await params in Next.js 15
    const { id } = await params;
    const documentId = parseInt(id);
    if (isNaN(documentId)) {
      return NextResponse.json(
        { error: 'Invalid document ID' },
        { status: 400 }
      );
    }

    // Get document
    const document = await documentRepository.getDocumentById(documentId);
    
    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Check if we should include download URL (already stored for Vercel Blob)
    const url = new URL(request.url);
    const includeDownloadUrl = url.searchParams.get('includeDownloadUrl') === 'true';

    if (includeDownloadUrl && document.downloadUrl) {
      return NextResponse.json({
        ...document,
        downloadUrl: document.downloadUrl,
        downloadUrlExpiresIn: null, // Vercel Blob URLs don't expire
      });
    }

    return NextResponse.json(document);
  } catch (error) {
    console.error('Document GET error:', error);
    
    return NextResponse.json(
      { error: 'Failed to fetch document' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Await params in Next.js 15
    const { id } = await params;
    const documentId = parseInt(id);
    if (isNaN(documentId)) {
      return NextResponse.json(
        { error: 'Invalid document ID' },
        { status: 400 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = updateDocumentSchema.parse(body);

    // Check if document exists
    const existingDocument = await documentRepository.getDocumentById(documentId);
    if (!existingDocument) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Update document
    const success = await documentRepository.updateDocument(documentId, validatedData);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to update document' },
        { status: 500 }
      );
    }

    // Return updated document
    const updatedDocument = await documentRepository.getDocumentById(documentId);
    return NextResponse.json(updatedDocument);
  } catch (error) {
    console.error('Document PATCH error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update document' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Await params in Next.js 15
    const { id } = await params;
    const documentId = parseInt(id);
    if (isNaN(documentId)) {
      return NextResponse.json(
        { error: 'Invalid document ID' },
        { status: 400 }
      );
    }

    // Check if document exists
    const existingDocument = await documentRepository.getDocumentById(documentId);
    if (!existingDocument) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Delete document from database
    const deletedCount = await documentRepository.deleteDocuments([documentId]);
    
    if (deletedCount === 0) {
      return NextResponse.json(
        { error: 'Failed to delete document' },
        { status: 500 }
      );
    }

    // Note: Vercel Blob files are automatically managed
    
    return NextResponse.json({
      success: true,
      message: 'Document deleted successfully',
    });
  } catch (error) {
    console.error('Document DELETE error:', error);
    
    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 }
    );
  }
}
