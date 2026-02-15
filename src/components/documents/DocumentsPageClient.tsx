'use client';

import React, { useState } from 'react';
import { DocumentUpload } from '@/components/documents/DocumentUpload';
import { DocumentList } from '@/components/documents/DocumentList';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { logger } from '@/lib/utils/logger'

export function DocumentsPageClient() {
  const [activeView, setActiveView] = useState<'list' | 'upload'>('list');
  const { data: session } = useSession();

  const handleUploadComplete = (documentId: number) => {
    logger.log('Document uploaded successfully:', documentId);
    // Optionally switch back to list view after upload
    setActiveView('list');
  };

  const handleUploadError = (error: string) => {
    logger.error('Upload error:', error);
  };

  if (activeView === 'upload') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <Button
              variant="outline"
              onClick={() => setActiveView('list')}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Documents
            </Button>
            <h1 className="text-2xl font-bold">Upload Documents</h1>
            <p className="text-muted-foreground">
              Upload new documents to the cloud storage system
            </p>
          </div>

          {
            session?.user?.isAdmin
              ? <DocumentUpload
                onUploadComplete={handleUploadComplete}
                onUploadError={handleUploadError}
                maxFiles={10}
              />
              : <></>
          }
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto">
        <DocumentList
          onUploadClick={session?.user?.isAdmin ? () => setActiveView('upload') : undefined}
        />
      </div>
    </div>
  );
}
