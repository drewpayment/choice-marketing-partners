'use client';

import { useState } from 'react';
import { InvoiceSaleFormData, AgentWithSalesIds } from '@/types/database';
import { VendorFieldDefinition } from '@/lib/repositories/VendorFieldRepository';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload } from 'lucide-react';
import ExcelImportDialog from '@/components/excel-import/ExcelImportDialog';
import { ParseError } from '@/lib/excel-import/parser';
import { logger } from '@/lib/utils/logger'

/**
 * Editable column definition used internally by the sales table.
 * Built from vendor field config or hardcoded defaults.
 */
interface EditableColumn {
  key: string
  label: string
  source: 'builtin' | 'custom'
  type: 'date' | 'text' | 'currency'
}

/** Default columns matching the current hardcoded table when no vendor config exists */
const DEFAULT_EDIT_COLUMNS: EditableColumn[] = [
  { key: 'sale_date', label: 'Sale Date', source: 'builtin', type: 'date' },
  { key: 'first_name', label: 'First Name', source: 'builtin', type: 'text' },
  { key: 'last_name', label: 'Last Name', source: 'builtin', type: 'text' },
  { key: 'address', label: 'Address', source: 'builtin', type: 'text' },
  { key: 'city', label: 'City', source: 'builtin', type: 'text' },
  { key: 'status', label: 'Status', source: 'builtin', type: 'text' },
  { key: 'amount', label: 'Amount', source: 'builtin', type: 'currency' },
];

/**
 * Convert vendor field definitions into editable columns.
 * Expands `full_name` into separate first_name + last_name inputs
 * since the form needs both values for the database.
 */
function resolveEditableColumns(vendorFields: VendorFieldDefinition[]): EditableColumn[] {
  const columns: EditableColumn[] = [];

  for (const field of vendorFields) {
    if (field.field_key === 'full_name') {
      // Expand into two inputs for the form
      columns.push({ key: 'first_name', label: 'First Name', source: 'builtin', type: 'text' });
      columns.push({ key: 'last_name', label: 'Last Name', source: 'builtin', type: 'text' });
    } else if (field.field_key === 'amount') {
      columns.push({ key: 'amount', label: field.field_label, source: 'builtin', type: 'currency' });
    } else if (field.field_key === 'sale_date') {
      columns.push({ key: 'sale_date', label: field.field_label, source: 'builtin', type: 'date' });
    } else if (field.source === 'builtin') {
      columns.push({ key: field.field_key, label: field.field_label, source: 'builtin', type: 'text' });
    } else {
      // Custom field
      columns.push({ key: field.field_key, label: field.field_label, source: 'custom', type: 'text' });
    }
  }

  return columns;
}

interface InvoiceSalesTableProps {
  sales: InvoiceSaleFormData[];
  onSalesChange: (sales: InvoiceSaleFormData[]) => void;
  onSaleRemove: (index: number) => void;
  selectedAgent?: AgentWithSalesIds;
  vendorFields?: VendorFieldDefinition[];
  isVendorConfigured?: boolean;
}

export default function InvoiceSalesTable({
  sales,
  onSalesChange,
  onSaleRemove,
  selectedAgent,
  vendorFields,
  isVendorConfigured,
}: InvoiceSalesTableProps) {
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  // Resolve which columns to show
  const activeColumns = (isVendorConfigured && vendorFields && vendorFields.length > 0)
    ? resolveEditableColumns(vendorFields)
    : DEFAULT_EDIT_COLUMNS;

  const addSale = () => {
    const newSale: InvoiceSaleFormData = {
      sale_date: new Date().toISOString().split('T')[0],
      first_name: '',
      last_name: '',
      address: '',
      city: '',
      status: '',
      amount: 0,
      is_active: 1
    };

    // Initialize custom_fields for any custom columns
    const customColumns = activeColumns.filter(c => c.source === 'custom');
    if (customColumns.length > 0) {
      newSale.custom_fields = {};
      for (const col of customColumns) {
        newSale.custom_fields[col.key] = '';
      }
    }

    onSalesChange([...sales, newSale]);
  };

  const updateSale = (index: number, field: keyof InvoiceSaleFormData, value: string | number) => {
    const updatedSales = sales.map((sale, i) =>
      i === index ? { ...sale, [field]: value } : sale
    );
    onSalesChange(updatedSales);
  };

  const updateCustomField = (index: number, fieldKey: string, value: string) => {
    const updatedSales = sales.map((sale, i) => {
      if (i !== index) return sale;
      return {
        ...sale,
        custom_fields: {
          ...(sale.custom_fields || {}),
          [fieldKey]: value,
        },
      };
    });
    onSalesChange(updatedSales);
  };

  const handleImportComplete = (importedSales: InvoiceSaleFormData[], errors?: ParseError[]) => {
    onSalesChange([...sales, ...importedSales]);

    if (errors && errors.length > 0) {
      logger.warn('Import completed with validation warnings:', errors);
    }
  };

  // Prepare custom field info for ExcelImportDialog
  const vendorCustomFields = vendorFields
    ?.filter(f => f.source === 'custom')
    .map(f => ({ field_key: f.field_key, field_label: f.field_label }));

  const renderCell = (sale: InvoiceSaleFormData, index: number, column: EditableColumn) => {
    if (column.source === 'custom') {
      // Custom field - read/write from sale.custom_fields
      const value = String(sale.custom_fields?.[column.key] ?? '');
      return (
        <Input
          value={value}
          onChange={(e) => updateCustomField(index, column.key, e.target.value)}
          placeholder={column.label}
        />
      );
    }

    // Built-in field
    switch (column.type) {
      case 'date':
        return (
          <Input
            type="date"
            value={sale[column.key as keyof InvoiceSaleFormData] as string}
            onChange={(e) => updateSale(index, column.key as keyof InvoiceSaleFormData, e.target.value)}
          />
        );
      case 'currency':
        return (
          <CurrencyInput
            value={(sale[column.key as keyof InvoiceSaleFormData] as number) || 0}
            onChange={(value) => updateSale(index, column.key as keyof InvoiceSaleFormData, value)}
            placeholder="$0.00"
          />
        );
      default:
        return (
          <Input
            value={(sale[column.key as keyof InvoiceSaleFormData] as string) ?? ''}
            onChange={(e) => updateSale(index, column.key as keyof InvoiceSaleFormData, e.target.value)}
            placeholder={column.label}
          />
        );
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Sales</h3>
        <div className="flex gap-2">
          <Button onClick={() => setImportDialogOpen(true)} size="sm" variant="outline">
            <Upload className="w-4 h-4 mr-2" />
            Import from Excel
          </Button>
          <Button onClick={addSale} size="sm">
            Add Sale
          </Button>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            {activeColumns.map((col) => (
              <TableHead key={col.key}>{col.label}</TableHead>
            ))}
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sales.map((sale, index) => (
            <TableRow key={index}>
              {activeColumns.map((col) => (
                <TableCell key={col.key}>
                  {renderCell(sale, index, col)}
                </TableCell>
              ))}
              <TableCell>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onSaleRemove(index)}
                  disabled={sales.length <= 1}
                >
                  Remove
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {sales.length === 0 && (
            <TableRow>
              <TableCell colSpan={activeColumns.length + 1} className="text-center py-4">
                No sales added yet.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <ExcelImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        mode="single"
        onImportComplete={handleImportComplete}
        selectedAgent={selectedAgent}
        vendorCustomFields={vendorCustomFields}
      />
    </div>
  );
}
