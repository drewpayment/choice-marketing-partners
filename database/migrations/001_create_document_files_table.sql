-- Migration: Create document_files table for modern Vercel Blob storage
-- Date: 2025-09-02
-- Purpose: Dual storage system - keep legacy documents, add modern cloud storage

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
  
  -- Indexes for performance
  INDEX idx_uploaded_by (uploaded_by),
  INDEX idx_mime_type (mime_type),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at),
  INDEX idx_storage_type (storage_type),
  FULLTEXT INDEX idx_search (name, description)
);

-- Add a comment to document the purpose
ALTER TABLE document_files COMMENT = 'Modern document storage using Vercel Blob - created 2025-09-02';

-- Note: The existing 'documents' table remains unchanged for legacy file access
