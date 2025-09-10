# Database Schema Design - Dual Storage Documents System

**Date**: September 2, 2025  
**Purpose**: Support both legacy local storage and modern Vercel Blob storage

## Current State Analysis

### Existing `documents` Table
```sql
-- Legacy documents table (read-only going forward)
CREATE TABLE documents (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  file_path VARCHAR(500) NOT NULL,  -- Legacy local file paths
  mime_type VARCHAR(100) NOT NULL,
  uploaded_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

**Characteristics**:
- Contains existing documents with local file paths
- Will remain read-only (no new documents added)
- Used for display/download of legacy files
- No migration needed - files stay where they are

## Proposed New Schema

### New `document_files` Table
```sql
-- Modern documents table for Vercel Blob storage
CREATE TABLE document_files (
  id INT PRIMARY KEY AUTO_INCREMENT,
  
  -- Document metadata
  name VARCHAR(255) NOT NULL,
  description TEXT,
  original_filename VARCHAR(255) NOT NULL,
  
  -- Storage information
  storage_type ENUM('vercel_blob') DEFAULT 'vercel_blob',
  blob_url VARCHAR(500) NOT NULL,           -- Vercel blob URL
  blob_pathname VARCHAR(255) NOT NULL,      -- Vercel blob pathname for management
  download_url VARCHAR(500),                -- Optional cached download URL
  
  -- File information
  mime_type VARCHAR(100) NOT NULL,
  file_size BIGINT NOT NULL,               -- File size in bytes
  
  -- Upload information
  uploaded_by VARCHAR(255) NOT NULL,
  upload_ip VARCHAR(45),                   -- Track upload IP for security
  
  -- Metadata and organization
  tags JSON,                               -- Document tags as JSON array
  metadata JSON,                           -- Additional file metadata
  
  -- Status and lifecycle
  status ENUM('uploading', 'active', 'archived', 'deleted') DEFAULT 'active',
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Indexes
  INDEX idx_uploaded_by (uploaded_by),
  INDEX idx_mime_type (mime_type),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at),
  FULLTEXT INDEX idx_search (name, description)
);
```

## Implementation Strategy

### Phase 1: Schema Creation
1. Create `document_files` table alongside existing `documents`
2. Update TypeScript types to include both tables
3. No changes to existing `documents` table

### Phase 2: Repository Layer Updates
```typescript
// Unified document interface
interface DocumentFile {
  id: number;
  name: string;
  description: string;
  mimeType: string;
  uploadedBy: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Storage differentiation
  storageType: 'legacy' | 'vercel_blob';
  
  // Storage-specific fields
  filePath?: string;      // For legacy documents
  blobUrl?: string;       // For Vercel blob documents
  fileSize?: number;      // Available for new documents
  tags?: string[];        // Only for new documents
}

// Repository methods
class DocumentRepository {
  // Get documents from both systems
  async getAllDocuments(): Promise<DocumentFile[]>;
  
  // Legacy document operations (read-only)
  async getLegacyDocuments(): Promise<DocumentFile[]>;
  
  // Modern document operations (full CRUD)
  async getModernDocuments(): Promise<DocumentFile[]>;
  async createModernDocument(): Promise<DocumentFile>;
  async updateModernDocument(): Promise<boolean>;
  async deleteModernDocument(): Promise<boolean>;
}
```

### Phase 3: Storage Backend Switch
1. Replace DigitalOcean Spaces client with Vercel Blob
2. Update API endpoints to use Vercel Blob
3. Maintain same upload flow but different storage

### Phase 4: UI Integration
1. Update DocumentList to handle both storage types
2. Show storage type indicators in UI
3. Disable edit/delete for legacy documents
4. New uploads go to modern system only

## Benefits of This Approach

### ✅ Advantages
1. **No Data Loss**: All legacy documents remain accessible
2. **Clean Separation**: Clear distinction between old and new systems
3. **Gradual Migration**: Can move to new system without disruption
4. **Future Flexibility**: Can add more storage types later
5. **Better Features**: New documents get modern features (tags, metadata, etc.)

### 🔄 Trade-offs
1. **Dual System Complexity**: Need to handle two storage systems
2. **UI Differences**: Legacy vs modern documents have different capabilities
3. **Search Complexity**: Need to search across both tables

## Migration Script (Optional Future)
```sql
-- Optional: If we ever want to migrate legacy documents
-- This would copy metadata only, not move files
INSERT INTO document_files (
  name, description, original_filename, 
  storage_type, blob_url, blob_pathname,
  mime_type, file_size, uploaded_by,
  status, created_at, updated_at
)
SELECT 
  name, description, name,
  'legacy' as storage_type,
  file_path as blob_url,
  file_path as blob_pathname,
  mime_type, 0 as file_size, uploaded_by,
  'archived' as status,
  created_at, updated_at
FROM documents;
```

## Next Steps
1. Create database migration for `document_files` table
2. Update TypeScript database types
3. Create Vercel Blob storage client
4. Update DocumentRepository for dual system
5. Test new upload flow with Vercel Blob
