'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  SearchIcon, 
  BarChart3Icon, 
  AlertTriangleIcon,
  TrendingUpIcon,
  UsersIcon,
  ActivityIcon,
  ClockIcon
} from 'lucide-react'
import { InvoiceSearchForm, InvoiceSearchFilters } from '@/components/invoice-audit/InvoiceSearchForm'
import { InvoiceAuditHistory, InvoiceAuditRecord } from '@/components/invoice-audit/InvoiceAuditHistory'
import { useSession } from 'next-auth/react'

// Types for API responses
interface SearchResult {
  records: InvoiceAuditRecord[]
  totalCount: number
  page: number
  limit: number
  totalPages: number
}

interface AuditSummary {
  totalChanges: number
  statusChanges: number
  amountChanges: number
  recentChanges: number
  topChangedStatuses: Array<{ status: string; count: number }>
  topChangingUsers: Array<{ userId: number; userName: string; changeCount: number }>
}

interface DashboardData {
  summary: AuditSummary
  recentActivity: InvoiceAuditRecord[]
}

export default function InvoiceSearchPage() {
  const { data: session } = useSession()
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null)
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [availableAgents, setAvailableAgents] = useState<Array<{ id: number; name: string }>>([])
  const [availableVendors, setAvailableVendors] = useState<Array<{ id: number; name: string }>>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('dashboard')

  // Check permissions
  const hasAccess = session?.user?.isManager || session?.user?.isAdmin

  // Load dashboard data on component mount
  useEffect(() => {
    if (hasAccess) {
      loadDashboardData()
      loadAgentsAndVendors()
    }
  }, [hasAccess])

  const loadAgentsAndVendors = async () => {
    try {
      // Load agents
      const agentsResponse = await fetch('/api/payroll/agents')
      if (agentsResponse.ok) {
        const agentsData = await agentsResponse.json()
        setAvailableAgents(agentsData.map((agent: { id: number; name: string; sales_id1: string }) => ({
          id: agent.id,
          name: `${agent.name} (${agent.sales_id1})`
        })))
      }

      // Load vendors  
      const vendorsResponse = await fetch('/api/payroll/vendors')
      if (vendorsResponse.ok) {
        const vendorsData = await vendorsResponse.json()
        setAvailableVendors(vendorsData.map((vendor: { id: number; name: string }) => ({
          id: vendor.id,
          name: vendor.name
        })))
      }
    } catch (error) {
      console.error('Error loading agents and vendors:', error)
      // Don't show error toast for this as it's not critical for the main functionality
    }
  }

  const loadDashboardData = async () => {
    try {
      setIsLoadingDashboard(true)
      setError(null)

      const response = await fetch('/api/invoices/search', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to load dashboard data')
      }

      const result = await response.json()
      setDashboardData(result.data)
    } catch (err) {
      console.error('Error loading dashboard data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data')
    } finally {
      setIsLoadingDashboard(false)
    }
  }

  const handleSearch = async (filters: InvoiceSearchFilters) => {
    try {
      setIsSearching(true)
      setError(null)

      const response = await fetch('/api/invoices/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(filters),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Search failed')
      }

      const result = await response.json()
      setSearchResults(result.data)
      setActiveTab('results')
    } catch (err) {
      console.error('Error searching invoices:', err)
      setError(err instanceof Error ? err.message : 'Search failed')
    } finally {
      setIsSearching(false)
    }
  }

  const handleClearSearch = () => {
    setSearchResults(null)
    setError(null)
    setActiveTab('dashboard')
  }

  const DashboardStats = () => {
    if (isLoadingDashboard) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )
    }

    if (!dashboardData) return null

    const { summary } = dashboardData

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <ActivityIcon className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Changes</p>
                <p className="text-2xl font-bold">{summary.totalChanges.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <AlertTriangleIcon className="h-8 w-8 text-orange-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Status Changes</p>
                <p className="text-2xl font-bold">{summary.statusChanges.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingUpIcon className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Amount Changes</p>
                <p className="text-2xl font-bold">{summary.amountChanges.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <ClockIcon className="h-8 w-8 text-purple-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Recent Changes</p>
                <p className="text-2xl font-bold">{summary.recentChanges.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Last 30 days</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const TopChangedStatuses = () => {
    if (!dashboardData?.summary.topChangedStatuses.length) return null

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Most Changed Statuses</CardTitle>
          <CardDescription>
            Status changes that occur most frequently - potential chargeback indicators
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {dashboardData.summary.topChangedStatuses.slice(0, 5).map((item) => (
              <div key={item.status} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Badge variant={item.status === 'Charged Back' ? 'destructive' : 'secondary'}>
                    {item.status}
                  </Badge>
                </div>
                <div className="text-right">
                  <div className="font-medium">{item.count}</div>
                  <div className="text-xs text-muted-foreground">changes</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  const TopChangingUsers = () => {
    if (!dashboardData?.summary.topChangingUsers.length) return null

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Most Active Users</CardTitle>
          <CardDescription>
            Users making the most invoice changes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {dashboardData.summary.topChangingUsers.slice(0, 5).map((item) => (
              <div key={item.userId} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <UsersIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{item.userName}</span>
                </div>
                <div className="text-right">
                  <div className="font-medium">{item.changeCount}</div>
                  <div className="text-xs text-muted-foreground">changes</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Access denied screen
  if (!hasAccess) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="p-8 text-center">
            <AlertTriangleIcon className="h-16 w-16 text-amber-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
            <p className="text-muted-foreground mb-4">
              This page requires Manager or Admin permissions to access invoice search and audit trails.
            </p>
            <Button onClick={() => window.history.back()}>
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Invoice Investigation</h1>
          <p className="text-muted-foreground">
            Search invoice history and investigate chargeback claims
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          {session?.user?.isAdmin ? 'Admin' : 'Manager'} Access
        </Badge>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangleIcon className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <BarChart3Icon className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="search" className="flex items-center gap-2">
            <SearchIcon className="h-4 w-4" />
            Search
          </TabsTrigger>
          <TabsTrigger value="results" className="flex items-center gap-2" disabled={!searchResults}>
            <ActivityIcon className="h-4 w-4" />
            Results {searchResults && `(${searchResults.totalCount})`}
          </TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          <DashboardStats />
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TopChangedStatuses />
            <TopChangingUsers />
          </div>

          {dashboardData?.recentActivity && dashboardData.recentActivity.length > 0 && (
            <InvoiceAuditHistory
              auditRecords={dashboardData.recentActivity}
              title="Recent Activity"
              showInvoiceId={true}
            />
          )}
        </TabsContent>

        {/* Search Tab */}
        <TabsContent value="search" className="space-y-6">
          <InvoiceSearchForm
            onSearch={handleSearch}
            onClear={handleClearSearch}
            isLoading={isSearching}
            availableAgents={availableAgents}
            availableVendors={availableVendors}
          />
        </TabsContent>

        {/* Results Tab */}
        <TabsContent value="results" className="space-y-6">
          {searchResults && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Search Results</span>
                    <Badge variant="outline">
                      {searchResults.totalCount} result{searchResults.totalCount !== 1 ? 's' : ''}
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    Page {searchResults.page} of {searchResults.totalPages} 
                    ({searchResults.limit} per page)
                  </CardDescription>
                </CardHeader>
              </Card>

              <InvoiceAuditHistory
                auditRecords={searchResults.records}
                title="Search Results"
                showInvoiceId={true}
              />

              {/* Pagination could be added here */}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}