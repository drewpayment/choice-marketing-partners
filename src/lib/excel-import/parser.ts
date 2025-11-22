/**
 * Excel/CSV file parsing utilities
 */

import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { ColumnMapping } from './field-mapper';
import { logger } from '@/lib/utils/logger'

export interface ParsedData {
  headers: string[];
  rows: Record<string, unknown>[];
  totalRows: number;
  firstRow?: (string | number)[]; // For headerless files
}

export interface ParseError {
  row: number;
  field: string;
  value: unknown;
  message: string;
}

export interface WorksheetInfo {
  name: string;
  rowCount: number;
}

export type DateFormat = 'auto' | 'US' | 'ISO' | 'EU';

let globalDateFormat: DateFormat = 'auto';

/**
 * Generate Excel-style column labels (A, B, C, ..., Z, AA, AB, ...)
 */
function getExcelColumnLabel(index: number): string {
  let label = '';
  let num = index;
  
  while (num >= 0) {
    label = String.fromCharCode(65 + (num % 26)) + label;
    num = Math.floor(num / 26) - 1;
  }
  
  return `Column ${label}`;
}

/**
 * Detect if a row likely contains headers
 * Checks for text-heavy content and common header keywords
 */
export function detectPotentialHeaders(row: (string | number)[]): boolean {
  if (row.length === 0) return false;
  
  const headerKeywords = [
    'name', 'date', 'amount', 'total', 'price', 'address', 'city', 'status',
    'first', 'last', 'customer', 'sale', 'employee', 'vendor', 'id', 'type',
    'email', 'phone', 'number', 'value', 'quantity', 'description'
  ];
  
  let textCells = 0;
  let numericCells = 0;
  let headerLikeText = 0;
  
  for (const cell of row) {
    if (cell === null || cell === undefined || cell === '') continue;
    
    const cellStr = String(cell).toLowerCase().trim();
    
    if (typeof cell === 'string') {
      textCells++;
      
      // Check if cell contains header-like keywords
      if (headerKeywords.some(keyword => cellStr.includes(keyword))) {
        headerLikeText++;
      }
    } else if (typeof cell === 'number') {
      numericCells++;
    }
  }
  
  const totalCells = textCells + numericCells;
  if (totalCells === 0) return false;
  
  // Strong indicator: Most cells are text and contain header keywords
  if (headerLikeText >= totalCells * 0.5) return true;
  
  // Moderate indicator: All cells are text (unusual for data rows)
  if (textCells === totalCells && totalCells >= 3) return true;
  
  return false;
}

/**
 * Set the date format to use for parsing
 */
export function setDateFormat(format: DateFormat) {
  globalDateFormat = format;
}

/**
 * Parse date string based on format
 */
function parseDateString(dateStr: string, format: DateFormat): Date | null {
  const str = dateStr.trim();
  
  // Try ISO format first (YYYY-MM-DD)
  const isoMatch = str.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (isoMatch && (format === 'ISO' || format === 'auto')) {
    const [, year, month, day] = isoMatch;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(date.getTime())) return date;
  }
  
  // Try MM/DD/YYYY or DD/MM/YYYY
  const slashMatch = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (slashMatch) {
    const [, first, second, year] = slashMatch;
    const fullYear = year.length === 2 ? 2000 + parseInt(year) : parseInt(year);
    
    if (format === 'US' || format === 'auto') {
      // Try US format (MM/DD/YYYY)
      const date = new Date(fullYear, parseInt(first) - 1, parseInt(second));
      if (!isNaN(date.getTime()) && date.getMonth() === parseInt(first) - 1) {
        return date;
      }
    }
    
    if (format === 'EU' || format === 'auto') {
      // Try EU format (DD/MM/YYYY)
      const date = new Date(fullYear, parseInt(second) - 1, parseInt(first));
      if (!isNaN(date.getTime()) && date.getMonth() === parseInt(second) - 1) {
        return date;
      }
    }
  }
  
  // Fall back to JavaScript Date parser
  if (format === 'auto') {
    const date = new Date(str);
    if (!isNaN(date.getTime())) return date;
  }
  
  return null;
}

