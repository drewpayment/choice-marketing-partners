'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dayjs from 'dayjs';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Edit, Plus, Calendar, DollarSign, User, Building2, Search } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

interface PayrollSummary {
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
  isPaid?: boolean;
}

interface PaystubManagementListProps {
  isAdmin: boolean;
}

interface FilterOptions {
  employees: Array<{ id: number; name: string }>;
  vendors: Array<{ id: number; name: string }>;
  issueDates: string[];
}

export default function PaystubManagementList({ isAdmin }: PaystubManagementListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [paystubs, setPaystubs] = useState<PayrollSummary[]>([]);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    employees: [],
    vendors: [],
    issueDates: []
  });
  const [filters, setFilters] = useState({
    employeeId: searchParams.get('employeeId') || 'all',
    vendorId: searchParams.get('vendorId') || 'all',
    issueDate: searchParams.get('issueDate') || 'all',
    status: searchParams.get('status') || 'all',
    search: searchParams.get('search') || ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get('page') || '1'));
  const [totalPages, setTotalPages] = useState(1);

  // Sync URL with current filters and page
  const updateURL = (newFilters: typeof filters, page: number) => {
    const params = new URLSearchParams();
    
    if (newFilters.employeeId && newFilters.employeeId !== 'all') {
      params.set('employeeId', newFilters.employeeId);
    }
    if (newFilters.vendorId && newFilters.vendorId !== 'all') {
      params.set('vendorId', newFilters.vendorId);
    }
    if (newFilters.issueDate && newFilters.issueDate !== 'all') {
      params.set('issueDate', newFilters.issueDate);
    }
    if (newFilters.status && newFilters.status !== 'all') {
      params.set('status', newFilters.status);
    }
    if (newFilters.search) {
      params.set('search', newFilters.search);
    }
    if (page > 1) {
      params.set('page', page.toString());
    }
    
    const newURL = params.toString() ? `?${params.toString()}` : '';
    router.replace(newURL, { scroll: false });
  };

  const fetchPaystubs = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const queryParams = new URLSearchParams();
      if (filters.employeeId && filters.employeeId !== 'all') queryParams.set('employeeId', filters.employeeId);
      if (filters.vendorId && filters.vendorId !== 'all') queryParams.set('vendorId', filters.vendorId);
      if (filters.issueDate && filters.issueDate !== 'all') queryParams.set('issueDate', filters.issueDate);
      if (filters.status && filters.status !== 'all') queryParams.set('status', filters.status);
      queryParams.set('page', currentPage.toString());
      queryParams.set('limit', '20');
      
      const response = await fetch(`/api/payroll?${queryParams.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch pay statements');
      }
      
      const data = await response.json();
      setPaystubs(data.data || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchFilterOptions = async () => {
    try {
      // Fetch available filter options
      const response = await fetch('/api/payroll/filter-options');
      if (response.ok) {
        const options = await response.json();
        setFilterOptions(options);
      }
    } catch (err) {
      console.error('Failed to fetch filter options:', err);
    }
  };

  useEffect(() => {
    fetchFilterOptions();
  }, []);

  useEffect(() => {
    fetchPaystubs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, currentPage]);

  const handleCreatePaystub = () => {
    router.push('/invoices/new');
  };

  const handleEditPaystub = (employeeId: number, vendorId: number, issueDate: string) => {
    // Format date for URL (MM-DD-YYYY) using dayjs
    const formattedDate = dayjs(issueDate).format('MM-DD-YYYY');
    
    // Preserve current filters in URL when navigating to edit
    const params = new URLSearchParams();
    if (filters.employeeId && filters.employeeId !== 'all') params.set('employeeId', filters.employeeId);
    if (filters.vendorId && filters.vendorId !== 'all') params.set('vendorId', filters.vendorId);
    if (filters.issueDate && filters.issueDate !== 'all') params.set('issueDate', filters.issueDate);
    if (filters.status && filters.status !== 'all') params.set('status', filters.status);
    if (filters.search) params.set('search', filters.search);
    if (currentPage > 1) params.set('page', currentPage.toString());
    
    const returnUrl = params.toString() ? `/invoices?${params.toString()}` : '/invoices';
    
    // Use employeeId for the route (agentId = employeeId in the database)
    router.push(`/invoices/detail/${employeeId}/${vendorId}/${formattedDate}?returnUrl=${encodeURIComponent(returnUrl)}`);
  };

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value };
    const newPage = 1; // Reset to first page when filtering
    
    setFilters(newFilters);
    setCurrentPage(newPage);
    updateURL(newFilters, newPage);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    updateURL(filters, page);
  };

  const filteredPaystubs = paystubs.filter(paystub => {
    if (!filters.search) return true;
    const searchLower = filters.search.toLowerCase();
    return (
      paystub.employeeName.toLowerCase().includes(searchLower) ||
      paystub.vendorName.toLowerCase().includes(searchLower) ||
      paystub.agentId.toLowerCase().includes(searchLower)
    );
  });

  if (loading && paystubs.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading pay statements</h3>
            <p className="mt-2 text-sm text-red-700">{error}</p>
            <div className="mt-4">
              <Button 
                onClick={fetchPaystubs}
                className="bg-red-600 hover:bg-red-700 text-white"
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
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="flex space-x-2">
          {isAdmin && (
            <Button onClick={handleCreatePaystub} className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Create New Pay Statement
            </Button>
          )}
          <Button 
            onClick={fetchPaystubs} 
            variant="outline"
            className="border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Refresh
          </Button>
        </div>
        <div className="text-sm text-gray-600">
          {filteredPaystubs.length} pay statement{filteredPaystubs.length !== 1 ? 's' : ''} found
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search employees, vendors..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div>
              <Select value={filters.employeeId} onValueChange={(value) => handleFilterChange('employeeId', value === 'all' ? '' : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Employees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employees</SelectItem>
                  {filterOptions.employees.map(employee => (
                    <SelectItem key={employee.id} value={employee.id.toString()}>
                      {employee.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Select value={filters.vendorId} onValueChange={(value) => handleFilterChange('vendorId', value === 'all' ? '' : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Vendors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Vendors</SelectItem>
                  {filterOptions.vendors.map(vendor => (
                    <SelectItem key={vendor.id} value={vendor.id.toString()}>
                      {vendor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Select value={filters.issueDate} onValueChange={(value) => handleFilterChange('issueDate', value === 'all' ? '' : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Issue Dates" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Issue Dates</SelectItem>
                  {filterOptions.issueDates.map(date => (
                    <SelectItem key={date} value={date}>
                      {formatDate(date)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Paystub Grid */}
      {filteredPaystubs.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 mb-2">No pay statements found</h3>
          <p className="text-gray-600 mb-4">
            {filters.search || (filters.employeeId !== 'all') || (filters.vendorId !== 'all') || (filters.issueDate !== 'all') || (filters.status !== 'all')
              ? 'Try adjusting your filters or search terms.'
              : 'Get started by creating your first pay statement.'
            }
          </p>
          {isAdmin && (
            <Button onClick={handleCreatePaystub} className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Create Pay Statement
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredPaystubs.map((paystub) => (
            <Card key={`${paystub.employeeId}-${paystub.vendorId}-${paystub.issueDate}`} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {/* Employee Avatar */}
                    <div className="flex-shrink-0">
                      <div className="h-12 w-12 rounded-full bg-blue-500 flex items-center justify-center">
                        <User className="w-6 h-6 text-white" />
                      </div>
                    </div>

                    {/* Employee & Vendor Info */}
                    <div className="min-w-0">
                      <div className="flex items-center space-x-2">
                        <p className="text-lg font-medium text-gray-900 truncate">
                          {paystub.employeeName}
                        </p>
                        <Badge variant="secondary" className="flex items-center">
                          <Building2 className="w-3 h-3 mr-1" />
                          {paystub.vendorName}
                        </Badge>
                        {paystub.isPaid !== undefined && (
                          <Badge variant={paystub.isPaid ? "default" : "destructive"}>
                            {paystub.isPaid ? "Paid" : "Unpaid"}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center text-sm text-gray-500 mt-1">
                        <Calendar className="w-4 h-4 mr-1" />
                        <span>Issue Date: {formatDate(paystub.issueDate)}</span>
                        <span className="mx-2">•</span>
                        <span>Agent ID: {paystub.agentId}</span>
                      </div>
                    </div>
                  </div>

                  {/* Financial Summary */}
                  <div className="flex items-center space-x-6">
                    <div className="text-right">
                      <div className="flex items-center text-sm text-gray-500 mb-1">
                        <DollarSign className="w-4 h-4 mr-1" />
                        <span>Net Pay</span>
                      </div>
                      <p className="text-lg font-semibold text-gray-900">
                        {formatCurrency(paystub.netPay)}
                      </p>
                    </div>

                    <div className="text-right text-sm text-gray-500">
                      <div>Sales: {formatCurrency(paystub.totalSales)}</div>
                      <div>Overrides: {formatCurrency(paystub.totalOverrides)}</div>
                      <div>Expenses: {formatCurrency(paystub.totalExpenses)}</div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col space-y-2">
                      <Button
                        onClick={() => handleEditPaystub(paystub.employeeId, paystub.vendorId, paystub.issueDate)}
                        variant="outline"
                        size="sm"
                        className="border-blue-300 text-blue-700 hover:bg-blue-50"
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center space-x-2">
          <Button
            variant="outline"
            onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <span className="flex items-center px-4 text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
