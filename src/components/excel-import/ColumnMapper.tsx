'use client';

import { useState } from 'react';
import { ColumnMapping, SALES_FIELD_DEFINITIONS, FieldDefinition } from '@/lib/excel-import/field-mapper';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle2, AlertCircle, HelpCircle } from 'lucide-react';
import { logger } from '@/lib/utils/logger'

interface ColumnMapperProps {
  mappings: ColumnMapping[];
  onMappingsChange: (mappings: ColumnMapping[]) => void;
  onConfirm: (mappings: ColumnMapping[]) => void;
  onCancel: () => void;
  isBatchMode: boolean;
  hasHeaders?: boolean;
  firstRowData?: (string | number)[];
  showHeaderWarning?: boolean;
  /** Optional extended field definitions (includes vendor custom fields). Defaults to SALES_FIELD_DEFINITIONS. */
  fieldDefinitions?: FieldDefinition[];
}

export default function ColumnMapper({
  mappings,
  onMappingsChange,
  onConfirm,
  onCancel,
  isBatchMode,
  hasHeaders = true,
  firstRowData = [],
  showHeaderWarning = false,
  fieldDefinitions,
}: ColumnMapperProps) {
  const activeFieldDefs = fieldDefinitions ?? SALES_FIELD_DEFINITIONS;
  const [localMappings, setLocalMappings] = useState<ColumnMapping[]>(mappings);

  const handleMappingChange = (excelColumn: string, fieldKey: string | null) => {
    const updated = localMappings.map(m => {
      if (m.excelColumn === excelColumn) {
        return {
          ...m,
          fieldKey,
          confidence: fieldKey ? 1.0 : 0,
          suggested: false
        };
      }
      // Clear this fieldKey from other columns if it was selected
      if (fieldKey && m.fieldKey === fieldKey && m.excelColumn !== excelColumn) {
        return {
          ...m,
          fieldKey: null,
          confidence: 0,
          suggested: false
        };
      }
      return m;
    });

    logger.log('Updated mappings after change:', updated);
    setLocalMappings(updated);
  };

  const handleConfirm = () => {
    logger.log('Confirming mappings:', localMappings);
    logger.log('Mapped fields:', mappedFieldKeys);
    logger.log('Missing fields:', missingFields);
    onMappingsChange(localMappings);
    onConfirm(localMappings);
  };

  // Get list of unmapped required fields
  const mappedFieldKeys = new Set(localMappings.filter(m => m.fieldKey).map(m => m.fieldKey!));
  
  // Check name field requirements: either (first_name AND last_name) OR full_name
  const hasFullName = mappedFieldKeys.has('full_name');
  const hasFirstName = mappedFieldKeys.has('first_name');
  const hasLastName = mappedFieldKeys.has('last_name');
  const hasValidNameFields = hasFullName || (hasFirstName && hasLastName);
  
  const missingFields = activeFieldDefs.filter(field => {
    // Vendor is only required in batch mode
    if (field.key === 'vendor' && !isBatchMode) return false;
    // Address and City are only required in batch mode
    if ((field.key === 'address' || field.key === 'city') && !isBatchMode) return false;
    // Name fields have special handling
    if (field.key === 'first_name' || field.key === 'last_name') {
      return !hasValidNameFields;
    }
    // Full name is never required (it's an alternative)
    if (field.key === 'full_name') return false;
    return field.required && !mappedFieldKeys.has(field.key);
  });

  const canConfirm = missingFields.length === 0 && hasValidNameFields;

  // Get confidence icon
  const getConfidenceIcon = (confidence: number, suggested: boolean) => {
    if (!suggested || confidence === 0) {
      return <HelpCircle className="w-4 h-4 text-muted-foreground" />;
    }
    if (confidence >= 0.9) {
      return <CheckCircle2 className="w-4 h-4 text-primary" />;
    }
    if (confidence >= 0.75) {
      return <AlertCircle className="w-4 h-4 text-secondary" />;
    }
    return <HelpCircle className="w-4 h-4 text-muted-foreground" />;
  };

  // Get available fields for dropdown (excluding already mapped ones)
  const getAvailableFields = (currentMapping: ColumnMapping): FieldDefinition[] => {
    return activeFieldDefs.filter(field => {
      return !mappedFieldKeys.has(field.key) || field.key === currentMapping.fieldKey;
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Map Excel Columns to Fields</h3>
        <p className="text-sm text-muted-foreground">
          {hasHeaders 
            ? 'Review and confirm the suggested field mappings. Fields marked with high confidence are auto-suggested based on column names.'
            : 'Map each column to the appropriate field. Sample data from the first row is shown to help identify columns.'
          }
        </p>
      </div>

      {!hasHeaders && (
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <HelpCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-primary">File Without Headers</h4>
              <p className="text-sm text-primary mt-1">
                Your file doesn&apos;t have headers. Use the sample data from the first row to identify which column contains which data.
                Columns are labeled as Column A, Column B, etc.
              </p>
            </div>
          </div>
        </div>
      )}

      {showHeaderWarning && !hasHeaders && (
        <div className="bg-secondary/10 border border-secondary/30 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-secondary mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-secondary">First Row Looks Like Headers</h4>
              <p className="text-sm text-secondary mt-1">
                The first row appears to contain header-like text (e.g., &quot;Name&quot;, &quot;Date&quot;, &quot;Amount&quot;). 
                If your file actually has headers, please go back and uncheck &quot;My file doesn&apos;t have headers&quot; 
                to ensure proper data parsing.
              </p>
            </div>
          </div>
        </div>
      )}

      {hasFullName && (
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-primary">Full Name Will Be Auto-Split</h4>
              <p className="text-sm text-primary mt-1">
                The Full Name field will be automatically split into First Name and Last Name. 
                Supported formats: &quot;First Last&quot;, &quot;Last, First&quot;, or &quot;First Middle Last&quot;.
                {(hasFirstName || hasLastName) && (
                  <span className="block mt-1 font-medium">
                    Note: Full Name will override any separate {hasFirstName && 'First Name'}{hasFirstName && hasLastName && ' and '}{hasLastName && 'Last Name'} mappings.
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {missingFields.length > 0 && (
        <div className="bg-secondary/10 border border-secondary/30 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-secondary mt-0.5" />
            <div>
              <h4 className="font-medium text-secondary">Missing Required Fields</h4>
              <p className="text-sm text-secondary mt-1">
                Please map the following required fields: {missingFields.map(f => f.label).join(', ')}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10"></TableHead>
              <TableHead>Excel Column</TableHead>
              {!hasHeaders && <TableHead>Sample Data</TableHead>}
              <TableHead>Maps To</TableHead>
              <TableHead className="w-32">Confidence</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {localMappings.map((mapping) => {
              const availableFields = getAvailableFields(mapping);
              
              // Safety check - skip invalid mappings
              if (!mapping || !mapping.excelColumn) {
                logger.warn('Invalid mapping detected:', mapping);
                return null;
              }

              return (
                <TableRow key={mapping.excelColumn}>
                  <TableCell>
                    {getConfidenceIcon(mapping.confidence, mapping.suggested)}
                  </TableCell>
                  <TableCell className="font-medium">
                    {mapping.excelColumn}
                  </TableCell>
                  {!hasHeaders && (
                    <TableCell className="text-muted-foreground">
                      {(() => {
                        // Extract column index from "Column A" format
                        if (!mapping.excelColumn) return <span className="text-muted-foreground">-</span>;
                        
                        const match = mapping.excelColumn.match(/Column ([A-Z]+)/);
                        if (match) {
                          const letters = match[1];
                          let index = 0;
                          for (let i = 0; i < letters.length; i++) {
                            index = index * 26 + (letters.charCodeAt(i) - 64);
                          }
                          index -= 1; // Convert to 0-based
                          const sample = firstRowData[index];
                          if (sample !== undefined && sample !== null && sample !== '') {
                            return <span className="font-mono text-sm">&quot;{String(sample)}&quot;</span>;
                          }
                        }
                        return <span className="text-muted-foreground">-</span>;
                      })()}
                    </TableCell>
                  )}
                  <TableCell>
                    <Select
                      value={mapping.fieldKey || 'none'}
                      onValueChange={(value) => 
                        handleMappingChange(mapping.excelColumn, value === 'none' ? null : value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select field..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">
                          <span className="text-muted-foreground">Don&apos;t import</span>
                        </SelectItem>
                        {availableFields.map(field => {
                          // Check if field is required in current mode
                          const isRequiredInMode = field.required && 
                            !(field.key === 'vendor' && !isBatchMode) &&
                            !((field.key === 'address' || field.key === 'city') && !isBatchMode);
                          
                          return (
                            <SelectItem key={field.key} value={field.key}>
                              {field.label} {isRequiredInMode ? '*' : ''}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    {mapping.confidence > 0 && mapping.suggested && (
                      <div className="flex items-center gap-2">
                        <div className="h-2 flex-1 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              mapping.confidence >= 0.9 ? 'bg-primary' :
                              mapping.confidence >= 0.75 ? 'bg-secondary' :
                              'bg-muted-foreground'
                            }`}
                            style={{ width: `${mapping.confidence * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {Math.round(mapping.confidence * 100)}%
                        </span>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-between items-center pt-4 border-t">
        <div className="text-sm text-muted-foreground">
          <span className="font-medium">{mappedFieldKeys.size}</span> of{' '}
          <span className="font-medium">{activeFieldDefs.filter(f => f.required).length}</span>{' '}
          required fields mapped
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!canConfirm}>
            Confirm Mappings
          </Button>
        </div>
      </div>
    </div>
  );
}