/**
 * Get list of worksheets from Excel file
 */
export async function getExcelWorksheets(file: File): Promise<WorksheetInfo[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  
  return workbook.SheetNames.map(name => {
    const worksheet = workbook.Sheets[name];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];
    
    // Count only non-empty rows (excluding header)
    let nonEmptyRows = 0;
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      // Check if row has any non-empty values
      const hasData = Array.isArray(row) && row.some(cell => 
        cell !== null && cell !== undefined && cell !== ''
      );
      if (hasData) {
        nonEmptyRows++;
      }
    }
    
    return {
      name,
      rowCount: nonEmptyRows
    };
  });
}

/**
 * Parse Excel or CSV file and extract headers
 * @param file - The file to parse
 * @param worksheetName - Optional worksheet name for Excel files
 * @param hasHeaders - Whether the file has a header row (default: true)
 * @returns Object with headers and optionally firstRow for headerless files
 */
export async function parseFileHeaders(
  file: File,
  worksheetName?: string,
  hasHeaders: boolean = true
): Promise<{ headers: string[]; firstRow?: (string | number)[] }> {
  const extension = file.name.split('.').pop()?.toLowerCase();

  if (extension === 'csv') {
    return parseCSVHeaders(file, hasHeaders);
  } else if (extension === 'xlsx' || extension === 'xls') {
    return parseExcelHeaders(file, worksheetName, hasHeaders);
  } else {
    throw new Error('Unsupported file format. Please upload .xlsx, .xls, or .csv files.');
  }
}

/**
 * Parse CSV file headers
 */
async function parseCSVHeaders(
  file: File,
  hasHeaders: boolean = true
): Promise<{ headers: string[]; firstRow?: (string | number)[] }> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      preview: hasHeaders ? 1 : 2, // Get 2 rows if no headers (need first row as data)
      header: false, // Always parse as array to handle both cases
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data as (string | number)[][];
        
        if (data.length === 0) {
          reject(new Error('Could not parse CSV - file is empty'));
          return;
        }

        if (hasHeaders) {
          // First row is headers
          const headers = data[0].map(h => String(h).trim()).filter(h => h !== '');
          resolve({ headers });
        } else {
          // Generate column labels based on number of columns in first row
          const firstRow = data[0];
          // Generate labels for all columns (including empty ones)
          // Filter out any undefined/null values from the array before mapping
          const validFirstRow = Array.isArray(firstRow) ? firstRow : [];
          const headers = validFirstRow.map((_, index) => {
            const label = getExcelColumnLabel(index);
            logger.log(`Generated label for index ${index}:`, label);
            return label;
          }).filter(h => h !== undefined && h !== null);
          
          logger.log('CSV firstRow:', validFirstRow);
          logger.log('CSV generated headers:', headers);
          
          resolve({ headers, firstRow: validFirstRow });
        }
      },
      error: (error) => {
        reject(new Error(`CSV parsing error: ${error.message}`));
      }
    });
  });
}

/**
 * Parse Excel file headers
 */
async function parseExcelHeaders(
  file: File,
  worksheetName?: string,
  hasHeaders: boolean = true
): Promise<{ headers: string[]; firstRow?: (string | number)[] }> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  
  // Use specified worksheet or first sheet
  const sheetName = worksheetName || workbook.SheetNames[0];
  if (!sheetName || !workbook.Sheets[sheetName]) {
    throw new Error(worksheetName 
      ? `Worksheet "${worksheetName}" not found in Excel file`
      : 'Excel file has no sheets'
    );
  }

  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];
  
  if (data.length === 0) {
    throw new Error('Excel file is empty');
  }

  if (hasHeaders) {
    // First row is headers
    const headers = (data[0] as (string | number)[]).map(h => String(h).trim()).filter(h => h !== '');
    return { headers };
  } else {
    // Generate column labels based on number of columns in first row
    const firstRow = data[0] as (string | number)[];
    const validFirstRow = Array.isArray(firstRow) ? firstRow : [];
    const headers = validFirstRow.map((_, index) => {
      const label = getExcelColumnLabel(index);
      logger.log(`Excel: Generated label for index ${index}:`, label);
      return label;
    }).filter(h => h !== undefined && h !== null);
    
    logger.log('Excel firstRow:', validFirstRow);
    logger.log('Excel generated headers:', headers);
    
    return { headers, firstRow: validFirstRow };
  }
}

