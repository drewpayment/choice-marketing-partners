'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { logger } from '@/lib/utils/logger';
import {
  FileText,
  Download,
  Search,
  MoreVertical,
  Calendar,
  User,
  FileType,
  Upload
} from 'lucide-react';

interface Document {
  id: number;
  name: string;
  description: string;
  downloadUrl: string;
  mimeType: string;
  uploadedBy: string;
  createdAt: string;
  updatedAt: string;
  fileSize: number;
  tags: string[];
}

interface DocumentsResponse {
  documents: Document[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface DocumentListProps {
  onUploadClick?: () => void;
}

export function DocumentList({ onUploadClick }: DocumentListProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({
    mimeType: '',
    uploadedBy: '',
  });

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: currentPage.toString(),
        pageSize: '20',
      });

      if (searchTerm.trim()) params.append('search', searchTerm.trim());
      if (filters.mimeType) params.append('mimeType', filters.mimeType);
      if (filters.uploadedBy) params.append('uploadedBy', filters.uploadedBy);

      logger.log('Fetching documents with params:', params.toString());

      const response = await fetch(`/api/documents?${params}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch documents: ${response.status} ${response.statusText}`);
      }

      const data: DocumentsResponse = await response.json();
      logger.log('Documents received:', data);
      setDocuments(data.documents);
      setTotalPages(data.totalPages);
      setTotal(data.total);
    } catch (err) {
      logger.error('Fetch documents error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, filters]);

  useEffect(() => {
    // Reset to page 1 when filters change
    setCurrentPage(1);
  }, [searchTerm, filters]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleDownload = async (document: Document) => {
    try {
      const response = await fetch(`/api/documents/${document.id}?includeDownloadUrl=true`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) throw new Error('Failed to get download URL');
      
      const data = await response.json();
      if (data.downloadUrl) {
        // Open download URL in new tab
        window.open(data.downloadUrl, '_blank');
      }
    } catch (err) {
      logger.error('Download error:', err);
      alert('Failed to download document');
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getMimeTypeIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return '📋';
    if (mimeType.includes('zip') || mimeType.includes('rar')) return '🗜️';
    return '📎';
  };

  const getMimeTypeLabel = (mimeType: string) => {
    const typeMap: Record<string, string> = {
      'application/pdf': 'PDF',
      'application/msword': 'Word Doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word Doc',
      'application/vnd.ms-excel': 'Excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel',
      'text/plain': 'Text',
      'text/csv': 'CSV',
      'image/jpeg': 'JPEG',
      'image/png': 'PNG',
      'image/gif': 'GIF',
      'application/zip': 'ZIP',
    };
    return typeMap[mimeType] || mimeType.split('/')[1]?.toUpperCase() || 'File';
  };

  if (loading && documents.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading documents...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-destructive mb-4">⚠️</div>
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={fetchDocuments} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Documents</h1>
          <p className="text-muted-foreground">
            {total} document{total !== 1 ? 's' : ''} total
          </p>
        </div>
        {onUploadClick && (
          <Button onClick={onUploadClick} className="flex items-center space-x-2">
            <Upload className="h-4 w-4" />
            <span>Upload Documents</span>
          </Button>
        )}
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search documents..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <select
                value={filters.mimeType}
                onChange={(e) => setFilters({ ...filters, mimeType: e.target.value })}
                className="px-3 py-2 border border-border rounded-md text-sm bg-card"
              >
                <option value="">All Types</option>
                <option value="application/pdf">PDF</option>
                <option value="application/msword">Word</option>
                <option value="application/vnd.openxmlformats-officedocument.wordprocessingml.document">Word (New)</option>
                <option value="application/vnd.ms-excel">Excel</option>
                <option value="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet">Excel (New)</option>
                <option value="image/jpeg">JPEG Images</option>
                <option value="image/png">PNG Images</option>
              </select>

              {(searchTerm || filters.mimeType) && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm('');
                    setFilters({ mimeType: '', uploadedBy: '' });
                  }}
                  className="px-3"
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documents Grid */}
      {documents.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No documents found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || filters.mimeType || filters.uploadedBy
                ? 'Try adjusting your search filters.'
                : 'Get started by uploading your first document.'
              }
            </p>
            {!searchTerm && !filters.mimeType && !filters.uploadedBy && onUploadClick && (
              <Button onClick={onUploadClick}>
                Upload Documents
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {documents.map((document) => (
            <Card key={document.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div className="text-2xl">
                      {getMimeTypeIcon(document.mimeType)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm truncate" title={document.name}>
                        {document.name}
                      </h3>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {getMimeTypeLabel(document.mimeType)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                {document.description && (
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {document.description}
                  </p>
                )}
                
                <div className="space-y-2 text-xs text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-3 w-3" />
                    <span>{formatDate(document.createdAt)}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <User className="h-3 w-3" />
                    <span>{document.uploadedBy}</span>
                  </div>
                  {document.fileSize && (
                    <div className="flex items-center space-x-1">
                      <FileType className="h-3 w-3" />
                      <span>{formatFileSize(document.fileSize)}</span>
                    </div>
                  )}
                </div>
                
                <div className="flex gap-2 mt-4">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownload(document)}
                    className="flex-1"
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Download
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center space-x-4">
          <Button
            variant="outline"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(currentPage - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(currentPage + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
