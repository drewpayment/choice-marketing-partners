'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { 
  Mail, 
  Clock, 
  Settings as SettingsIcon,
  Loader2,
  CheckCircle,
  AlertCircle,
  Plus,
  Trash2,
  Calendar
} from 'lucide-react';
import { logger } from '@/lib/utils/logger';
import {
  CompanyOptionsResponse,
  PayrollRestrictionResponse,
  PayrollDatesResponse
} from '@/lib/types/admin';

// Form schemas
const emailSettingsSchema = z.object({
  hasPaystubNotifications: z.boolean(),
});

const payrollRestrictionSchema = z.object({
  hour: z.number().min(0).max(23),
  minute: z.number().min(0).max(59),
});

const payrollDateSchema = z.object({
  date: z.string().min(1, 'Date is required'),
});

type EmailSettingsForm = z.infer<typeof emailSettingsSchema>;
type PayrollRestrictionForm = z.infer<typeof payrollRestrictionSchema>;
type PayrollDateForm = z.infer<typeof payrollDateSchema>;

interface SettingsState {
  companyOptions: CompanyOptionsResponse | null;
  payrollRestriction: PayrollRestrictionResponse | null;
  payrollDates: PayrollDatesResponse | null;
  loading: boolean;
  saving: boolean;
}

