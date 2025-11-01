'use client';

import { InvoiceExpenseFormData } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface InvoiceExpensesTableProps {
  expenses: InvoiceExpenseFormData[];
  onExpensesChange: (expenses: InvoiceExpenseFormData[]) => void;
}

export default function InvoiceExpensesTable({ expenses, onExpensesChange }: InvoiceExpensesTableProps) {
  const addExpense = () => {
    const newExpense: InvoiceExpenseFormData = {
      type: '',
      amount: 0,
      notes: ''
    };
    onExpensesChange([...expenses, newExpense]);
  };

  const removeExpense = (index: number) => {
    onExpensesChange(expenses.filter((_, i) => i !== index));
  };

  const updateExpense = (index: number, field: keyof InvoiceExpenseFormData, value: string | number) => {
    const updatedExpenses = expenses.map((expense, i) => 
      i === index ? { ...expense, [field]: value } : expense
    );
    onExpensesChange(updatedExpenses);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Expenses</h3>
        <Button onClick={addExpense} size="sm">
          Add Expense
        </Button>
      </div>
      
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Type</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Notes</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {expenses.map((expense, index) => (
            <TableRow key={index}>
              <TableCell>
                <Input
                  value={expense.type}
                  onChange={(e) => updateExpense(index, 'type', e.target.value)}
                  placeholder="Expense type"
                />
              </TableCell>
              <TableCell>
                <CurrencyInput
                  value={expense.amount || 0}
                  onChange={(value) => updateExpense(index, 'amount', value)}
                  placeholder="$0.00"
                />
              </TableCell>
              <TableCell>
                <Input
                  value={expense.notes}
                  onChange={(e) => updateExpense(index, 'notes', e.target.value)}
                  placeholder="Notes"
                />
              </TableCell>
              <TableCell>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => removeExpense(index)}
                >
                  Remove
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {expenses.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-center py-4">
                No expenses added yet.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
