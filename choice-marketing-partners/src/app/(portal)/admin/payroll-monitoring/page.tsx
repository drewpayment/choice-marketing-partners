'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { useToast } from '@/hooks/use-toast';
import { 
  Search,
  RefreshCw,
  Filter,
  DollarSign,
  Users,
  CheckCircle,
  Clock,
  Loader2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';

interface PayrollRecord {
  id: number;
  employeeId: number;
  employeeName: string;
  vendorId: number;
  vendorName: string;
  payDate: string;
  amount: number;
  isPaid: boolean;
}

interface PayrollSummary {
  total: number;
  paid: number;
  unpaid: number;
  totalAmount: number;
}

interface PayrollStatusResponse {
  records: PayrollRecord[];
  summary: PayrollSummary;
}

interface FilterState {
  vendorId: string;
  payDate: string;
  status: string;
  search: string;
}

interface SortState {
  field: 'payDate' | 'employeeName' | 'vendorName' | 'amount';
  direction: 'asc' | 'desc';
}

export default function PayrollMonitoringPage() {
  const [data, setData] = useState<PayrollStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [selectedRecords, setSelectedRecords] = useState<Set<number>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50); // Fixed items per page
  const [sortState, setSortState] = useState<SortState>({
    field: 'payDate',
    direction: 'desc', // Latest first by default
  });
  const [filters, setFilters] = useState<FilterState>({
    vendorId: 'all',
    payDate: '',
    status: 'all',
    search: '',
  });
  
  const { toast } = useToast();

  const loadPayrollData = useCallback(async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams();
      if (filters.vendorId !== 'all') params.append('vendorId', filters.vendorId);
      if (filters.payDate) params.append('payDate', filters.payDate);
      if (filters.status !== 'all') params.append('status', filters.status);

      const response = await fetch(`/api/admin/payroll/status?${params}`);
      if (!response.ok) throw new Error('Failed to load payroll data');
      
      const payrollData: PayrollStatusResponse = await response.json();
      setData(payrollData);
    } catch (error) {
      console.error('Error loading payroll data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load payroll data.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [filters, toast]);

  useEffect(() => {
    loadPayrollData();
  }, [loadPayrollData]);

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setSelectedRecords(new Set()); // Clear selections when filters change
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handleSelectRecord = (recordId: number) => {
    setSelectedRecords(prev => {
      const newSet = new Set(prev);
      if (newSet.has(recordId)) {
        newSet.delete(recordId);
      } else {
        newSet.add(recordId);
      }
      return newSet;
    });
  };

  const handleSort = (field: SortState['field']) => {
    setSortState(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
    setCurrentPage(1); // Reset to first page when sorting changes
  };

  const getSortIcon = (field: SortState['field']) => {
    if (sortState.field !== field) {
      return <ArrowUpDown className="h-3 w-3 text-muted-foreground" />;
    }
    return sortState.direction === 'asc' 
      ? <ArrowUp className="h-3 w-3" />
      : <ArrowDown className="h-3 w-3" />;
  };

  const handleBulkStatusUpdate = async (isPaid: boolean) => {
    if (selectedRecords.size === 0) {
      toast({
        title: 'No Records Selected',
        description: 'Please select records to update.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setUpdating(true);
      
      const response = await fetch('/api/admin/payroll/status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payrollIds: Array.from(selectedRecords),
          isPaid,
        }),
      });

      if (!response.ok) throw new Error('Failed to update payroll status');
      
      const result = await response.json();
      
      toast({
        title: 'Success',
        description: result.message,
      });

      // Reload data and clear selections
      await loadPayrollData();
      setSelectedRecords(new Set());
    } catch (error) {
      console.error('Error updating payroll status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update payroll status.',
        variant: 'destructive',
      });
    } finally {
      setUpdating(false);
    }
  };

  const getFilteredRecords = (): PayrollRecord[] => {
    if (!data) return [];
    
    const filtered = data.records.filter(record => {
      const matchesSearch = !filters.search || 
        record.employeeName.toLowerCase().includes(filters.search.toLowerCase()) ||
        record.vendorName.toLowerCase().includes(filters.search.toLowerCase());
      
      return matchesSearch;
    });

    // Apply sorting
    return filtered.sort((a, b) => {
      let aValue: string | number | Date;
      let bValue: string | number | Date;

      switch (sortState.field) {
        case 'payDate':
          aValue = new Date(a.payDate);
          bValue = new Date(b.payDate);
          break;
        case 'employeeName':
          aValue = a.employeeName.toLowerCase();
          bValue = b.employeeName.toLowerCase();
          break;
        case 'vendorName':
          aValue = a.vendorName.toLowerCase();
          bValue = b.vendorName.toLowerCase();
          break;
        case 'amount':
          aValue = a.amount;
          bValue = b.amount;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) {
        return sortState.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortState.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  };

  const getPaginatedRecords = (): PayrollRecord[] => {
    const filtered = getFilteredRecords();
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filtered.slice(startIndex, endIndex);
  };

  const getTotalPages = (): number => {
    const filtered = getFilteredRecords();
    return Math.ceil(filtered.length / itemsPerPage);
  };

  const filteredRecords = getFilteredRecords();
  const paginatedRecords = getPaginatedRecords();
  const totalPages = getTotalPages();
  const hasSelections = selectedRecords.size > 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Payroll Monitoring</h1>
        <p className="text-muted-foreground">
          Track and manage payroll payment status across all employees and vendors.
        </p>
      </div>

      {/* Summary Cards */}
      {data && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Records</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.summary.total.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Payroll records</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Paid</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{data.summary.paid.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {data.summary.total > 0 ? Math.round((data.summary.paid / data.summary.total) * 100) : 0}% complete
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unpaid</CardTitle>
              <Clock className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{data.summary.unpaid.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Awaiting payment</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${data.summary.totalAmount.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Payroll value</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 mb-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search employees or vendors..."
                  className="pl-8"
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                />
              </div>
            </div>
            
            <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Payment Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="paid">Paid Only</SelectItem>
                <SelectItem value="unpaid">Unpaid Only</SelectItem>
              </SelectContent>
            </Select>

            <Button 
              variant="outline" 
              onClick={loadPayrollData}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {/* Bulk Actions */}
          {hasSelections && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border">
              <span className="text-sm text-blue-700">
                {selectedRecords.size} record(s) selected
              </span>
              <div className="ml-auto flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleBulkStatusUpdate(true)}
                  disabled={updating}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Mark Paid'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkStatusUpdate(false)}
                  disabled={updating}
                >
                  {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Mark Unpaid'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payroll Records</CardTitle>
          <CardDescription>
            {filteredRecords.length} of {data?.summary.total || 0} records displayed
            {sortState.field && (
              <span className="ml-2 text-xs">
                • Sorted by {sortState.field === 'payDate' ? 'Pay Date' : 
                             sortState.field === 'employeeName' ? 'Employee' :
                             sortState.field === 'vendorName' ? 'Vendor' : 'Amount'} 
                ({sortState.direction === 'asc' ? 'ascending' : 'descending'})
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {paginatedRecords.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No payroll records found matching your filters.
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={paginatedRecords.length > 0 && paginatedRecords.every(record => selectedRecords.has(record.id))}
                          onCheckedChange={() => {
                            const allSelected = paginatedRecords.every(record => selectedRecords.has(record.id));
                            setSelectedRecords(prev => {
                              const newSet = new Set(prev);
                              if (allSelected) {
                                paginatedRecords.forEach(record => newSet.delete(record.id));
                              } else {
                                paginatedRecords.forEach(record => newSet.add(record.id));
                              }
                              return newSet;
                            });
                          }}
                          aria-label="Select all visible"
                        />
                      </TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          onClick={() => handleSort('employeeName')}
                          className="h-auto p-0 font-medium justify-start hover:bg-transparent gap-1"
                        >
                          Employee
                          {getSortIcon('employeeName')}
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          onClick={() => handleSort('vendorName')}
                          className="h-auto p-0 font-medium justify-start hover:bg-transparent gap-1"
                        >
                          Vendor
                          {getSortIcon('vendorName')}
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          onClick={() => handleSort('payDate')}
                          className="h-auto p-0 font-medium justify-start hover:bg-transparent gap-1"
                        >
                          Pay Date
                          {getSortIcon('payDate')}
                        </Button>
                      </TableHead>
                      <TableHead className="text-right">
                        <div className="flex justify-end">
                          <Button
                            variant="ghost"
                            onClick={() => handleSort('amount')}
                            className="h-auto p-0 font-medium hover:bg-transparent gap-1"
                          >
                            Amount
                            {getSortIcon('amount')}
                          </Button>
                        </div>
                      </TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedRecords.has(record.id)}
                            onCheckedChange={() => handleSelectRecord(record.id)}
                            aria-label={`Select ${record.employeeName}`}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{record.employeeName}</TableCell>
                        <TableCell>{record.vendorName}</TableCell>
                        <TableCell>{new Date(record.payDate).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">${record.amount.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant={record.isPaid ? 'default' : 'secondary'}>
                            {record.isPaid ? (
                              <>
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Paid
                              </>
                            ) : (
                              <>
                                <Clock className="h-3 w-3 mr-1" />
                                Unpaid
                              </>
                            )}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredRecords.length)} of {filteredRecords.length} records
                  </div>
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            if (currentPage > 1) setCurrentPage(currentPage - 1);
                          }}
                          className={currentPage <= 1 ? 'pointer-events-none opacity-50' : ''}
                        />
                      </PaginationItem>
                      
                      {/* Page Numbers */}
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        
                        return (
                          <PaginationItem key={pageNum}>
                            <PaginationLink
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                setCurrentPage(pageNum);
                              }}
                              isActive={currentPage === pageNum}
                            >
                              {pageNum}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      })}
                      
                      {totalPages > 5 && currentPage < totalPages - 2 && (
                        <>
                          <PaginationItem>
                            <PaginationEllipsis />
                          </PaginationItem>
                          <PaginationItem>
                            <PaginationLink
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                setCurrentPage(totalPages);
                              }}
                            >
                              {totalPages}
                            </PaginationLink>
                          </PaginationItem>
                        </>
                      )}
                      
                      <PaginationItem>
                        <PaginationNext 
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                          }}
                          className={currentPage >= totalPages ? 'pointer-events-none opacity-50' : ''}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
