# Headerless File Import Feature

## Overview
Added support for importing Excel/CSV files without column headers. Users can now upload files where the first row contains data instead of headers, with columns mapped by position (Column A, B, C, etc.) and sample data displayed for identification. Additionally supports automatic name splitting from a single "Full Name" column.

## Implementation Date
October 5, 2025

## Changes Made

### 1. User Interface Updates

#### ExcelImportDialog.tsx
- **Added State Management:**
  - `hasHeaders`: Boolean flag to track whether file has headers (default: true)
  - `firstRowData`: Array to store first row values for headerless files
  - `showHeaderWarning`: Flag to show warning when first row looks like headers

- **Upload Screen Enhancement:**
  - Added checkbox: "My file doesn't have headers"
  - Dynamic requirements text based on checkbox state
  - Contextual help text explaining column position mapping

- **Date Format Screen:**
  - Optional checkbox to toggle header setting
  - Allows users to change their mind before proceeding to mapping

#### ColumnMapper.tsx
- **Enhanced Props:**
  - `hasHeaders`: Whether file has headers
  - `firstRowData`: First row sample data
  - `showHeaderWarning`: Flag to show header detection warning

- **UI Improvements:**
  - New "Sample Data" column for headerless files
  - Shows first row values to help identify columns
  - Blue info alert explaining headerless mode
  - Yellow warning when first row looks like headers
  - Dynamic description text based on file type

#### DateFormatSelector.tsx
- **Optional Header Toggle:**
  - Added optional checkbox to change header setting
  - Integrated seamlessly into date format selection step

### 2. Parser Layer Updates (parser.ts)

#### New Helper Function
```typescript
getExcelColumnLabel(index: number): string
```
- Generates Excel-style column labels (A, B, C, ..., Z, AA, AB, ...)
- Used when files don't have headers

#### Smart Header Detection
```typescript
detectPotentialHeaders(row: (string | number)[]): boolean
```
- Analyzes first row to determine if it likely contains headers
- Checks for:
  - Common header keywords (name, date, amount, etc.)
  - Text-heavy content
  - All-text rows (unusual for data)
- Returns true if row appears to be headers

#### Updated Functions
- **parseFileHeaders()**: 
  - New parameter: `hasHeaders` (default: true)
  - Returns object: `{ headers: string[], firstRow?: (string | number)[] }`
  - Generates column labels for headerless files
  - Captures first row data when needed

- **parseCSVHeaders()**: Enhanced to handle both header modes
- **parseExcelHeaders()**: Enhanced to handle both header modes
- **parseFileWithMappings()**: New parameter `hasHeaders`
- **parseCSVWithMappings()**: Converts array data to objects for headerless files
- **parseExcelWithMappings()**: Handles headerless Excel files

### 3. Field Mapper Updates (field-mapper.ts)

#### Enhanced Mapping Generation
```typescript
generateColumnMappings(..., isHeaderless: boolean = false)
```
- New parameter to skip fuzzy matching for headerless files
- Column labels (Column A, B, C) have no semantic meaning
- Still supports mapping memory for consistency

### 4. User Experience Flow

#### With Headers (Default)
1. User uploads file
2. System parses first row as headers
3. Fuzzy matching suggests field mappings
4. User confirms/adjusts mappings
5. Data imported

#### Without Headers (New)
1. User checks "My file doesn't have headers"
2. User uploads file
3. System generates Column A, B, C... labels
4. System captures first row as sample data
5. **Smart Detection**: Warns if first row looks like headers
6. User sees sample data in mapping screen
7. User manually maps columns using samples
8. Data imported (includes first row as data)

### 5. Warning System (Option C Implementation)

#### Upfront Detection (Step 1)
- If user checks "no headers" but first row contains header-like text
- Yellow warning displayed in mapping screen
- Suggests unchecking the box if file actually has headers

#### Post-Mapping Validation
- Existing validation in `validateAllRows()` catches data type issues
- Invalid dates, amounts, or required fields trigger errors
- Users can return to mapping and toggle header setting

#### Recovery Options
- User can go back to date format screen
- Toggle "My file doesn't have headers" checkbox
- Re-process file without re-uploading

## Technical Details

### Column Label Generation
Excel-style labels: A, B, C, ..., Z, AA, AB, ..., AZ, BA, BB, ...

Algorithm:
```
Column 0 = A
Column 1 = B
Column 25 = Z
Column 26 = AA
Column 27 = AB
```

### Sample Data Display
- Shows quoted strings: `"John Doe"`
- Shows numbers as-is: `1500.00`
- Shows empty cells as: `-`
- Positioned in "Sample Data" column between "Excel Column" and "Maps To"

### Memory Persistence
- Mapping memory still works for headerless files
- Stored by file pattern + column position
- Useful when repeatedly importing similar headerless files

## Testing Recommendations

### Test Cases
1. **CSV without headers** - verify column generation and sample display
2. **Excel without headers** - verify Excel worksheet handling
3. **Header detection** - upload headerless file with header-like first row
4. **Toggle header setting** - change mind on date format screen
5. **Mapping memory** - import same headerless file twice
6. **Validation errors** - ensure proper error messages for invalid data
7. **Mixed data types** - verify parsing of text, numbers, dates in first row

### Edge Cases
- Empty cells in first row
- Very wide files (many columns)
- Single column files
- Files with only one data row

## Benefits

1. **Flexibility**: Supports wider range of file formats
2. **User Control**: Clear checkbox gives users explicit choice
3. **Smart Warnings**: Helps users catch mistakes early
4. **Visual Guidance**: Sample data helps identify columns
5. **Recovery Options**: Multiple chances to correct header setting
6. **Backward Compatible**: Default behavior unchanged
7. **Name Splitting**: Handles files with combined name columns automatically

## New Feature: Full Name Splitting

### Overview
Some vendor files provide customer names in a single column instead of separate First/Last name columns. The system now supports mapping a "Full Name" column that will automatically split into First Name and Last Name.

### Supported Formats
- **"First Last"** → First: "First", Last: "Last"
- **"First Middle Last"** → First: "First", Last: "Middle Last"
- **"Last, First"** → First: "First", Last: "Last"
- **"First"** (single name) → First: "First", Last: ""

### Usage
1. Map a column to **"Full Name (will split to First/Last)"**
2. Green info box confirms the split will happen
3. System automatically populates both `first_name` and `last_name` fields
4. Can use Full Name OR separate First/Last fields (not both)

### Field Mapping Options
**Option 1:** Map separate columns
- Column K → First Name
- Column L → Last Name

**Option 2:** Map single column (auto-split)
- Column M → Full Name (will split to First/Last)

**Note:** If both Full Name AND separate First/Last are mapped, the Full Name split takes precedence.

## Future Enhancements

1. **Auto-detection**: Could automatically detect header presence
2. **Preview Mode**: Show first 3 rows before committing to header choice
3. **Column Templates**: Save common column orders for headerless files
4. **Bulk Validation**: Pre-validate all rows before mapping step

## Related Files

- `ExcelImportDialog.tsx` - Main import dialog component
- `ColumnMapper.tsx` - Column mapping UI
- `DateFormatSelector.tsx` - Date format selection with header toggle
- `parser.ts` - File parsing logic
- `field-mapper.ts` - Column mapping generation
- `ImportPreview.tsx` - Data preview (unchanged)

## Migration Notes

- No database changes required
- No breaking changes to existing API
- Existing imports continue to work as before
- Feature is opt-in via checkbox
