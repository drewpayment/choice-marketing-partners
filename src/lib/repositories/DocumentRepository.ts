// Document Repository for database operations with Vercel Blob storage
import { db } from '@/lib/database/client';
import { logger } from '@/lib/utils/logger'

export interface DocumentSummary {
  id: number;
  name: string;
  description: string;
  downloadUrl: string;
  mimeType: string;
  uploadedBy: string;
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
  fileSize: number;
}

export interface DocumentFilters {
  search?: string;
  mimeType?: string;
  uploadedBy?: string;
  tagFilter?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface PaginatedDocuments {
  documents: DocumentSummary[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface DocumentTag {
  slug: string;
  name: string;
  count: number;
}

export class DocumentRepository {
  /**
   * Get paginated documents from Vercel Blob storage
   */
  async getDocuments(
    filters: DocumentFilters = {},
    page: number = 1,
    pageSize: number = 20
  ): Promise<PaginatedDocuments> {
    logger.log('DocumentRepository.getDocuments called with filters:', filters);

    // Build base query for documents
    let query = db
      .selectFrom('document_files')
      .selectAll()
      .where('status', '=', 'active')
      .orderBy('created_at', 'desc');

    // Apply filters
    query = this.applyFilters(query, filters);

    // Get total count for pagination
    let countQuery = db
      .selectFrom('document_files')
      .select(db.fn.count('id').as('count'))
      .where('status', '=', 'active');

    countQuery = this.applyFilters(countQuery, filters);

    // Execute count query
    const totalResult = await countQuery.executeTakeFirst();
    const total = Number(totalResult?.count || 0);

    // Get paginated results
    const offset = (page - 1) * pageSize;
    const documents = await query
      .limit(pageSize)
      .offset(offset)
      .execute();

    logger.log('Found documents:', documents.length, 'of', total, 'total');

    // Transform to DocumentSummary format
    const documentSummaries: DocumentSummary[] = await Promise.all(
      documents.map(async (doc) => ({
        id: Number(doc.id),
        name: doc.name,
        description: doc.description || '',
        downloadUrl: doc.download_url || doc.blob_url || '',
        mimeType: doc.mime_type,
        uploadedBy: doc.uploaded_by,
        createdAt: doc.created_at || new Date(),
        updatedAt: doc.updated_at || new Date(),
        tags: await this.getDocumentTags(Number(doc.id)),
        fileSize: doc.file_size || 0,
      }))
    );

    return {
      documents: documentSummaries,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Apply filters to document query
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private applyFilters(query: any, filters: DocumentFilters): any {
    if (filters.search) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      query = query.where((eb: any) =>
        eb.or([
          eb('name', 'like', `%${filters.search}%`),
          eb('description', 'like', `%${filters.search}%`),
          eb('uploaded_by', 'like', `%${filters.search}%`),
        ])
      );
    }

    if (filters.mimeType) {
      query = query.where('mime_type', '=', filters.mimeType);
    }

    if (filters.uploadedBy) {
      query = query.where('uploaded_by', '=', filters.uploadedBy);
    }

    if (filters.dateFrom) {
      const dateFrom = new Date(filters.dateFrom);
      query = query.where('created_at', '>=', dateFrom);
    }

    if (filters.dateTo) {
      const dateTo = new Date(filters.dateTo);
      query = query.where('created_at', '<=', dateTo);
    }

    return query;
  }

  /**
   * Get a single document by ID
   */
  async getDocumentById(id: number): Promise<DocumentSummary | null> {
    const doc = await db
      .selectFrom('document_files')
      .selectAll()
      .where('id', '=', id)
      .where('status', '=', 'active')
      .executeTakeFirst();

    if (!doc) return null;

    return {
      id: Number(doc.id),
      name: doc.name,
      description: doc.description || '',
      downloadUrl: doc.download_url || doc.blob_url || '',
      mimeType: doc.mime_type,
      uploadedBy: doc.uploaded_by,
      createdAt: doc.created_at || new Date(),
      updatedAt: doc.updated_at || new Date(),
      tags: await this.getDocumentTags(Number(doc.id)),
      fileSize: doc.file_size || 0,
    };
  }

  /**
   * Create a document in Vercel Blob storage
   */
  async createDocument(data: {
    name: string;
    description: string;
    fileSize: number;
    mimeType: string;
    blobUrl: string;
    blobPathname: string;
    downloadUrl: string;
    uploadedBy: string;
  }): Promise<DocumentSummary> {
    // Insert the record and get the inserted ID (MySQL compatible)
    const insertResult = await db
      .insertInto('document_files')
      .values({
        name: data.name,
        description: data.description,
        original_filename: data.name,
        file_size: data.fileSize,
        mime_type: data.mimeType,
        storage_type: 'vercel_blob',
        blob_url: data.blobUrl,
        blob_pathname: data.blobPathname,
        download_url: data.downloadUrl,
        uploaded_by: data.uploadedBy,
        status: 'active',
        created_at: new Date(),
        updated_at: new Date(),
      })
      .executeTakeFirstOrThrow();

    // Retrieve the inserted record using the ID
    const insertedRecord = await db
      .selectFrom('document_files')
      .selectAll()
      .where('id', '=', Number(insertResult.insertId))
      .executeTakeFirstOrThrow();

    return {
      id: Number(insertedRecord.id),
      name: insertedRecord.name,
      description: insertedRecord.description || '',
      downloadUrl: insertedRecord.download_url || insertedRecord.blob_url || '',
      mimeType: insertedRecord.mime_type,
      uploadedBy: insertedRecord.uploaded_by,
      createdAt: insertedRecord.created_at || new Date(),
      updatedAt: insertedRecord.updated_at || new Date(),
      tags: [],
      fileSize: insertedRecord.file_size || 0,
    };
  }

  /**
   * Update document metadata
   */
  async updateDocument(
    id: number,
    data: Partial<{
      name: string;
      description: string;
    }>
  ): Promise<boolean> {
    const updateData: {
      name?: string;
      description?: string;
      updated_at?: Date;
    } = {
      updated_at: new Date(),
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;

    const result = await db
      .updateTable('document_files')
      .set(updateData)
      .where('id', '=', id)
      .where('status', '=', 'active')
      .executeTakeFirst();

    return result.numUpdatedRows > 0;
  }

  /**
   * Delete document(s) by setting status to 'deleted'
   */
  async deleteDocuments(ids: number[]): Promise<number> {
    const result = await db
      .updateTable('document_files')
      .set({
        status: 'deleted',
        updated_at: new Date(),
      })
      .where('id', 'in', ids)
      .where('status', '=', 'active')
      .executeTakeFirst();

    return Number(result.numUpdatedRows);
  }

  /**
   * Get all available MIME types
   */
  async getMimeTypes(): Promise<string[]> {
    const result = await db
      .selectFrom('document_files')
      .select('mime_type')
      .distinct()
      .where('status', '=', 'active')
      .orderBy('mime_type')
      .execute();

    return result.map((row: { mime_type: string }) => row.mime_type);
  }

  /**
   * Get all users who have uploaded documents
   */
  async getUploaders(): Promise<string[]> {
    const result = await db
      .selectFrom('document_files')
      .select('uploaded_by')
      .distinct()
      .where('status', '=', 'active')
      .orderBy('uploaded_by')
      .execute();

    return result.map((row: { uploaded_by: string }) => row.uploaded_by);
  }

  /**
   * Get document tags (placeholder for future implementation)
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getDocumentTags(_documentId: number): Promise<string[]> {
    // TODO: Implement tagging system integration
    return [];
  }

  /**
   * Get available tags with counts (placeholder for future implementation)
   */
  async getAvailableTags(): Promise<DocumentTag[]> {
    // TODO: Implement tagging system integration
    return [];
  }
}
