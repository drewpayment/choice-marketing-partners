'use client';

import { useState } from 'react';
import { InvoiceSaleFormData, AgentWithSalesIds } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload } from 'lucide-react';
import ExcelImportDialog from '@/components/excel-import/ExcelImportDialog';
import { ParseError } from '@/lib/excel-import/parser';

interface InvoiceSalesTableProps {
  sales: InvoiceSaleFormData[];
  onSalesChange: (sales: InvoiceSaleFormData[]) => void;
  selectedAgent?: AgentWithSalesIds;
}

export default function InvoiceSalesTable({ sales, onSalesChange, selectedAgent }: InvoiceSalesTableProps) {
  const [importDialogOpen, setImportDialogOpen] = useState(false);

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
    onSalesChange([...sales, newSale]);
  };

  const removeSale = (index: number) => {
    onSalesChange(sales.filter((_, i) => i !== index));
  };

  const updateSale = (index: number, field: keyof InvoiceSaleFormData, value: string | number) => {
    const updatedSales = sales.map((sale, i) => 
      i === index ? { ...sale, [field]: value } : sale
    );
    onSalesChange(updatedSales);
  };

  const handleImportComplete = (importedSales: InvoiceSaleFormData[], errors?: ParseError[]) => {
    // Merge imported sales with existing sales
    onSalesChange([...sales, ...importedSales]);

    // If there were validation errors in single mode, show a toast or notification
    if (errors && errors.length > 0) {
      console.warn('Import completed with validation warnings:', errors);
      // You could show a toast notification here
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
            <TableHead>Sale Date</TableHead>
            <TableHead>First Name</TableHead>
            <TableHead>Last Name</TableHead>
            <TableHead>Address</TableHead>
            <TableHead>City</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sales.map((sale, index) => (
            <TableRow key={index}>
              <TableCell>
                <Input
                  type="date"
                  value={sale.sale_date}
                  onChange={(e) => updateSale(index, 'sale_date', e.target.value)}
                />
              </TableCell>
              <TableCell>
                <Input
                  value={sale.first_name}
                  onChange={(e) => updateSale(index, 'first_name', e.target.value)}
                  placeholder="First name"
                />
              </TableCell>
              <TableCell>
                <Input
                  value={sale.last_name}
                  onChange={(e) => updateSale(index, 'last_name', e.target.value)}
                  placeholder="Last name"
                />
              </TableCell>
              <TableCell>
                <Input
                  value={sale.address}
                  onChange={(e) => updateSale(index, 'address', e.target.value)}
                  placeholder="Address"
                />
              </TableCell>
              <TableCell>
                <Input
                  value={sale.city}
                  onChange={(e) => updateSale(index, 'city', e.target.value)}
                  placeholder="City"
                />
              </TableCell>
              <TableCell>
                <Input
                  value={sale.status}
                  onChange={(e) => updateSale(index, 'status', e.target.value)}
                  placeholder="Status"
                />
              </TableCell>
              <TableCell>
                <CurrencyInput
                  value={sale.amount || 0}
                  onChange={(value) => updateSale(index, 'amount', value)}
                  placeholder="$0.00"
                />
              </TableCell>
              <TableCell>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => removeSale(index)}
                  disabled={sales.length <= 1}
                >
                  Remove
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {sales.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-4">
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
      />
    </div>
  );
}
