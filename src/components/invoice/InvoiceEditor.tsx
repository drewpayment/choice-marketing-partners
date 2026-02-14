'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dayjs from 'dayjs';
import { InvoiceFormData, InvoiceDetailResponse, InvoiceSaleFormData, InvoiceOverrideFormData, InvoiceExpenseFormData, Agent, AgentWithSalesIds, Vendor } from '@/types/database';
import { InvoiceDetail } from '@/lib/repositories/InvoiceRepository';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TypeaheadSelect } from '@/components/ui/typeahead-select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import InvoiceSalesTable from './InvoiceSalesTable';
import InvoiceOverridesTable from './InvoiceOverridesTable';
import InvoiceExpensesTable from './InvoiceExpensesTable';
import { formatCurrency } from '@/lib/utils';
import { logger } from '@/lib/utils/logger'

interface InvoiceEditorProps {
  mode: 'create' | 'edit';
  agentId?: number;
  vendorId?: number;
  issueDate?: string;
  initialData?: InvoiceDetail; // Add support for SSR data
}

/**
 * Pay Statement Editor Component
 * 
 * Manages the creation and editing of pay statements (paystubs) which contain:
 * - Sales: Individual commission records (invoices table)
 * - Overrides: Commission adjustments 
 * - Expenses: Additional compensation/reimbursements
 * 
 * Total Calculation: Sales + Overrides + Expenses
 * 
 * Updates both:
 * - paystubs table (main pay statement record)
 * - invoices table (individual sales details)
 * - overrides table (commission adjustments)
 * - expenses table (additional compensation)
 */
