# Excel Import Feature for Sales Records

## Overview

This feature allows admin users to import sales records from Excel/CSV files with intelligent column mapping and validation. The system supports two modes:

1. **Single Invoice Import**: Import sales into a specific invoice (max 500 rows)
2. **Batch Upload**: Import sales across multiple vendors/employees (max 3000 rows)

## Features

### Multi-Worksheet Support
- **Automatic Detection**: Detects if Excel file has multiple worksheets
- **Worksheet Selector**: Shows list of worksheets with row counts
- **Smart Selection**: Auto-selects if only one worksheet exists
- **CSV Compatibility**: Seamlessly handles CSV files (no worksheet selection needed)

### Intelligent Column Mapping
- **Fuzzy Matching**: Automatically suggests field mappings based on column headers
- **Alias Recognition**: Recognizes common variations (e.g., "First Name", "firstname", "fname")
- **Memory**: Remembers previous mappings for similar file structures
- **Confidence Scoring**: Shows confidence levels for auto-suggested mappings
- **Manual Override**: Users can always manually adjust mappings

### Validation Modes

#### Batch Mode (Admin Tools)
- **Strict Validation**: All rows must be valid before import
- **Fail-Fast**: Shows line numbers of invalid rows
- **Vendor Required**: Vendor name must be provided for each row
- **Max 3000 rows per upload**

#### Single Mode (Invoice Detail Page)
- **Partial Import**: Invalid rows are imported with missing data
- **Form Validation**: Users must fix incomplete rows before submission
- **Vendor Inherited**: Uses the invoice's vendor
- **Max 500 rows per upload**

### Supported File Formats
- `.xlsx` (Excel 2007+)
- `.xls` (Legacy Excel)
- `.csv` (Comma-separated values)

### Required Fields
- Sale Date (various date formats supported)
- First Name
- Last Name
- Address
- City
- Status
- Amount (supports $, commas)

### Optional Fields
- Employee/Agent Name
- Employee/Agent ID
- Vendor (required for batch mode only)

## Components

### `ExcelImportDialog.tsx`
Main dialog component that orchestrates the import flow:
1. File upload
2. Worksheet selection (if multiple worksheets)
3. Column mapping
4. Data preview
5. Import confirmation

**Props:**
```typescript
{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'batch' | 'single';
  onImportComplete: (sales: InvoiceSaleFormData[], errors?: ParseError[]) => void;
  maxRows?: number;
}
```

### `ColumnMapper.tsx`
Interactive UI for mapping Excel columns to database fields with confidence indicators.

### `ImportPreview.tsx`
Preview imported data with validation errors highlighted. Different behavior for batch vs single mode.

### `WorksheetSelector.tsx`
Interactive UI for selecting which worksheet to import when Excel file contains multiple sheets. Shows worksheet names and row counts.

### `BatchSalesUpload.tsx`
Full-page component for admin batch upload with instructions and status tracking.

## Utilities

### `field-mapper.ts`
- Levenshtein distance algorithm for fuzzy matching
- Field definitions and aliases
- Mapping memory (localStorage)
- Validation logic

### `parser.ts`
- Excel/CSV parsing (xlsx, papaparse libraries)
- Data type validation and formatting
- Date parsing (handles Excel serial numbers)
- Number formatting (strips currency symbols)

## Usage

### In Invoice Detail Page

```tsx
import { InvoiceSalesTable } from '@/components/invoice';

// InvoiceSalesTable automatically includes the import button
<InvoiceSalesTable 
  sales={sales}
  onSalesChange={setSales}
/>
```

### Batch Upload Page

Navigate to: `/admin/tools/batch-upload`

Or programmatically:
```tsx
import { BatchSalesUpload } from '@/components/excel-import';

<BatchSalesUpload />
```

## API Endpoints

### `POST /api/sales/batch-upload`
**Auth Required**: Admin only

**Request Body:**
```json
{
  "sales": [
    {
      "sale_date": "2025-10-04",
      "first_name": "John",
      "last_name": "Doe",
      "address": "123 Main St",
      "city": "Denver",
      "status": "Accepted",
      "amount": 50.00,
      "vendor": "Nordic",
      "employee_name": "Drew Payment"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully processed 1 sales records",
  "count": 1
}
```

## Implementation Notes

### Field Mapping Algorithm

1. **Exact Match**: Direct match on field key or label (case-insensitive)
2. **Alias Match**: Check against predefined aliases
3. **Fuzzy Match**: Use Levenshtein distance for similarity scoring
4. **Confidence Threshold**: Only auto-suggest if confidence >= 75%
5. **No Duplicates**: Each field can only be mapped once

### Mapping Memory

Mappings are stored in `localStorage` keyed by file pattern:
- Filename is normalized (remove dates/numbers, lowercase)
- Example: "sales_report_2025.xlsx" → "sales_report"
- Persists across sessions
- User can always override suggestions

### Date Handling

Supports multiple formats:
- ISO: `2025-10-04`
- US: `10/04/2025`, `10-04-2025`
- Excel Serial Numbers: `45200` (converted automatically)

### Amount Formatting

Automatically cleans:
- Currency symbols: `$50.00` → `50.00`
- Thousands separators: `1,234.56` → `1234.56`
- Negative values: `-$50.00` → `-50.00`

## Error Handling

### Batch Mode Errors
```
Row 5: first_name is required
Row 7: Invalid date format for sale_date
Row 12: Could not parse number for amount
```

### Single Mode Warnings
Partial import proceeds with warnings. Invalid fields are set to default values:
- Missing strings → empty string
- Invalid numbers → 0
- Invalid dates → empty string

Users must fix these before submitting the form.

## Future Enhancements

- [ ] Implement actual database insert for batch uploads
- [ ] Add vendor/employee lookup and validation
- [ ] Support for updating existing sales (not just insert)
- [ ] Export template files with correct headers
- [ ] Duplicate detection
- [ ] Transaction rollback on partial failures
- [ ] Audit trail integration
- [ ] Progress tracking for large files
- [ ] Email notifications on completion
- [ ] Scheduled imports

## Testing

To test the feature:

1. **Prepare Test File**: Create Excel with columns like:
   ```
   Sale Date | First Name | Last Name | Address | City | Status | Amount
   10/4/2025 | John      | Doe       | 123 Main| Denver| Accepted| $50.00
   ```

2. **Single Mode**: 
   - Go to invoice detail page
   - Click "Import from Excel"
   - Map columns and import

3. **Batch Mode**:
   - Go to `/admin/tools/batch-upload`
   - Upload file with Vendor column
   - Map columns and import

## Troubleshooting

**Q: Columns not auto-mapping correctly?**
- Check header names match aliases in `SALES_FIELD_DEFINITIONS`
- Manually select correct fields
- Mapping will be remembered for next upload

**Q: Import fails with "Missing required fields"?**
- Ensure all required fields are mapped
- Check that Excel file has actual data (not just headers)

**Q: Date parsing errors?**
- Use consistent date format throughout file
- Recommended: YYYY-MM-DD or MM/DD/YYYY
- Excel dates should work automatically

**Q: Amount parsing errors?**
- Remove any non-numeric characters except $ , . -
- Use decimal point (.) not comma for decimals
- Negative amounts should have minus sign (-) prefix
