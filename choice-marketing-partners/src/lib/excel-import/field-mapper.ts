/**
 * Field mapping utilities for Excel import
 * Handles fuzzy matching, aliases, and confidence scoring
 */

export interface FieldDefinition {
  key: string;
  label: string;
  required: boolean;
  aliases: string[];
  type: 'string' | 'number' | 'date';
}

export interface ColumnMapping {
  excelColumn: string;
  fieldKey: string | null;
  confidence: number; // 0-1 scale
  suggested: boolean;
}

export interface MappingMemory {
  [filePattern: string]: {
    [excelColumn: string]: string; // maps to fieldKey
  };
}

// Define the sales fields we need to map
export const SALES_FIELD_DEFINITIONS: FieldDefinition[] = [
  {
    key: 'sale_date',
    label: 'Sale Date',
    required: true,
    aliases: ['date', 'transaction date', 'sale date', 'saledate', 'sale_date', 'trans date'],
    type: 'date'
  },
  {
    key: 'first_name',
    label: 'First Name',
    required: true,
    aliases: ['first name', 'firstname', 'first_name', 'fname', 'customer first name', 'customer fname'],
    type: 'string'
  },
  {
    key: 'last_name',
    label: 'Last Name',
    required: true,
    aliases: ['last name', 'lastname', 'last_name', 'lname', 'customer last name', 'customer lname'],
    type: 'string'
  },
  {
    key: 'address',
    label: 'Address',
    required: false, // Can be filled in form for single invoice imports
    aliases: ['address', 'street', 'street address', 'customer address'],
    type: 'string'
  },
  {
    key: 'city',
    label: 'City',
    required: false, // Can be filled in form for single invoice imports
    aliases: ['city', 'town', 'customer city'],
    type: 'string'
  },
  {
    key: 'status',
    label: 'Status',
    required: true,
    aliases: ['status', 'sale status', 'state', 'transaction status'],
    type: 'string'
  },
  {
    key: 'amount',
    label: 'Amount',
    required: true,
    aliases: ['amount', 'total', 'price', 'sale amount', 'transaction amount', 'value'],
    type: 'number'
  },
  {
    key: 'employee_name',
    label: 'Employee/Agent Name',
    required: false,
    aliases: ['employee', 'agent', 'employee name', 'agent name', 'rep', 'rep name', 'sales rep'],
    type: 'string'
  },
  {
    key: 'employee_id',
    label: 'Employee/Agent ID',
    required: false,
    aliases: ['employee id', 'agent id', 'employee_id', 'agent_id', 'rep id', 'empid'],
    type: 'string'
  },
  {
    key: 'vendor',
    label: 'Vendor',
    required: false, // Required for batch, optional for detail page
    aliases: ['vendor', 'vendor name', 'company', 'supplier'],
    type: 'string'
  }
];

/**
 * Calculate Levenshtein distance between two strings
 * Used for fuzzy matching
 */
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,    // deletion
          dp[i][j - 1] + 1,    // insertion
          dp[i - 1][j - 1] + 1 // substitution
        );
      }
    }
  }

  return dp[m][n];
}

/**
 * Calculate similarity score between two strings (0-1 scale)
 */
function similarityScore(str1: string, str2: string): number {
  const normalized1 = str1.toLowerCase().trim().replace(/[_\s-]/g, '');
  const normalized2 = str2.toLowerCase().trim().replace(/[_\s-]/g, '');

  // Exact match after normalization
  if (normalized1 === normalized2) return 1.0;

  // Check if one contains the other
  if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
    return 0.85;
  }

  // Use Levenshtein distance
  const distance = levenshteinDistance(normalized1, normalized2);
  const maxLength = Math.max(normalized1.length, normalized2.length);
  
  if (maxLength === 0) return 1.0;
  
  return 1 - (distance / maxLength);
}

/**
 * Find best field match for an Excel column header
 */
