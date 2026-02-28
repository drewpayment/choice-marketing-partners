'use client';

import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload, FileSpreadsheet, AlertCircle } from 'lucide-react';
import {
  parseFileHeaders,
  parseFileWithMappings,
  validateAllRows,
  getExcelWorksheets,
  setDateFormat,
  detectPotentialHeaders,
  ParseError,
  WorksheetInfo,
  DateFormat
} from '@/lib/excel-import/parser';
import {
  generateColumnMappings,
  loadMappingMemory,
  saveMappingMemory,
  getFilePattern,
  validateMappings,
  ColumnMapping,
  SALES_FIELD_DEFINITIONS,
  buildExtendedFieldDefinitions,
  splitInvoiceData,
} from '@/lib/excel-import/field-mapper';
import ColumnMapper from './ColumnMapper';
import ImportPreview from './ImportPreview';
import WorksheetSelector from './WorksheetSelector';
import DateFormatSelector from './DateFormatSelector';
import { InvoiceSaleFormData, AgentWithSalesIds } from '@/types/database';
import { logger } from '@/lib/utils/logger'

type ImportStep = 'upload' | 'worksheet' | 'dateformat' | 'mapping' | 'preview' | 'complete';

interface ExcelImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'batch' | 'single';
  onImportComplete: (sales: InvoiceSaleFormData[], errors?: ParseError[]) => void;
  maxRows?: number;
  selectedAgent?: AgentWithSalesIds;
  vendorCustomFields?: Array<{ field_key: string; field_label: string }>;
}

