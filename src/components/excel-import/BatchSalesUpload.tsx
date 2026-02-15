'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import ExcelImportDialog from './ExcelImportDialog';
import { InvoiceSaleFormData } from '@/types/database';
import { ParseError } from '@/lib/excel-import/parser';
import { CheckCircle2, Upload, AlertCircle } from 'lucide-react';

export default function BatchSalesUpload() {
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{
    success: boolean;
    message: string;
    count?: number;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleImportComplete = async (sales: InvoiceSaleFormData[], errors?: ParseError[]) => {
    if (errors && errors.length > 0) {
      setUploadStatus({
        success: false,
        message: `Upload failed with ${errors.length} validation errors. Please fix the issues in your file and try again.`
      });
      return;
    }

    setIsSubmitting(true);
    setUploadStatus(null);

    try {
      // TODO: Call API to process batch upload
      // This would need to be implemented based on your backend architecture
      // For now, we'll simulate success
      
      const response = await fetch('/api/sales/batch-upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sales })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to upload sales');
      }

      await response.json(); // consume response

      setUploadStatus({
        success: true,
        message: `Successfully uploaded ${sales.length} sales records!`,
        count: sales.length
      });

      // Reset dialog
      setImportDialogOpen(false);
    } catch (error) {
      setUploadStatus({
        success: false,
        message: error instanceof Error ? error.message : 'An error occurred during upload'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold mb-2">Upload Sales Data</h2>
            <p className="text-sm text-muted-foreground">
              Upload an Excel or CSV file containing sales records. The file should include vendor information 
              and all required sales fields.
            </p>
          </div>

          {uploadStatus && (
            <div 
              className={`border rounded-lg p-4 ${
                uploadStatus.success
                  ? 'bg-primary/10 border-primary/20'
                  : 'bg-destructive/10 border-destructive/20'
              }`}
            >
              <div className="flex items-start gap-2">
                {uploadStatus.success ? (
                  <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
                )}
                <div>
                  <h4 className={`font-medium ${
                    uploadStatus.success ? 'text-primary' : 'text-destructive'
                  }`}>
                    {uploadStatus.success ? 'Upload Successful' : 'Upload Failed'}
                  </h4>
                  <p className={`text-sm mt-1 ${
                    uploadStatus.success ? 'text-primary' : 'text-destructive'
                  }`}>
                    {uploadStatus.message}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-center border-2 border-dashed rounded-lg p-12">
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Upload className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Ready to Upload</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-md">
                Click the button below to select an Excel or CSV file. Make sure your file includes 
                all required fields and vendor information.
              </p>
              <Button 
                onClick={() => setImportDialogOpen(true)}
                size="lg"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Uploading...' : 'Select File'}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">File Requirements</h3>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-2">Required Fields</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Sale Date</li>
                <li>• First Name</li>
                <li>• Last Name</li>
                <li>• Address</li>
                <li>• City</li>
                <li>• Status</li>
                <li>• Amount</li>
                <li>• Vendor (required for batch uploads)</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium mb-2">Optional Fields</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Employee/Agent Name</li>
                <li>• Employee/Agent ID</li>
              </ul>
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-medium mb-2">Format Notes</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Supported file types: .xlsx, .xls, .csv</li>
              <li>• Maximum 3,000 rows per upload</li>
              <li>• First row must contain column headers</li>
              <li>• Dates can be in MM/DD/YYYY or YYYY-MM-DD format</li>
              <li>• Amounts can include $ symbols and commas</li>
              <li>• All rows must pass validation to complete the upload</li>
            </ul>
          </div>
        </div>
      </Card>

      <ExcelImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        mode="batch"
        onImportComplete={handleImportComplete}
      />
    </div>
  );
}