/**
 * Parse complete file with column mappings applied
 */
export async function parseFileWithMappings(
  file: File,
  mappings: ColumnMapping[],
  worksheetName?: string,
  hasHeaders: boolean = true
): Promise<ParsedData> {
  const extension = file.name.split('.').pop()?.toLowerCase();

  if (extension === 'csv') {
    return parseCSVWithMappings(file, mappings, hasHeaders);
  } else if (extension === 'xlsx' || extension === 'xls') {
    return parseExcelWithMappings(file, mappings, worksheetName, hasHeaders);
  } else {
    throw new Error('Unsupported file format');
  }
}

/**
 * Parse CSV file with mappings
 */
async function parseCSVWithMappings(
  file: File,
  mappings: ColumnMapping[],
  hasHeaders: boolean = true
): Promise<ParsedData> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: hasHeaders, // Use header mode only if file has headers
      skipEmptyLines: true,
      complete: (results) => {
        try {
          let rowObjects: Record<string, unknown>[];
          
          if (hasHeaders) {
            // Standard path - Papa returns objects with header keys
            rowObjects = results.data as Record<string, unknown>[];
          } else {
            // Headerless path - Papa returns arrays, convert to objects with column labels
            const arrayRows = results.data as unknown[][];
            logger.log('CSV arrayRows (first 3):', arrayRows.slice(0, 3));
            
            rowObjects = arrayRows.map((row, rowIndex) => {
              if (!Array.isArray(row)) {
                logger.warn(`Row ${rowIndex} is not an array:`, row);
                return {};
              }
              
              const obj: Record<string, unknown> = {};
              row.forEach((cell, index) => {
                const columnLabel = getExcelColumnLabel(index);
                obj[columnLabel] = cell;
              });
              return obj;
            });
          }
          
          logger.log('CSV rowObjects (first 3):', rowObjects.slice(0, 3));
          logger.log('Mappings to apply:', mappings);
          
          const rows = applyMappingsToRows(rowObjects, mappings);
          
          logger.log('CSV mapped rows (first 3):', rows.slice(0, 3));
          
          resolve({
            headers: hasHeaders ? (results.meta.fields || []) : mappings.map(m => m.excelColumn),
            rows,
            totalRows: rows.length
          });
        } catch (error) {
          logger.error('Error in parseCSVWithMappings:', error);
          reject(error);
        }
      },
      error: (error) => {
        reject(new Error(`CSV parsing error: ${error.message}`));
      }
    });
  });
}

/**
 * Parse Excel file with mappings
 */
async function parseExcelWithMappings(
  file: File,
  mappings: ColumnMapping[],
  worksheetName?: string,
  hasHeaders: boolean = true
): Promise<ParsedData> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  
  // Use specified worksheet or first sheet
  const sheetName = worksheetName || workbook.SheetNames[0];
  if (!sheetName || !workbook.Sheets[sheetName]) {
    throw new Error(worksheetName 
      ? `Worksheet "${worksheetName}" not found in Excel file`
      : 'Excel file has no sheets'
    );
  }

  const worksheet = workbook.Sheets[sheetName];
  const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];
  
  if (rawData.length < 1) {
    throw new Error('Excel file must have at least one row');
  }

  let headers: string[];
  let dataRows: unknown[][];
  
  if (hasHeaders) {
    if (rawData.length < 2) {
      throw new Error('Excel file must have headers and at least one data row');
    }
    // First row is headers, rest is data
    headers = (rawData[0] as (string | number)[]).map(h => String(h));
    dataRows = rawData.slice(1);
  } else {
    // All rows are data, generate column labels
    const columnCount = Math.max(...rawData.map(row => (row as unknown[]).length));
    headers = Array.from({ length: columnCount }, (_, i) => getExcelColumnLabel(i));
    dataRows = rawData;
  }
  
  // Filter out completely empty rows
  const nonEmptyRows = dataRows.filter(row => {
    return Array.isArray(row) && row.some(cell => 
      cell !== null && cell !== undefined && cell !== ''
    );
  });
  
  const rowObjects = nonEmptyRows.map(row => {
    const obj: Record<string, unknown> = {};
    headers.forEach((header, index) => {
      obj[header] = row[index];
    });
    return obj;
  });

  logger.log('Excel rowObjects (first 3):', rowObjects.slice(0, 3));
  logger.log('Excel mappings to apply:', mappings);

  const rows = applyMappingsToRows(rowObjects, mappings);

  logger.log('Excel mapped rows (first 3):', rows.slice(0, 3));

  return {
    headers,
    rows,
    totalRows: rows.length
  };
}