export function findBestFieldMatch(
  excelColumn: string,
  fieldDefinitions: FieldDefinition[]
): { fieldKey: string | null; confidence: number } {
  let bestMatch: { fieldKey: string | null; confidence: number } = {
    fieldKey: null,
    confidence: 0
  };

  const normalized = excelColumn.toLowerCase().trim();

  for (const field of fieldDefinitions) {
    // Check exact match with field key
    if (field.key.toLowerCase() === normalized || field.label.toLowerCase() === normalized) {
      return { fieldKey: field.key, confidence: 1.0 };
    }

    // Check aliases
    for (const alias of field.aliases) {
      const score = similarityScore(excelColumn, alias);
      
      if (score > bestMatch.confidence) {
        bestMatch = {
          fieldKey: field.key,
          confidence: score
        };
      }
    }
  }

  return bestMatch;
}

/**
 * Generate initial column mappings from Excel headers
 */
export function generateColumnMappings(
  excelHeaders: string[],
  fieldDefinitions: FieldDefinition[],
  previousMappings?: MappingMemory,
  filePattern?: string
): ColumnMapping[] {
  const mappings: ColumnMapping[] = [];
  const usedFields = new Set<string>();

  for (const header of excelHeaders) {
    // Check if we have a previous mapping for this column
    const mapping: ColumnMapping = {
      excelColumn: header,
      fieldKey: null,
      confidence: 0,
      suggested: false
    };

    // Try to use previous mapping if available
    if (previousMappings && filePattern && previousMappings[filePattern]?.[header]) {
      const previousFieldKey = previousMappings[filePattern][header];
      if (!usedFields.has(previousFieldKey)) {
        mapping.fieldKey = previousFieldKey;
        mapping.confidence = 0.95; // High confidence for remembered mappings
        mapping.suggested = true;
        usedFields.add(previousFieldKey);
        mappings.push(mapping);
        continue;
      }
    }

    // Try fuzzy matching
    const match = findBestFieldMatch(header, fieldDefinitions);
    
    // Only auto-suggest if confidence is high and field not already used
    if (match.fieldKey && match.confidence >= 0.75 && !usedFields.has(match.fieldKey)) {
      mapping.fieldKey = match.fieldKey;
      mapping.confidence = match.confidence;
      mapping.suggested = true;
      usedFields.add(match.fieldKey);
    }

    mappings.push(mapping);
  }

  return mappings;
}

/**
 * Save column mappings to localStorage
 */
export function saveMappingMemory(
  filePattern: string,
  mappings: ColumnMapping[]
): void {
  try {
    const stored = localStorage.getItem('excel-import-mappings');
    const memory: MappingMemory = stored ? JSON.parse(stored) : {};

    memory[filePattern] = {};
    for (const mapping of mappings) {
      if (mapping.fieldKey) {
        memory[filePattern][mapping.excelColumn] = mapping.fieldKey;
      }
    }

    localStorage.setItem('excel-import-mappings', JSON.stringify(memory));
  } catch (error) {
    console.warn('Failed to save mapping memory:', error);
  }
}

/**
 * Load column mappings from localStorage
 */
export function loadMappingMemory(): MappingMemory | undefined {
  try {
    const stored = localStorage.getItem('excel-import-mappings');
    return stored ? JSON.parse(stored) : undefined;
  } catch (error) {
    console.warn('Failed to load mapping memory:', error);
    return undefined;
  }
}

/**
 * Generate a simple pattern from filename for mapping memory
 */
export function getFilePattern(filename: string): string {
  // Remove extension and numbers/dates to create a pattern
  return filename
    .toLowerCase()
    .replace(/\.(xlsx?|csv)$/i, '')
    .replace(/\d+/g, '')
    .replace(/[_\s-]+/g, '_')
    .trim();
}

/**
 * Validate that all required fields are mapped
 */
export function validateMappings(
  mappings: ColumnMapping[],
  fieldDefinitions: FieldDefinition[],
  isBatchMode: boolean
): { valid: boolean; missingFields: string[] } {
  const mappedFields = new Set(
    mappings.filter(m => m.fieldKey).map(m => m.fieldKey!)
  );

  const missingFields: string[] = [];

  for (const field of fieldDefinitions) {
    // Vendor is only required in batch mode
    if (field.key === 'vendor' && !isBatchMode) continue;
    
    // Address and City are required in batch mode, optional in single mode
    if ((field.key === 'address' || field.key === 'city') && !isBatchMode) continue;
    
    if (field.required && !mappedFields.has(field.key)) {
      missingFields.push(field.label);
    }
  }

  return {
    valid: missingFields.length === 0,
    missingFields
  };
}
