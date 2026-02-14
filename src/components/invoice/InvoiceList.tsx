'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dayjs from 'dayjs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';

interface PaystubSummary {
  employeeId: number;
  employeeName: string;
  agentId: string;
  vendorId: number;
  vendorName: string;
  issueDate: string;
  totalSales: number;
  totalOverrides: number;
  totalExpenses: number;
  netPay: number;
  paystubCount: number;
  weekending?: string;
  isPaid?: boolean;
  salesCount?: number;
  totalAmount?: number;
  agentName?: string;
}

interface InvoiceListProps {
  initialFilters?: {
    agentId?: number;
    vendorId?: number;
    issueDate?: string;
  };
}

export default function InvoiceList({ initialFilters }: InvoiceListProps) {
  const [invoices, setInvoices] = useState<PaystubSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const queryParams = new URLSearchParams();
      if (initialFilters?.agentId) queryParams.set('employeeId', initialFilters.agentId.toString());
      if (initialFilters?.vendorId) queryParams.set('vendorId', initialFilters.vendorId.toString());
      if (initialFilters?.issueDate) queryParams.set('issueDate', initialFilters.issueDate);
      
      const response = await fetch(`/api/payroll?${queryParams.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch pay statements');
      }
      
      const result = await response.json();
      setInvoices(result.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFilters]);

  const handleCreateInvoice = () => {
    router.push('/invoices/new');
  };

  const handleEditInvoice = (employeeId: number, vendorId: number, issueDate: string) => {
    // Convert date to MM-DD-YYYY format for URL using dayjs
    const formattedDate = dayjs(issueDate).format('MM-DD-YYYY');
    router.push(`/invoices/${employeeId}/${vendorId}/${formattedDate}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-foreground"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-destructive/10 border border-destructive rounded-md p-4">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-destructive">Error loading pay statements</h3>
            <p className="mt-2 text-sm text-destructive">{error}</p>
            <div className="mt-4">
              <Button 
                onClick={fetchInvoices}
                className="bg-destructive hover:bg-destructive/90 text-white"
                size="sm"
              >
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex justify-between items-center">
        <div className="flex space-x-2">
          <Button onClick={handleCreateInvoice} className="bg-primary hover:bg-primary/90 text-white">
            Create New Pay Statement
          </Button>
          <Button 
            onClick={fetchInvoices} 
            variant="outline"
            className="border-border text-foreground hover:bg-muted"
          >
            Refresh
          </Button>
        </div>
        <div className="text-sm text-muted-foreground">
          {invoices.length} pay statement{invoices.length !== 1 ? 's' : ''} found
        </div>
      </div>

      {/* Invoice Grid */}
      {invoices.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-foreground mb-2">No pay statements found</h3>
          <p className="text-muted-foreground mb-4">Get started by creating your first pay statement.</p>
          <Button onClick={handleCreateInvoice} className="bg-primary hover:bg-primary/90 text-white">
            Create Pay Statement
          </Button>
        </div>
      ) : (
        <div className="bg-card shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-border">
            {invoices.map((invoice) => (
              <li key={`${invoice.employeeId}-${invoice.vendorId}-${invoice.issueDate}`}>
                <div className="px-4 py-4 flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center">
                        <span className="text-sm font-medium text-white">
                          {invoice.employeeName ? invoice.employeeName.charAt(0).toUpperCase() : 'E'}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="flex items-center">
                        <p className="text-sm font-medium text-foreground truncate">
                          {invoice.employeeName || `Employee ${invoice.employeeId}`}
                        </p>
                        <Badge variant="secondary" className="ml-2">
                          {invoice.vendorName || `Vendor ${invoice.vendorId}`}
                        </Badge>
                      </div>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <span>Issue Date: {dayjs(invoice.issueDate).format('MM/DD/YYYY')}</span>
                        {invoice.weekending && (
                          <>
                            <span className="mx-2">•</span>
                            <span>Weekending: {dayjs(invoice.weekending).format('MM/DD/YYYY')}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <div className="text-right mr-4">
                      <p className="text-sm font-medium text-foreground">
                        {formatCurrency(invoice.netPay || 0)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {invoice.paystubCount || 0} paystub{(invoice.paystubCount || 0) !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <Button
                      onClick={() => handleEditInvoice(invoice.employeeId, invoice.vendorId, invoice.issueDate)}
                      variant="outline"
                      size="sm"
                      className="border-border text-foreground hover:bg-muted"
                    >
                      Edit
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