/**
 * Split a full name into first and last name
 * Handles common formats: "First Last", "Last, First", "First Middle Last"
 */
function splitFullName(fullName: string): { first_name: string; last_name: string } {
  const trimmed = fullName.trim();
  
  // Handle "Last, First" format
  if (trimmed.includes(',')) {
    const parts = trimmed.split(',').map(p => p.trim());
    return {
      first_name: parts[1] || '',
      last_name: parts[0] || ''
    };
  }
  
  // Handle "First Last" or "First Middle Last" format
  const parts = trimmed.split(/\s+/);
  
  if (parts.length === 0) {
    return { first_name: '', last_name: '' };
  } else if (parts.length === 1) {
    return { first_name: parts[0], last_name: '' };
  } else {
    // First word is first name, everything else is last name
    return {
      first_name: parts[0],
      last_name: parts.slice(1).join(' ')
    };
  }
}

/**
 * Apply column mappings to raw row data
 */
function applyMappingsToRows(
  rawRows: Record<string, unknown>[],
  mappings: ColumnMapping[]
): Record<string, unknown>[] {
  return rawRows.map(rawRow => {
    const mappedRow: Record<string, unknown> = {};
    
    for (const mapping of mappings) {
      if (mapping.fieldKey && mapping.excelColumn in rawRow) {
        // Special handling for full_name - split into first_name and last_name
        if (mapping.fieldKey === 'full_name') {
          const fullName = String(rawRow[mapping.excelColumn] || '');
          const { first_name, last_name } = splitFullName(fullName);
          mappedRow['first_name'] = first_name;
          mappedRow['last_name'] = last_name;
        } else {
          mappedRow[mapping.fieldKey] = rawRow[mapping.excelColumn];
        }
      }
    }
    
    return mappedRow;
  });
}

/**
 * Validate data types and format values
 */
export function validateAndFormatRow(
  row: Record<string, unknown>,
  rowNumber: number,
  isSingleMode = false
): { valid: boolean; errors: ParseError[]; formatted: Record<string, string | number> } {
  const errors: ParseError[] = [];
  const formatted: Record<string, string | number> = {};

  // Core required fields (always required)
  const coreRequiredFields = ['sale_date', 'first_name', 'last_name', 'status', 'amount'];
  
  // Fields that are optional in single mode but required in batch
  const conditionalFields = ['address', 'city'];
  
  const requiredFields = isSingleMode 
    ? coreRequiredFields 
    : [...coreRequiredFields, ...conditionalFields];

  for (const field of requiredFields) {
    const value = row[field];
    
    if (value === undefined || value === null || value === '') {
      errors.push({
        row: rowNumber,
        field,
        value,
        message: `${field} is required`
      });
      continue;
    }

    // Type-specific validation and formatting
    switch (field) {
      case 'sale_date':
        const dateResult = validateAndFormatDate(value, rowNumber, field);
        if (dateResult.error) {
          errors.push(dateResult.error);
        } else if (dateResult.formatted) {
          formatted[field] = dateResult.formatted;
        }
        break;

      case 'amount':
        const amountResult = validateAndFormatNumber(value, rowNumber, field);
        if (amountResult.error) {
          errors.push(amountResult.error);
        } else if (amountResult.formatted !== undefined) {
          formatted[field] = amountResult.formatted;
        }
        break;

      default:
        // String fields
        formatted[field] = String(value).trim();
        break;
    }
  }

  // Optional fields (or conditionally optional in single mode)
  if (row.address) {
    formatted.address = String(row.address).trim();
  }
  if (row.city) {
    formatted.city = String(row.city).trim();
  }
  if (row.employee_name) {
    formatted.employee_name = String(row.employee_name).trim();
  }
  if (row.employee_id) {
    formatted.employee_id = String(row.employee_id).trim();
  }
  if (row.vendor) {
    formatted.vendor = String(row.vendor).trim();
  }

  return {
    valid: errors.length === 0,
    errors,
    formatted
  };
}

