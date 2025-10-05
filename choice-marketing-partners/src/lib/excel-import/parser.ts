/**
 * Excel/CSV file parsing utilities
 */

import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { ColumnMapping } from './field-mapper';

export interface ParsedData {
  headers: string[];
  rows: Record<string, unknown>[];
  totalRows: number;
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
 */
export async function parseFileHeaders(file: File, worksheetName?: string): Promise<string[]> {
  const extension = file.name.split('.').pop()?.toLowerCase();

  if (extension === 'csv') {
    return parseCSVHeaders(file);
  } else if (extension === 'xlsx' || extension === 'xls') {
    return parseExcelHeaders(file, worksheetName);
  } else {
    throw new Error('Unsupported file format. Please upload .xlsx, .xls, or .csv files.');
  }
}

/**
 * Parse CSV file headers
 */
async function parseCSVHeaders(file: File): Promise<string[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      preview: 1,
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.meta.fields) {
          resolve(results.meta.fields);
        } else {
          reject(new Error('Could not parse CSV headers'));
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
async function parseExcelHeaders(file: File, worksheetName?: string): Promise<string[]> {
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

  // First row is headers
  const headers = data[0] as string[];
  return headers.filter(h => h && h.toString().trim() !== '');
}

/**
 * Parse complete file with column mappings applied
 */
export async function parseFileWithMappings(
  file: File,
  mappings: ColumnMapping[],
  worksheetName?: string
): Promise<ParsedData> {
  const extension = file.name.split('.').pop()?.toLowerCase();

  if (extension === 'csv') {
    return parseCSVWithMappings(file, mappings);
  } else if (extension === 'xlsx' || extension === 'xls') {
    return parseExcelWithMappings(file, mappings, worksheetName);
  } else {
    throw new Error('Unsupported file format');
  }
}

/**
 * Parse CSV file with mappings
 */
async function parseCSVWithMappings(
  file: File,
  mappings: ColumnMapping[]
): Promise<ParsedData> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = applyMappingsToRows(results.data as Record<string, unknown>[], mappings);
        resolve({
          headers: results.meta.fields || [],
          rows,
          totalRows: rows.length
        });
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
  worksheetName?: string
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
  
  if (rawData.length < 2) {
    throw new Error('Excel file must have headers and at least one data row');
  }

  // Convert to objects with headers
  const headers = rawData[0] as string[];
  const dataRows = rawData.slice(1);
  
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

  const rows = applyMappingsToRows(rowObjects, mappings);

  return {
    headers,
    rows,
    totalRows: rows.length
  };
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
        mappedRow[mapping.fieldKey] = rawRow[mapping.excelColumn];
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
