'use client';

import { InvoiceOverrideFormData } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface InvoiceOverridesTableProps {
  overrides: InvoiceOverrideFormData[];
  onOverridesChange: (overrides: InvoiceOverrideFormData[]) => void;
}

export default function InvoiceOverridesTable({ overrides, onOverridesChange }: InvoiceOverridesTableProps) {
  const addOverride = () => {
    const newOverride: InvoiceOverrideFormData = {
      name: '',
      commission: 0,
      sales: 0,
      total: 0
    };
    onOverridesChange([...overrides, newOverride]);
  };

  const removeOverride = (index: number) => {
    onOverridesChange(overrides.filter((_, i) => i !== index));
  };

  const updateOverride = (index: number, field: keyof InvoiceOverrideFormData, value: string | number) => {
    const updatedOverrides = overrides.map((override, i) => {
      if (i === index) {
        const updated = { ...override, [field]: value };
        // Auto-calculate total when commission or sales change
        if (field === 'commission' || field === 'sales') {
          updated.total = (updated.commission || 0) * (updated.sales || 0);
        }
        return updated;
      }
      return override;
    });
    onOverridesChange(updatedOverrides);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Overrides</h3>
        <Button onClick={addOverride} size="sm">
          Add Override
        </Button>
      </div>
      
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead># Sales</TableHead>
            <TableHead>Commission</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {overrides.map((override, index) => (
            <TableRow key={index}>
              <TableCell>
                <Input
                  value={override.name}
                  onChange={(e) => updateOverride(index, 'name', e.target.value)}
                  placeholder="Override name"
                />
              </TableCell>
              <TableCell>
                <Input
                  type="number"
                  value={override.sales}
                  onChange={(e) => updateOverride(index, 'sales', parseInt(e.target.value) || 0)}
                  placeholder="0"
                />
              </TableCell>
              <TableCell>
                <Input
                  type="number"
                  step="0.01"
                  value={override.commission}
                  onChange={(e) => updateOverride(index, 'commission', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                />
              </TableCell>
              <TableCell>
                <Input
                  type="number"
                  step="0.01"
                  value={override.total}
                  readOnly
                  className="bg-gray-50"
                />
              </TableCell>
              <TableCell>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => removeOverride(index)}
                >
                  Remove
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {overrides.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-4">
                No overrides added yet.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