/**
 * Validate and format date value
 */
function validateAndFormatDate(
  value: unknown,
  rowNumber: number,
  field: string
): { formatted?: string; error?: ParseError } {
  try {
    let date: Date | null = null;

    // Handle Excel date serial number
    if (typeof value === 'number') {
      // XLSX.SSF.parse_date_code returns an object like { y: 2025, m: 9, d: 7 }
      const excelDateObj = XLSX.SSF.parse_date_code(value);
      if (excelDateObj) {
        // Convert to JavaScript Date (month is 1-indexed in the object, 0-indexed in Date)
        date = new Date(excelDateObj.y, excelDateObj.m - 1, excelDateObj.d);
      }
    } else if (typeof value === 'string') {
      // Use the configured date format
      date = parseDateString(value, globalDateFormat);
      
      // If parsing failed, try to fallback to native parser
      if (!date) {
        const nativeDate = new Date(value);
        if (!isNaN(nativeDate.getTime())) {
          date = nativeDate;
        }
      }
    } else if (value instanceof Date) {
      date = value;
    }
    
    if (!date || isNaN(date.getTime())) {
      return {
        error: {
          row: rowNumber,
          field,
          value,
          message: `Invalid date format for ${field}. Expected format: ${
            globalDateFormat === 'US' ? 'MM/DD/YYYY' :
            globalDateFormat === 'EU' ? 'DD/MM/YYYY' :
            globalDateFormat === 'ISO' ? 'YYYY-MM-DD' :
            'MM/DD/YYYY or YYYY-MM-DD'
          }. Received: ${typeof value === 'string' || typeof value === 'number' ? value : typeof value}`
        }
      };
    }

    // Format as YYYY-MM-DD
    const formatted = date.toISOString().split('T')[0];
    return { formatted };
  } catch (error) {
    return {
      error: {
        row: rowNumber,
        field,
        value,
        message: `Could not parse date for ${field}. Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    };
  }
}

/**
 * Validate and format number value
 */
function validateAndFormatNumber(
  value: unknown,
  rowNumber: number,
  field: string
): { formatted?: number; error?: ParseError } {
  let num: number;

  if (typeof value === 'number') {
    num = value;
  } else if (typeof value === 'string') {
    // Remove currency symbols and commas
    const cleaned = value.replace(/[$,]/g, '').trim();
    num = parseFloat(cleaned);
  } else {
    return {
      error: {
        row: rowNumber,
        field,
        value,
        message: `Invalid number format for ${field}`
      }
    };
  }

  if (isNaN(num)) {
    return {
      error: {
        row: rowNumber,
        field,
        value,
        message: `Could not parse number for ${field}`
      }
    };
  }

  return { formatted: num };
}

/**
 * Validate all rows for batch upload
 */
export function validateAllRows(
  rows: Record<string, unknown>[],
  isBatchMode: boolean
): { valid: boolean; errors: ParseError[]; formatted: Record<string, string | number>[] } {
  const allErrors: ParseError[] = [];
  const formatted: Record<string, string | number>[] = [];

  rows.forEach((row, index) => {
    const rowNumber = index + 2; // +2 because Excel is 1-indexed and has header row
    const result = validateAndFormatRow(row, rowNumber, !isBatchMode); // Pass true for single mode
    
    allErrors.push(...result.errors);
    formatted.push(result.formatted);

    // Batch mode specific validation
    if (isBatchMode && !row.vendor) {
      allErrors.push({
        row: rowNumber,
        field: 'vendor',
        value: row.vendor,
        message: 'vendor is required for batch uploads'
      });
    }
  });

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
    formatted
  };
}
