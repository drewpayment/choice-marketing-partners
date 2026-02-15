'use client';

import { ParseError } from '@/lib/excel-import/parser';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertCircle, CheckCircle2, XCircle } from 'lucide-react';

interface ImportPreviewProps {
  data: Record<string, string | number>[];
  errors: ParseError[];
  isBatchMode: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  onBack: () => void;
  filteredCount?: number;
  totalParsedCount?: number;
  selectedAgentName?: string;
  showRepIdWarning?: boolean;
}

export default function ImportPreview({
  data,
  errors,
  isBatchMode,
  onConfirm,
  onCancel,
  onBack,
  filteredCount,
  totalParsedCount,
  selectedAgentName,
  showRepIdWarning
}: ImportPreviewProps) {
  const hasErrors = errors.length > 0;
  const validRows = data.length - new Set(errors.map(e => e.row)).size;

  // Group errors by row
  const errorsByRow = errors.reduce((acc, error) => {
    if (!acc[error.row]) {
      acc[error.row] = [];
    }
    acc[error.row].push(error);
    return acc;
  }, {} as Record<number, ParseError[]>);

  // In batch mode with errors, we can't proceed
  const canProceed = !isBatchMode || !hasErrors;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Import Preview</h3>
        <p className="text-sm text-muted-foreground">
          {isBatchMode 
            ? 'Review the data before importing. All rows must be valid to proceed.'
            : 'Review the data. Invalid rows will be partially imported and can be corrected in the form.'
          }
        </p>
      </div>

      {/* Agent Filter Summary */}
      {filteredCount !== undefined && totalParsedCount !== undefined && filteredCount < totalParsedCount && (
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-primary">Agent Filter Applied</h4>
              <p className="text-sm text-primary mt-1">
                Filtered to <strong>{filteredCount}</strong> of <strong>{totalParsedCount}</strong> total rows 
                {selectedAgentName && <> matching agent <strong>{selectedAgentName}</strong></>}.
                {totalParsedCount - filteredCount > 0 && (
                  <> {totalParsedCount - filteredCount} record(s) were excluded.</>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Warning if agent selected but no REP ID mapping */}
      {showRepIdWarning && (
        <div className="bg-secondary/10 border border-secondary/30 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-secondary mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-secondary">REP ID Not Mapped</h4>
              <p className="text-sm text-secondary mt-1">
                You have selected an agent (<strong>{selectedAgentName}</strong>) but did not map the REP ID field.
                <strong> All {data.length} records</strong> from the file will be imported to this pay statement,
                which may include sales for other agents.
              </p>
              <p className="text-sm text-secondary mt-2">
                To filter by agent, go back to column mapping and map the REP ID field to enable automatic filtering.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium text-muted-foreground">Valid Rows</span>
          </div>
          <div className="text-2xl font-bold">{validRows}</div>
        </div>

        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <XCircle className="w-5 h-5 text-destructive" />
            <span className="text-sm font-medium text-muted-foreground">Invalid Rows</span>
          </div>
          <div className="text-2xl font-bold">{new Set(errors.map(e => e.row)).size}</div>
        </div>

        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-5 h-5 text-secondary" />
            <span className="text-sm font-medium text-muted-foreground">Total Errors</span>
          </div>
          <div className="text-2xl font-bold">{errors.length}</div>
        </div>
      </div>

      {/* Errors List (if any) */}
      {hasErrors && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
          <div className="flex items-start gap-2 mb-3">
            <XCircle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="font-medium text-destructive">
                {isBatchMode ? 'Import Blocked - Fix These Errors' : 'Validation Warnings'}
              </h4>
              <p className="text-sm text-destructive mt-1">
                {isBatchMode 
                  ? 'Please fix these errors in your spreadsheet and try again.'
                  : 'These rows will be imported with missing or invalid data. You can fix them in the form.'
                }
              </p>
            </div>
          </div>

          <div className="h-48 w-full rounded border bg-card overflow-auto">
            <div className="p-3 space-y-2">
              {Object.entries(errorsByRow).map(([rowNum, rowErrors]) => (
                <div key={rowNum} className="text-sm">
                  <div className="font-medium text-destructive">
                    Row {rowNum}:
                  </div>
                  <ul className="ml-4 mt-1 space-y-1">
                    {rowErrors.map((error, idx) => (
                      <li key={idx} className="text-destructive">
                        • <span className="font-medium">{error.field}</span>: {error.message}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Data Preview */}
      <div>
        <h4 className="font-medium mb-3">
          Data Preview (First 10 rows)
        </h4>
        <div className="border rounded-lg overflow-auto">
          <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Sale Date</TableHead>
                  <TableHead>First Name</TableHead>
                  <TableHead>Last Name</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Amount</TableHead>
                  {data.some(d => d.vendor) && <TableHead>Vendor</TableHead>}
                  {data.some(d => d.employee_name) && <TableHead>Employee</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.slice(0, 10).map((row, index) => {
                  const rowNumber = index + 2; // Excel row number
                  const hasError = !!errorsByRow[rowNumber];

                  return (
                    <TableRow 
                      key={index}
                      className={hasError ? 'bg-destructive/10' : ''}
                    >
                      <TableCell className="font-medium">
                        {hasError && <XCircle className="w-4 h-4 text-destructive inline mr-1" />}
                        {rowNumber}
                      </TableCell>
                      <TableCell>{row.sale_date || '-'}</TableCell>
                      <TableCell>{row.first_name || '-'}</TableCell>
                      <TableCell>{row.last_name || '-'}</TableCell>
                      <TableCell>{row.address || '-'}</TableCell>
                      <TableCell>{row.city || '-'}</TableCell>
                      <TableCell>{row.status || '-'}</TableCell>
                      <TableCell>{row.amount !== undefined ? row.amount : '-'}</TableCell>
                      {data.some(d => d.vendor) && <TableCell>{row.vendor || '-'}</TableCell>}
                      {data.some(d => d.employee_name) && <TableCell>{row.employee_name || '-'}</TableCell>}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
        </div>
        {data.length > 10 && (
          <p className="text-sm text-muted-foreground mt-2">
            Showing 10 of {data.length} rows
          </p>
        )}
      </div>

      <div className="flex justify-between items-center pt-4 border-t">
        <Button variant="outline" onClick={onBack}>
          Back to Mapping
        </Button>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onCancel}>
            Cancel Import
          </Button>
          <Button 
            onClick={onConfirm} 
            disabled={!canProceed}
          >
            {isBatchMode ? 'Import All Valid Rows' : 'Import to Form'}
          </Button>
        </div>
      </div>
    </div>
  );
}