export default function AdminSettingsPage() {
  const [state, setState] = useState<SettingsState>({
    companyOptions: null,
    payrollRestriction: null,
    payrollDates: null,
    loading: true,
    saving: false,
  });
  
  const [activeTab, setActiveTab] = useState('email');
  const [showAddDateForm, setShowAddDateForm] = useState(false);
  const { toast } = useToast();

  // Email settings form
  const emailForm = useForm<EmailSettingsForm>({
    resolver: zodResolver(emailSettingsSchema),
    defaultValues: {
      hasPaystubNotifications: false,
    },
  });

  // Payroll restriction form
  const restrictionForm = useForm<PayrollRestrictionForm>({
    resolver: zodResolver(payrollRestrictionSchema),
    defaultValues: {
      hour: 9,
      minute: 0,
    },
  });

  // Payroll date form
  const dateForm = useForm<PayrollDateForm>({
    resolver: zodResolver(payrollDateSchema),
    defaultValues: {
      date: '',
    },
  });

  // Load initial data
  const loadSettingsData = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true }));

      const [companyOptionsRes, restrictionRes, datesRes] = await Promise.all([
        fetch('/api/admin/company/options'),
        fetch('/api/admin/payroll/restrictions'),
        fetch('/api/admin/payroll/dates'),
      ]);

      const companyOptions = companyOptionsRes.ok ? await companyOptionsRes.json() : null;
      const payrollRestriction = restrictionRes.ok ? await restrictionRes.json() : null;
      const payrollDates = datesRes.ok ? await datesRes.json() : null;

      setState(prev => ({
        ...prev,
        companyOptions,
        payrollRestriction,
        payrollDates,
        loading: false,
      }));

      // Update form values
      if (companyOptions) {
        emailForm.reset({
          hasPaystubNotifications: companyOptions.hasPaystubNotifications,
        });
      }

      if (payrollRestriction) {
        restrictionForm.reset({
          hour: payrollRestriction.hour,
          minute: payrollRestriction.minute,
        });
      }
    } catch (error) {
      logger.error('Error loading settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load settings data.',
        variant: 'destructive',
      });
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [toast, emailForm, restrictionForm]);

  // Load initial data on component mount
  useEffect(() => {
    loadSettingsData();
  }, [loadSettingsData]);

  const saveEmailSettings = async (data: EmailSettingsForm) => {
    try {
      setState(prev => ({ ...prev, saving: true }));

      const response = await fetch('/api/admin/company/options', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to save email settings');
      }

      const updatedOptions = await response.json();
      setState(prev => ({ 
        ...prev, 
        companyOptions: updatedOptions,
        saving: false 
      }));

      toast({
        title: 'Settings Saved',
        description: 'Email notification settings have been updated.',
      });
    } catch (error) {
      logger.error('Error saving email settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save email settings.',
        variant: 'destructive',
      });
      setState(prev => ({ ...prev, saving: false }));
    }
  };

  const saveRestrictionSettings = async (data: PayrollRestrictionForm) => {
    try {
      setState(prev => ({ ...prev, saving: true }));

      const response = await fetch('/api/admin/payroll/restrictions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to save restriction settings');
      }

      const updatedRestriction = await response.json();
      setState(prev => ({ 
        ...prev, 
        payrollRestriction: updatedRestriction,
        saving: false 
      }));

      toast({
        title: 'Settings Saved',
        description: 'Payroll restriction settings have been updated.',
      });
    } catch (error) {
      logger.error('Error saving restriction settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save restriction settings.',
        variant: 'destructive',
      });
      setState(prev => ({ ...prev, saving: false }));
    }
  };

  const addPayrollDate = async (data: PayrollDateForm) => {
    try {
      setState(prev => ({ ...prev, saving: true }));

      const response = await fetch('/api/admin/payroll/dates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add payroll date');
      }

      const result = await response.json();
      
      toast({
        title: 'Success',
        description: result.message,
      });

      // Reload payroll dates
      await loadSettingsData();
      
      // Reset form and hide it
      dateForm.reset();
      setShowAddDateForm(false);
      
    } catch (error) {
      logger.error('Error adding payroll date:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to add payroll date.',
        variant: 'destructive',
      });
    } finally {
      setState(prev => ({ ...prev, saving: false }));
    }
  };

  const deletePayrollDate = async (date: string) => {
    if (!confirm('Are you sure you want to delete this payroll date? This action cannot be undone.')) {
      return;
    }

    try {
      setState(prev => ({ ...prev, saving: true }));

      const response = await fetch(`/api/admin/payroll/dates?date=${encodeURIComponent(date)}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete payroll date');
      }

      const result = await response.json();
      
      toast({
        title: 'Success',
        description: result.message,
      });

      // Reload payroll dates
      await loadSettingsData();
      
    } catch (error) {
      logger.error('Error deleting payroll date:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete payroll date.',
        variant: 'destructive',
      });
    } finally {
      setState(prev => ({ ...prev, saving: false }));
    }
  };

  if (state.loading) {
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
        <h1 className="text-3xl font-bold tracking-tight">Company Settings</h1>
        <p className="text-muted-foreground">
          Manage email notifications, payroll restrictions, and system configuration.
        </p>
      </div>

      {/* Settings Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="email" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email
          </TabsTrigger>
          <TabsTrigger value="payroll" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Payroll
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center gap-2">
            <SettingsIcon className="h-4 w-4" />
            System
          </TabsTrigger>
        </TabsList>

        {/* Email Notifications Tab */}
        <TabsContent value="email" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email Notifications
              </CardTitle>
              <CardDescription>
                Configure automatic email notifications for employees.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...emailForm}>
                <form onSubmit={emailForm.handleSubmit(saveEmailSettings)} className="space-y-6">
                  <FormField
                    control={emailForm.control}
                    name="hasPaystubNotifications"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            Paystub Email Notifications
                          </FormLabel>
                          <FormDescription>
                            Automatically send email notifications to employees when paystubs are ready.
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end">
                    <Button 
                      type="submit" 
                      disabled={state.saving}
                      className="min-w-[120px]"
                    >
                      {state.saving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Save Settings
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payroll Settings Tab */}
        <TabsContent value="payroll" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Release Time Restrictions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Release Time Restrictions
                </CardTitle>
                <CardDescription>
                  Set the time when employees can access their paystubs.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...restrictionForm}>
                  <form onSubmit={restrictionForm.handleSubmit(saveRestrictionSettings)} className="space-y-4">
                    <div className="flex gap-4">
                      <FormField
                        control={restrictionForm.control}
                        name="hour"
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormLabel>Hour (24h format)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={0}
                                max={23}
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={restrictionForm.control}
                        name="minute"
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormLabel>Minute</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={0}
                                max={59}
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Button 
                      type="submit" 
                      disabled={state.saving}
                      className="w-full"
                    >
                      {state.saving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        'Update Release Time'
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>

            {/* Payroll Dates */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Payroll Dates Management</span>
                  <Button
                    size="sm"
                    onClick={() => setShowAddDateForm(!showAddDateForm)}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Date
                  </Button>
                </CardTitle>
                <CardDescription>
                  Manage payroll processing dates in the system.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Add New Date Form */}
                {showAddDateForm && (
                  <div className="mb-4 p-4 border rounded-lg bg-blue-50">
                    <Form {...dateForm}>
                      <form onSubmit={dateForm.handleSubmit(addPayrollDate)} className="space-y-4">
                        <FormField
                          control={dateForm.control}
                          name="date"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>New Payroll Date</FormLabel>
                              <FormControl>
                                <Input
                                  type="date"
                                  {...field}
                                  disabled={state.saving}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="flex gap-2">
                          <Button 
                            type="submit" 
                            size="sm"
                            disabled={state.saving}
                          >
                            {state.saving ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Adding...
                              </>
                            ) : (
                              'Add Date'
                            )}
                          </Button>
                          <Button 
                            type="button" 
                            size="sm" 
                            variant="outline"
                            onClick={() => setShowAddDateForm(false)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </div>
                )}

                {/* Existing Dates List */}
                <div className="space-y-2">
                  {state.payrollDates?.dates.map((date, index) => (
                    <div key={date.issueDate} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <span className="text-sm font-medium">{date.displayDate}</span>
                        {index === 0 && <Badge variant="secondary">Latest</Badge>}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deletePayrollDate(date.issueDate)}
                        disabled={state.saving}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {(!state.payrollDates?.dates || state.payrollDates.dates.length === 0) && (
                    <div className="text-center py-4 text-gray-500">
                      No payroll dates found. Add one to get started.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* System Configuration Tab */}
        <TabsContent value="system" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SettingsIcon className="h-5 w-5" />
                System Configuration
              </CardTitle>
              <CardDescription>
                Additional system settings and configuration options.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                    <p className="text-sm text-orange-800">
                      Additional system configuration options will be available in future updates.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
