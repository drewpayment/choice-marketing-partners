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

interface ColumnMapperProps {
  mappings: ColumnMapping[];
  onMappingsChange: (mappings: ColumnMapping[]) => void;
  onConfirm: () => void;
  onCancel: () => void;
  isBatchMode: boolean;
}

export default function ColumnMapper({
  mappings,
  onMappingsChange,
  onConfirm,
  onCancel,
  isBatchMode
}: ColumnMapperProps) {
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

    setLocalMappings(updated);
  };

  const handleConfirm = () => {
    onMappingsChange(localMappings);
    onConfirm();
  };

  // Get list of unmapped required fields
  const mappedFieldKeys = new Set(localMappings.filter(m => m.fieldKey).map(m => m.fieldKey!));
  const missingFields = SALES_FIELD_DEFINITIONS.filter(field => {
    // Vendor is only required in batch mode
    if (field.key === 'vendor' && !isBatchMode) return false;
    // Address and City are only required in batch mode
    if ((field.key === 'address' || field.key === 'city') && !isBatchMode) return false;
    return field.required && !mappedFieldKeys.has(field.key);
  });

  const canConfirm = missingFields.length === 0;

  // Get confidence icon
  const getConfidenceIcon = (confidence: number, suggested: boolean) => {
    if (!suggested || confidence === 0) {
      return <HelpCircle className="w-4 h-4 text-gray-400" />;
    }
    if (confidence >= 0.9) {
      return <CheckCircle2 className="w-4 h-4 text-green-600" />;
    }
    if (confidence >= 0.75) {
      return <AlertCircle className="w-4 h-4 text-yellow-600" />;
    }
    return <HelpCircle className="w-4 h-4 text-gray-400" />;
  };

  // Get available fields for dropdown (excluding already mapped ones)
  const getAvailableFields = (currentMapping: ColumnMapping): FieldDefinition[] => {
    return SALES_FIELD_DEFINITIONS.filter(field => {
      return !mappedFieldKeys.has(field.key) || field.key === currentMapping.fieldKey;
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Map Excel Columns to Fields</h3>
        <p className="text-sm text-muted-foreground">
          Review and confirm the suggested field mappings. Fields marked with high confidence are auto-suggested based on column names.
        </p>
      </div>

      {missingFields.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-yellow-900">Missing Required Fields</h4>
              <p className="text-sm text-yellow-800 mt-1">
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
              <TableHead>Maps To</TableHead>
              <TableHead className="w-32">Confidence</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {localMappings.map((mapping) => {
              const availableFields = getAvailableFields(mapping);

              return (
                <TableRow key={mapping.excelColumn}>
                  <TableCell>
                    {getConfidenceIcon(mapping.confidence, mapping.suggested)}
                  </TableCell>
                  <TableCell className="font-medium">
                    {mapping.excelColumn}
                  </TableCell>
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
                        <div className="h-2 flex-1 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${
                              mapping.confidence >= 0.9 ? 'bg-green-600' :
                              mapping.confidence >= 0.75 ? 'bg-yellow-600' :
                              'bg-gray-400'
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
          <span className="font-medium">{SALES_FIELD_DEFINITIONS.filter(f => f.required).length}</span>{' '}
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
