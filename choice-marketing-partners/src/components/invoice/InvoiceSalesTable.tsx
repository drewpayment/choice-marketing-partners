'use client';

import { InvoiceSaleFormData } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface InvoiceSalesTableProps {
  sales: InvoiceSaleFormData[];
  onSalesChange: (sales: InvoiceSaleFormData[]) => void;
}

export default function InvoiceSalesTable({ sales, onSalesChange }: InvoiceSalesTableProps) {
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

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Sales</h3>
        <Button onClick={addSale} size="sm">
          Add Sale
        </Button>
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
                <Input
                  type="text"
                  value={sale.amount}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Allow empty, minus sign, and valid decimal numbers (including negatives)
                    if (value === '' || value === '-' || /^-?\d*\.?\d*$/.test(value)) {
                      updateSale(index, 'amount', value === '' || value === '-' ? 0 : parseFloat(value));
                    }
                  }}
                  placeholder="0.00"
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
    </div>
  );
}
