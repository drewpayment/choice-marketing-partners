'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { 
  Wrench,
  RefreshCw,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  Loader2,
  PlayCircle,
  StopCircle,
  Upload
} from 'lucide-react';

interface ReprocessJob {
  id: string;
  date: string;
  status: 'idle' | 'running' | 'completed' | 'error';
  startedAt?: string;
  completedAt?: string;
  recordsProcessed?: number;
  totalRecords?: number;
  errorMessage?: string;
}

export default function AdminToolsPage() {
  const [selectedDate, setSelectedDate] = useState('');
  const [jobs, setJobs] = useState<ReprocessJob[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const { toast } = useToast();

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
  };

  const startReprocessJob = async () => {
    if (!selectedDate) {
      toast({
        title: 'Date Required',
        description: 'Please select a payroll date to reprocess.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsProcessing(true);
      
      const response = await fetch('/api/admin/payroll/reprocess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selectedDate }),
      });

      if (!response.ok) {
        throw new Error('Failed to start reprocessing job');
      }

      const result = await response.json();
      
      // Add new job to the list
      const newJob: ReprocessJob = {
        id: result.jobId || Date.now().toString(),
        date: selectedDate,
        status: 'running',
        startedAt: new Date().toISOString(),
        totalRecords: result.totalRecords || 0,
        recordsProcessed: 0,
      };

      setJobs(prev => [newJob, ...prev]);
      
      toast({
        title: 'Reprocessing Started',
        description: `Payroll reprocessing has been started for ${selectedDate}.`,
      });

      // Start polling for job status
      pollJobStatus(newJob.id);
      
    } catch (error) {
      console.error('Error starting reprocess job:', error);
      toast({
        title: 'Error',
        description: 'Failed to start payroll reprocessing.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const pollJobStatus = async (jobId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/admin/payroll/reprocess?jobId=${jobId}`);
        if (!response.ok) {
          clearInterval(pollInterval);
          return;
        }

        const jobStatus = await response.json();
        
        setJobs(prev => prev.map(job => 
          job.id === jobId 
            ? { 
                ...job, 
                status: jobStatus.status,
                recordsProcessed: jobStatus.recordsProcessed,
                completedAt: jobStatus.completedAt,
                errorMessage: jobStatus.errorMessage,
              }
            : job
        ));

        // Stop polling if job is complete or errored
        if (jobStatus.status === 'completed' || jobStatus.status === 'error') {
          clearInterval(pollInterval);
          
          if (jobStatus.status === 'completed') {
            toast({
              title: 'Reprocessing Complete',
              description: `Successfully reprocessed ${jobStatus.recordsProcessed} payroll records.`,
            });
          } else {
            toast({
              title: 'Reprocessing Failed',
              description: jobStatus.errorMessage || 'An error occurred during reprocessing.',
              variant: 'destructive',
            });
          }
        }
      } catch (error) {
        console.error('Error polling job status:', error);
        clearInterval(pollInterval);
      }
    }, 2000); // Poll every 2 seconds
  };

  const cancelJob = async (jobId: string) => {
    try {
      const response = await fetch(`/api/admin/payroll/reprocess?jobId=${jobId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to cancel job');
      }

      setJobs(prev => prev.map(job => 
        job.id === jobId 
          ? { ...job, status: 'error', errorMessage: 'Cancelled by user' }
          : job
      ));

      toast({
        title: 'Job Cancelled',
        description: 'Reprocessing job has been cancelled.',
      });
    } catch (error) {
      console.error('Error cancelling job:', error);
      toast({
        title: 'Error',
        description: 'Failed to cancel reprocessing job.',
        variant: 'destructive',
      });
    }
  };

  const getStatusIcon = (status: ReprocessJob['status']) => {
    switch (status) {
      case 'idle':
        return <Clock className="h-4 w-4 text-gray-500" />;
      case 'running':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: ReprocessJob['status']) => {
    const variants = {
      idle: 'secondary',
      running: 'default',
      completed: 'secondary',
      error: 'destructive',
    } as const;

    return (
      <Badge variant={variants[status]} className="capitalize">
        {status}
      </Badge>
    );
  };

  const getProgressPercentage = (job: ReprocessJob): number => {
    if (job.status === 'completed') return 100;
    if (job.status === 'error' || job.status === 'idle') return 0;
    if (!job.totalRecords || job.totalRecords === 0) return 0;
    return Math.round((job.recordsProcessed || 0) / job.totalRecords * 100);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Tools</h1>
        <p className="text-muted-foreground">
          Administrative tools for payroll management and system maintenance.
        </p>
      </div>

      {/* Payroll Reprocessing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Payroll Reprocessing
          </CardTitle>
          <CardDescription>
            Reprocess payroll calculations for a specific date. This will recalculate all payroll records,
            commissions, and related data for the selected date.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4 mb-6">
            <div className="flex-1 max-w-sm">
              <label className="text-sm font-medium mb-2 block">
                Payroll Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={handleDateChange}
                  className="pl-8"
                  placeholder="Select payroll date"
                />
              </div>
            </div>
            <Button
              onClick={startReprocessJob}
              disabled={isProcessing || !selectedDate}
              className="flex items-center gap-2"
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <PlayCircle className="h-4 w-4" />
              )}
              Start Reprocessing
            </Button>
          </div>

          {/* Warning */}
          <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-6">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-yellow-800">Important Notice</h4>
              <p className="text-sm text-yellow-700 mt-1">
                Reprocessing will recalculate all payroll data for the selected date. This action may take 
                several minutes to complete and cannot be undone. Ensure all invoice data is correct before proceeding.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Job Status */}
      {jobs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Processing Jobs
            </CardTitle>
            <CardDescription>
              Current and recent payroll reprocessing jobs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    {getStatusIcon(job.status)}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          Payroll Date: {new Date(job.date).toLocaleDateString()}
                        </span>
                        {getStatusBadge(job.status)}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {job.status === 'running' && (
                          <span>
                            Processing {job.recordsProcessed || 0} of {job.totalRecords || 0} records 
                            ({getProgressPercentage(job)}%)
                          </span>
                        )}
                        {job.status === 'completed' && (
                          <span>
                            Completed at {job.completedAt ? new Date(job.completedAt).toLocaleTimeString() : 'N/A'} - 
                            Processed {job.recordsProcessed} records
                          </span>
                        )}
                        {job.status === 'error' && (
                          <span className="text-red-600">
                            {job.errorMessage || 'An error occurred during processing'}
                          </span>
                        )}
                        {job.status === 'idle' && (
                          <span>Waiting to start...</span>
                        )}
                      </div>
                      
                      {/* Progress Bar */}
                      {job.status === 'running' && job.totalRecords && job.totalRecords > 0 && (
                        <div className="w-64 bg-gray-200 rounded-full h-2 mt-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${getProgressPercentage(job)}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {job.status === 'running' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => cancelJob(job.id)}
                      className="flex items-center gap-2"
                    >
                      <StopCircle className="h-4 w-4" />
                      Cancel
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Additional Admin Tools */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            System Tools
          </CardTitle>
          <CardDescription>
            Additional administrative tools and utilities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="p-4 border rounded-lg">
              <h3 className="font-medium mb-2">Batch Sales Upload</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Import sales records from Excel files
              </p>
              <Button variant="outline" size="sm" asChild>
                <a href="/admin/tools/batch-upload">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Sales
                </a>
              </Button>
            </div>

            <div className="p-4 border rounded-lg">
              <h3 className="font-medium mb-2">Cache Management</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Clear application cache and refresh data
              </p>
              <Button variant="outline" size="sm" disabled>
                <RefreshCw className="h-4 w-4 mr-2" />
                Clear Cache
              </Button>
            </div>
            
            <div className="p-4 border rounded-lg">
              <h3 className="font-medium mb-2">Data Export</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Export payroll data for external analysis
              </p>
              <Button variant="outline" size="sm" disabled>
                <Calendar className="h-4 w-4 mr-2" />
                Export Data
              </Button>
            </div>
            
            <div className="p-4 border rounded-lg">
              <h3 className="font-medium mb-2">System Health</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Check system status and connectivity
              </p>
              <Button variant="outline" size="sm" disabled>
                <CheckCircle className="h-4 w-4 mr-2" />
                Health Check
              </Button>
            </div>
          </div>
          
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Note:</strong> Additional system tools are in development. 
              Currently, only payroll reprocessing is available.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
