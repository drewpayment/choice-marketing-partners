// API Route: Documents CRUD operations
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { DocumentRepository } from '@/lib/repositories/DocumentRepository';
import { z } from 'zod';

const documentRepository = new DocumentRepository();

// Create document schema
const createDocumentSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional().default(''),
  fileSize: z.number().min(1),
  mimeType: z.string().min(1),
  blobUrl: z.string().min(1),
  blobPathname: z.string().min(1),
  downloadUrl: z.string().min(1),
});

// Search documents schema
const searchSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  mimeType: z.string().optional(),
  uploadedBy: z.string().optional(),
  tagFilter: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

// DELETE documents schema
const deleteSchema = z.object({
  ids: z.array(z.number().min(1)).min(1),
});

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse query parameters
    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());
    
    console.log('API received query params:', queryParams);
    console.log('Full URL:', url.toString());
    
    const searchParams = searchSchema.parse(queryParams);
    
    console.log('Parsed search params:', searchParams);

    // Get documents with filters
    const result = await documentRepository.getDocuments(
      {
        search: searchParams.search,
        mimeType: searchParams.mimeType,
        uploadedBy: searchParams.uploadedBy,
        tagFilter: searchParams.tagFilter,
        dateFrom: searchParams.dateFrom,
        dateTo: searchParams.dateTo,
      },
      searchParams.page,
      searchParams.pageSize
    );

    console.log('API returning result:', { 
      totalDocuments: result.total, 
      currentPage: result.page, 
      documentsOnPage: result.documents.length 
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Documents GET error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}

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

    // Parse and validate request body
    const body = await request.json();
    const validatedData = createDocumentSchema.parse(body);

    // Create document record
    const document = await documentRepository.createDocument({
      name: validatedData.name,
      description: validatedData.description,
      fileSize: validatedData.fileSize,
      mimeType: validatedData.mimeType,
      blobUrl: validatedData.blobUrl,
      blobPathname: validatedData.blobPathname,
      downloadUrl: validatedData.downloadUrl,
      uploadedBy: session.user.email,
    });

    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    console.error('Documents POST error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create document' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = deleteSchema.parse(body);

    // Delete documents
    const deletedCount = await documentRepository.deleteDocuments(validatedData.ids);

    return NextResponse.json({
      success: true,
      deletedCount,
      message: `${deletedCount} document(s) deleted successfully`,
    });
  } catch (error) {
    console.error('Documents DELETE error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to delete documents' },
      { status: 500 }
    );
  }
}