export default function ExcelImportDialog({
  open,
  onOpenChange,
  mode,
  onImportComplete,
  maxRows = mode === 'batch' ? 3000 : 500,
  selectedAgent,
  vendorCustomFields,
}: ExcelImportDialogProps) {
  const [step, setStep] = useState<ImportStep>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [worksheets, setWorksheets] = useState<WorksheetInfo[]>([]);
  const [selectedWorksheet, setSelectedWorksheet] = useState<string | null>(null);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [parsedData, setParsedData] = useState<Record<string, string | number>[]>([]);
  const [filteredCount, setFilteredCount] = useState<number>(0);
  const [totalParsedCount, setTotalParsedCount] = useState<number>(0);
  const [errors, setErrors] = useState<ParseError[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasHeaders, setHasHeaders] = useState(true);
  const [firstRowData, setFirstRowData] = useState<(string | number)[]>([]);
  const [showHeaderWarning, setShowHeaderWarning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isBatchMode = mode === 'batch';
  const hasAgentSelected = !!selectedAgent;

  const handleReset = () => {
    setStep('upload');
    setFile(null);
    setWorksheets([]);
    setSelectedWorksheet(null);
    setDateFormat('auto'); // Reset global date format
    setHasHeaders(true);
    setFirstRowData([]);
    setShowHeaderWarning(false);
    setMappings([]);
    setParsedData([]);
    setErrors([]);
    setError(null);
  };

  const handleFileSelect = async (selectedFile: File) => {
    setError(null);
    setIsProcessing(true);

    try {
      // Validate file type
      const extension = selectedFile.name.split('.').pop()?.toLowerCase();
      if (!['xlsx', 'xls', 'csv'].includes(extension || '')) {
        throw new Error('Please upload a .xlsx, .xls, or .csv file');
      }

      setFile(selectedFile);

      // Check if Excel file has multiple worksheets
      if (extension === 'xlsx' || extension === 'xls') {
        const excelWorksheets = await getExcelWorksheets(selectedFile);
        
        if (excelWorksheets.length > 1) {
          // Multiple worksheets - show selector
          setWorksheets(excelWorksheets);
          setStep('worksheet');
          return;
        } else if (excelWorksheets.length === 1) {
          // Single worksheet - auto-select it
          setSelectedWorksheet(excelWorksheets[0].name);
        }
      }

      // Proceed to date format selection (CSV or single-sheet Excel)
      setStep('dateformat');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process file');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWorksheetSelect = async (worksheetName: string) => {
    if (!file) return;

    setSelectedWorksheet(worksheetName);
    setStep('dateformat');
  };

  const handleDateFormatSelect = async (selectedFormat: DateFormat) => {
    if (!file) return;

    setDateFormat(selectedFormat); // Set global format in parser
    setIsProcessing(true);

    try {
      await proceedToMapping(file, selectedWorksheet);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process file');
    } finally {
      setIsProcessing(false);
    }
  };

  const proceedToMapping = async (selectedFile: File, worksheetName: string | null) => {
    let fileHeaders: string[];
    let firstRow: (string | number)[] = [];

    if (hasHeaders) {
      // Parse headers normally
      const result = await parseFileHeaders(selectedFile, worksheetName || undefined, true);
      fileHeaders = result.headers;
      
      logger.log('Headers with hasHeaders=true:', fileHeaders);
      
      if (fileHeaders.length === 0) {
        throw new Error('No headers found in file');
      }
    } else {
      // For headerless files, generate column labels and get first row data
      const result = await parseFileHeaders(selectedFile, worksheetName || undefined, false);
      firstRow = result.firstRow || [];
      fileHeaders = result.headers;
      
      logger.log('Headers with hasHeaders=false:', fileHeaders);
      logger.log('First row data:', firstRow);
      
      if (fileHeaders.length === 0) {
        throw new Error('No columns found in file');
      }
      
      // Check if first row looks like headers
      const looksLikeHeaders = detectPotentialHeaders(firstRow);
      setShowHeaderWarning(looksLikeHeaders);
      
      setFirstRowData(firstRow);
    }

    // Generate initial mappings (extend with vendor custom fields if available)
    const fieldDefs = vendorCustomFields && vendorCustomFields.length > 0
      ? buildExtendedFieldDefinitions(vendorCustomFields)
      : SALES_FIELD_DEFINITIONS;
    const previousMappings = loadMappingMemory();
    const filePattern = getFilePattern(selectedFile.name);
    const initialMappings = generateColumnMappings(
      fileHeaders,
      fieldDefs,
      previousMappings,
      filePattern,
      !hasHeaders
    );

    logger.log('Generated mappings:', initialMappings);

    setMappings(initialMappings);
    setStep('mapping');
  };

  const handleMappingsConfirm = async (confirmedMappings: ColumnMapping[]) => {
    if (!file) return;

    setError(null);
    setIsProcessing(true);

    try {
      // Update state with confirmed mappings
      setMappings(confirmedMappings);
      
      // Validate mappings (use extended defs if vendor custom fields present)
      const fieldDefs = vendorCustomFields && vendorCustomFields.length > 0
        ? buildExtendedFieldDefinitions(vendorCustomFields)
        : SALES_FIELD_DEFINITIONS;
      const validation = validateMappings(confirmedMappings, fieldDefs, isBatchMode);
      if (!validation.valid) {
        throw new Error(`Missing required fields: ${validation.missingFields.join(', ')}`);
      }

      // Save mappings for future use
      const filePattern = getFilePattern(file.name);
      saveMappingMemory(filePattern, confirmedMappings);

      // Parse file with mappings (pass selected worksheet if Excel)
      const parsed = await parseFileWithMappings(file, confirmedMappings, selectedWorksheet || undefined, hasHeaders);

      // Check row limit
      if (parsed.totalRows > maxRows) {
        throw new Error(
          `File contains ${parsed.totalRows} rows, but the maximum allowed is ${maxRows}. ` +
          `Please split your data into smaller files.`
        );
      }

      if (parsed.totalRows === 0) {
        throw new Error('No data rows found in file');
      }

      // Validate all rows
      const validationResult = validateAllRows(parsed.rows, isBatchMode);

      let filteredData = validationResult.formatted;
      const originalCount = filteredData.length;

      // Filter by agent REP ID if one is selected (single invoice mode only)
      // Check if user mapped the employee_id (REP ID) field
      const repIdMapping = mappings.find(m => m.fieldKey === 'employee_id');
      const hasRepIdMapping = !!repIdMapping && repIdMapping.excelColumn;

      if (selectedAgent && !isBatchMode && hasRepIdMapping) {
        // Get agent's sales IDs
        const agentSalesIds = [
          selectedAgent.sales_id1,
          selectedAgent.sales_id2,
          selectedAgent.sales_id3
        ].filter((id): id is string => !!id && id.trim() !== ''); // Remove null/undefined/empty values

        if (agentSalesIds.length > 0) {
          filteredData = filteredData.filter(row => {
            const repId = String(row.employee_id || '').trim().toUpperCase();
            
            // Match if the row's REP ID matches any of the agent's sales IDs
            return agentSalesIds.some(salesId => 
              repId === salesId.trim().toUpperCase() ||
              repId.includes(salesId.trim().toUpperCase()) ||
              salesId.trim().toUpperCase().includes(repId)
            );
          });

          setFilteredCount(filteredData.length);
          setTotalParsedCount(originalCount);
        }
      }

      setParsedData(filteredData);
      setErrors(validationResult.errors);
      setStep('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse file');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImportConfirm = () => {
    const hasCustomFields = vendorCustomFields && vendorCustomFields.length > 0;

    // Convert parsed data to InvoiceSaleFormData format
    const salesData: InvoiceSaleFormData[] = parsedData.map(row => {
      const base: InvoiceSaleFormData = {
        sale_date: String(row.sale_date || ''),
        first_name: String(row.first_name || ''),
        last_name: String(row.last_name || ''),
        address: String(row.address || ''),
        city: String(row.city || ''),
        status: String(row.status || ''),
        amount: typeof row.amount === 'number' ? row.amount : 0,
        is_active: 1,
      };

      // If vendor has custom fields, separate them from built-in data
      if (hasCustomFields) {
        const split = splitInvoiceData(row as Record<string, unknown>);
        if (split.custom_fields) {
          base.custom_fields = JSON.parse(split.custom_fields);
        }
      }

      return base;
    });

    onImportComplete(salesData, errors);
    handleReset();
    onOpenChange(false);
  };

  const handleCancel = () => {
    handleReset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Import Sales from Excel
            <span className="text-sm font-normal text-muted-foreground ml-2">
              ({isBatchMode ? 'Batch Upload' : 'Single Invoice'} - Max {maxRows} rows)
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="mt-6">
          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-destructive">Error</h4>
                  <p className="text-sm text-destructive mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Upload */}
          {step === 'upload' && (
            <div className="space-y-6">
              {/* Warning when no agent is selected */}
              {!hasAgentSelected && !isBatchMode && (
                <div className="bg-secondary/10 border border-secondary/30 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-secondary mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-secondary">No Agent Selected</h4>
                      <p className="text-sm text-secondary mt-1">
                        You have not selected an agent for this pay statement. The import will include 
                        <strong> all records</strong> from the file, which may contain sales for multiple agents.
                      </p>
                      <p className="text-sm text-secondary mt-2">
                        <strong>Recommendation:</strong> Select an agent first, then map the REP ID field during import
                        to automatically filter sales to only that agent.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Agent filter info when agent is selected */}
              {hasAgentSelected && !isBatchMode && (
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-primary">Agent Selected: {selectedAgent?.name}</h4>
                      <p className="text-sm text-primary mt-1">
                        Agent Sales IDs: <strong>{[
                          selectedAgent?.sales_id1,
                          selectedAgent?.sales_id2,
                          selectedAgent?.sales_id3
                        ].filter(Boolean).join(', ') || 'None configured'}</strong>
                      </p>
                      <p className="text-sm text-primary mt-2">
                        During column mapping, <strong>map the REP ID field</strong> to automatically filter
                        records to only this agent&apos;s sales. If REP ID is not mapped, all records will be imported.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="text-center py-12">
                <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <FileSpreadsheet className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Upload Excel or CSV File</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Supported formats: .xlsx, .xls, .csv
                </p>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => {
                    const selectedFile = e.target.files?.[0];
                    if (selectedFile) {
                      handleFileSelect(selectedFile);
                    }
                  }}
                  className="hidden"
                />

                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                  size="lg"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {isProcessing ? 'Processing...' : 'Choose File'}
                </Button>

                {/* Headerless file checkbox */}
                <div className="mt-4 flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="no-headers"
                    checked={!hasHeaders}
                    onChange={(e) => setHasHeaders(!e.target.checked)}
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                  />
                  <label htmlFor="no-headers" className="text-sm font-medium cursor-pointer">
                    My file doesn&apos;t have headers
                  </label>
                </div>
                {!hasHeaders && (
                  <p className="text-xs text-muted-foreground mt-2 ml-6">
                    You&apos;ll map columns using their position (Column A, B, C...) and sample data from the first row.
                  </p>
                )}
              </div>

              <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                <h4 className="font-medium text-primary mb-2">Requirements:</h4>
                <ul className="text-sm text-primary space-y-1 ml-4">
                  <li>• {hasHeaders ? 'File must have a header row with column names' : 'First row will be treated as data (no headers expected)'}</li>
                  {isBatchMode ? (
                    <>
                      <li>• Required fields: Sale Date, First Name, Last Name, Address, City, Status, Amount, Vendor</li>
                      <li>• All fields must be present in batch uploads</li>
                    </>
                  ) : (
                    <>
                      <li>• Required fields: Sale Date, First Name, Last Name, Status, Amount</li>
                      <li>• Optional fields: Address, City, Employee/Agent (can be filled in form)</li>
                    </>
                  )}
                  <li>• Maximum {maxRows} rows per upload</li>
                  <li>• Dates should be in a recognizable format (MM/DD/YYYY or YYYY-MM-DD)</li>
                  <li>• Amounts can include currency symbols ($) and commas</li>
                </ul>
              </div>
            </div>
          )}

          {/* Step 2: Worksheet Selection (Excel files with multiple sheets) */}
          {step === 'worksheet' && file && (
            <WorksheetSelector
              worksheets={worksheets}
              fileName={file.name}
              onSelect={handleWorksheetSelect}
              onCancel={handleCancel}
            />
          )}

          {/* Step 3: Date Format Selection */}
          {step === 'dateformat' && file && (
            <DateFormatSelector
              onSelect={handleDateFormatSelect}
              onCancel={handleCancel}
              isProcessing={isProcessing}
              hasHeaders={hasHeaders}
              onHasHeadersChange={setHasHeaders}
            />
          )}

          {/* Step 4: Column Mapping */}
          {step === 'mapping' && (
            <ColumnMapper
              mappings={mappings}
              onMappingsChange={setMappings}
              onConfirm={handleMappingsConfirm}
              onCancel={handleCancel}
              isBatchMode={isBatchMode}
              hasHeaders={hasHeaders}
              firstRowData={firstRowData}
              showHeaderWarning={showHeaderWarning}
              fieldDefinitions={
                vendorCustomFields && vendorCustomFields.length > 0
                  ? buildExtendedFieldDefinitions(vendorCustomFields)
                  : undefined
              }
            />
          )}

          {/* Step 5: Preview */}
          {step === 'preview' && (
            <ImportPreview
              data={parsedData}
              errors={errors}
              isBatchMode={isBatchMode}
              onConfirm={handleImportConfirm}
              onCancel={handleCancel}
              onBack={() => setStep('mapping')}
              filteredCount={filteredCount}
              totalParsedCount={totalParsedCount}
              selectedAgentName={selectedAgent?.name}
              vendorCustomFields={vendorCustomFields}
              showRepIdWarning={
                !!selectedAgent &&
                !isBatchMode &&
                !mappings.find(m => m.fieldKey === 'employee_id' && m.excelColumn)
              }
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