export default function InvoiceEditor({ mode, agentId, vendorId, issueDate, initialData }: InvoiceEditorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState<InvoiceFormData>({
    vendor: '',
    agentId: agentId || 0,
    issueDate: issueDate || '',
    weekending: initialData?.weekending ? dayjs(initialData.weekending, 'MM-DD-YYYY').format('yyyy-MM-dd') : '',
    sales: [],
    overrides: [],
    expenses: []
  });

  // Track records pending deletion (only deleted when Save is clicked)
  const [pendingDeletes, setPendingDeletes] = useState<{
    sales: number[];
    overrides: number[];
    expenses: number[];
  }>({
    sales: [],
    overrides: [],
    expenses: []
  });

  const [agents, setAgents] = useState<AgentWithSalesIds[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [issueDates, setIssueDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(mode === 'edit');
  const [saving, setSaving] = useState(false);
  const [totalAmount, setTotalAmount] = useState(0);
  const [showCustomDateDialog, setShowCustomDateDialog] = useState(false);
  const [customDateValue, setCustomDateValue] = useState('');

  useEffect(() => {
    fetchLookupData();
    if (mode === 'edit' && agentId && vendorId && issueDate) {
      if (initialData) {
        // Use SSR data instead of API call
        loadInitialData(initialData);
      } else {
        // Fallback to API call if no SSR data
        fetchInvoiceData();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, agentId, vendorId, issueDate, initialData]);

  const calculateTotals = useCallback(() => {
    const salesTotal = formData.sales.reduce((sum, sale) => sum + (sale.amount || 0), 0);
    const overridesTotal = formData.overrides.reduce((sum, override) => sum + (override.total || 0), 0);
    const expensesTotal = formData.expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
    setTotalAmount(salesTotal + overridesTotal + expensesTotal);
  }, [formData.sales, formData.overrides, formData.expenses]);

  useEffect(() => {
    calculateTotals();
  }, [calculateTotals]);

  const fetchLookupData = async () => {
    try {
      // Fetch real lookup data from the invoices API
      const response = await fetch('/api/invoices');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setAgents(data.data.agents || []);
          setVendors(data.data.vendors || []);
          setIssueDates(data.data.issueDates || []);
        }
      } else {
        // Fallback to placeholder data if API fails
        setAgents([
          { id: 1, name: 'Agent 1' },
          { id: 2, name: 'Agent 2' },
        ]);
        setVendors([
          { id: 1, name: 'Vendor 1' },
          { id: 2, name: 'Vendor 2' },
        ]);
        setIssueDates([
          '2024-01-15',
          '2024-02-15',
          '2024-03-15',
        ]);
      }
    } catch (error) {
      logger.error('Failed to fetch lookup data:', error);
      // Fallback to placeholder data
      setAgents([
        { id: 1, name: 'Agent 1' },
        { id: 2, name: 'Agent 2' },
      ]);
      setVendors([
        { id: 1, name: 'Vendor 1' },
        { id: 2, name: 'Vendor 2' },
      ]);
      setIssueDates([
        '2024-01-15',
        '2024-02-15',
        '2024-03-15',
      ]);
    }
  };

  const fetchInvoiceData = async () => {
    if (!agentId || !vendorId || !issueDate) return;
    
    try {
      setLoading(true);
      
      // Convert MM-DD-YYYY to YYYY-MM-DD for API
      const dateStr = convertDateForAPI(issueDate);
      const response = await fetch(`/api/invoices/${agentId}/${vendorId}/${dateStr}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch invoice data');
      }
      
      logger.warn('Failed to fetch invoice data via SSR.');
      
      const data: InvoiceDetailResponse = await response.json();

      // Convert data to form format
      setFormData({
        vendor: vendorId.toString(),
        agentId: agentId,
        issueDate: issueDate,
        weekending: data?.payStub?.weekend_date || '',
        sales: data.sales.map(sale => ({
          sale_date: sale.sale_date,
          first_name: sale.first_name,
          last_name: sale.last_name,
          address: sale.address,
          city: sale.city,
          status: sale.status,
          amount: sale.amount,
          is_active: sale.is_active
        })),
        overrides: data.overrides.map(override => ({
          name: override.name,
          commission: override.commission,
          sales: override.sales,
          total: override.total
        })),
        expenses: data.expenses.map(expense => ({
          type: expense.type,
          amount: expense.amount,
          notes: expense.notes
        })),
      });
    } catch (error) {
      logger.error('Failed to fetch invoice data:', error);
      // toast({
      //   title: 'Error',
      //   description: 'Failed to load invoice data',
      //   variant: 'destructive'
      // });
    } finally {
      setLoading(false);
    }
  };

  const loadInitialData = (data: InvoiceDetail) => {
    try {
      setLoading(true);
      
      // Set lookup data from SSR data
      setAgents([{
        id: data.employee.id,
        name: data.employee.name
      }]);
      
      setVendors([{
        id: data.vendor.id,
        name: data.vendor.name
      }]);
      
      // Convert SSR data to form format
      setFormData({
        vendor: vendorId?.toString() || '',
        agentId: agentId || 0,
        issueDate: issueDate || '',
        weekending: data.weekending ? dayjs(data.weekending, 'MM-DD-YYYY').format('YYYY-MM-DD') : '',
        sales: data.invoices.map(invoice => ({
          invoiceId: invoice.invoice_id, // Add invoice ID for updates
          sale_date: dayjs(invoice.sale_date).format('YYYY-MM-DD'),
          first_name: invoice.first_name,
          last_name: invoice.last_name,
          address: invoice.address,
          city: invoice.city,
          status: invoice.status,
          amount: invoice.amount,
          is_active: 1 // Default to active (1) for existing invoices
        })),
        overrides: data.overrides.map(override => ({
          overrideId: override.ovrid, // Add override ID for updates
          name: override.name,
          commission: override.commission,
          sales: override.sales,
          total: override.total
        })),
        expenses: data.expenses.map(expense => ({
          expenseId: expense.expid, // Add expense ID for updates
          type: expense.type,
          amount: expense.amount,
          notes: expense.notes
        }))
      });
    } catch (error) {
      logger.error('Failed to load initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const convertDateForAPI = (dateStr: string): string => {
    // Convert MM-DD-YYYY to YYYY-MM-DD
    const parts = dateStr.split('-');
    if (parts.length === 3 && parts[0].length === 2) {
      return `${parts[2]}-${parts[0]}-${parts[1]}`;
    }
    return dateStr;
  };

  const handleIssueDateChange = (value: string) => {
    if (value === '__CUSTOM__') {
      // Open custom date dialog
      setShowCustomDateDialog(true);
      setCustomDateValue('');
    } else {
      // Use selected existing date
      setFormData(prev => ({ ...prev, issueDate: value }));
    }
  };

  const handleCustomDateConfirm = () => {
    if (customDateValue) {
      // Convert from yyyy-MM-dd to MM/DD/YYYY for consistency
      const formatted = dayjs(customDateValue).format('MM/DD/YYYY');
      setFormData(prev => ({ ...prev, issueDate: formatted }));
      setShowCustomDateDialog(false);
      setCustomDateValue('');
    }
  };

  const handleCustomDateCancel = () => {
    setShowCustomDateDialog(false);
    setCustomDateValue('');
  };

  const handleSalesChange = (sales: InvoiceSaleFormData[]) => {
    setFormData(prev => ({ ...prev, sales }));
  };

  const handleSaleRemove = (index: number) => {
    const sale = formData.sales[index];

    // If this is an existing sale with an invoiceId, track it for deletion
    if (sale.invoiceId) {
      setPendingDeletes(prev => ({
        ...prev,
        sales: [...prev.sales, sale.invoiceId!]
      }));
    }

    // Remove from local state
    const updatedSales = formData.sales.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, sales: updatedSales }));
  };

  const handleOverridesChange = (overrides: InvoiceOverrideFormData[]) => {
    setFormData(prev => ({ ...prev, overrides }));
  };

  const handleOverrideRemove = (index: number) => {
    const override = formData.overrides[index];

    // If this is an existing override with an overrideId, track it for deletion
    if (override.overrideId) {
      setPendingDeletes(prev => ({
        ...prev,
        overrides: [...prev.overrides, override.overrideId!]
      }));
    }

    // Remove from local state
    const updatedOverrides = formData.overrides.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, overrides: updatedOverrides }));
  };

  const handleExpensesChange = (expenses: InvoiceExpenseFormData[]) => {
    setFormData(prev => ({ ...prev, expenses }));
  };

  const handleExpenseRemove = (index: number) => {
    const expense = formData.expenses[index];

    // If this is an existing expense with an expenseId, track it for deletion
    if (expense.expenseId) {
      setPendingDeletes(prev => ({
        ...prev,
        expenses: [...prev.expenses, expense.expenseId!]
      }));
    }

    // Remove from local state
    const updatedExpenses = formData.expenses.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, expenses: updatedExpenses }));
  };

  const handleSave = async () => {
    try {
      // Validate required fields
      if (!formData.vendor) {
        toast({
          title: 'Validation Error',
          description: 'Please select a vendor',
          variant: 'destructive'
        });
        return;
      }

      if (!formData.agentId) {
        toast({
          title: 'Validation Error',
          description: 'Please select an agent',
          variant: 'destructive'
        });
        return;
      }

      if (!formData.issueDate) {
        toast({
          title: 'Validation Error',
          description: 'Please select an issue date',
          variant: 'destructive'
        });
        return;
      }

      if (!formData.weekending) {
        toast({
          title: 'Validation Error',
          description: 'Please select a weekending date',
          variant: 'destructive'
        });
        return;
      }

      setSaving(true);

      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          pendingDeletes
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save invoice');
      }
      
      toast({
        title: 'Success',
        description: mode === 'create' ? 'Pay statement created successfully' : 'Pay statement updated successfully',
      });
      
      // Check for returnUrl to preserve filters
      const returnUrl = searchParams.get('returnUrl');
      router.push(returnUrl || '/invoices');
    } catch (error) {
      logger.error('Failed to save invoice:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save pay statement',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    // Check for returnUrl to preserve filters
    const returnUrl = searchParams.get('returnUrl');
    router.push(returnUrl || '/invoices');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-foreground"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Invoice Header */}
      <Card>
        <CardHeader>
          <CardTitle>{mode === 'create' ? 'New Pay Statement' : 'Edit Pay Statement'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="vendor">Vendor</Label>
              <Select
                value={formData.vendor}
                onValueChange={(value: string) => setFormData(prev => ({ ...prev, vendor: value }))}
                disabled={mode === 'edit'}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select vendor" />
                </SelectTrigger>
                <SelectContent>
                  {vendors.map(vendor => (
                    <SelectItem key={vendor.id} value={vendor.id.toString()}>
                      {vendor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="agent">Agent</Label>
              <TypeaheadSelect
                options={agents.map(agent => ({ key: agent.id, value: agent.name }))}
                value={formData.agentId}
                onValueChange={(value) => setFormData(prev => ({ ...prev, agentId: typeof value === 'number' ? value : parseInt(value as string) }))}
                placeholder="Select agent"
                searchPlaceholder="Search agents..."
                disabled={mode === 'edit'}
              />
            </div>

            <div>
              <Label htmlFor="issueDate">Issue Date</Label>
              <Select
                value={formData.issueDate}
                onValueChange={handleIssueDateChange}
                disabled={mode === 'edit'}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select issue date" />
                </SelectTrigger>
                <SelectContent>
                  {/* Show custom date if it's not in the existing dates list */}
                  {formData.issueDate && !issueDates.includes(formData.issueDate) && (
                    <SelectItem key={formData.issueDate} value={formData.issueDate}>
                      {formData.issueDate}
                    </SelectItem>
                  )}
                  {issueDates.map(date => (
                    <SelectItem key={date} value={date}>
                      {dayjs(date).format('MM/DD/YYYY')}
                    </SelectItem>
                  ))}
                  <SelectItem value="__CUSTOM__" className="font-medium text-primary">
                    Custom Date...
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="weekending">
                Weekending <span className="text-destructive">*</span>
              </Label>
              <Input
                type="date"
                value={formData.weekending}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, weekending: e.target.value }))}
                required
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sales Table */}
      <Card>
        <CardHeader>
          <CardTitle>Sales</CardTitle>
        </CardHeader>
        <CardContent>
          <InvoiceSalesTable
            sales={formData.sales}
            onSalesChange={handleSalesChange}
            onSaleRemove={handleSaleRemove}
            selectedAgent={agents.find(a => a.id === formData.agentId)}
          />
        </CardContent>
      </Card>

      {/* Overrides Table */}
      <Card>
        <CardHeader>
          <CardTitle>Overrides</CardTitle>
        </CardHeader>
        <CardContent>
          <InvoiceOverridesTable
            overrides={formData.overrides}
            onOverridesChange={handleOverridesChange}
            onOverrideRemove={handleOverrideRemove}
          />
        </CardContent>
      </Card>

      {/* Expenses Table */}
      <Card>
        <CardHeader>
          <CardTitle>Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          <InvoiceExpensesTable
            expenses={formData.expenses}
            onExpensesChange={handleExpensesChange}
            onExpenseRemove={handleExpenseRemove}
          />
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardContent className="flex justify-between items-center pt-6">
          <div className="text-lg font-semibold">
            Total: {formatCurrency(totalAmount)}
          </div>
          <div className="space-x-2">
            <Button variant="outline" onClick={handleCancel} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Pay Statement'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Custom Date Dialog */}
      <Dialog open={showCustomDateDialog} onOpenChange={setShowCustomDateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Custom Issue Date</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="customDate">Issue Date</Label>
            <Input
              id="customDate"
              type="date"
              value={customDateValue}
              onChange={(e) => setCustomDateValue(e.target.value)}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCustomDateCancel}>
              Cancel
            </Button>
            <Button onClick={handleCustomDateConfirm} disabled={!customDateValue}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
