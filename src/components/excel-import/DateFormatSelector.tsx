'use client';

import { Button } from '@/components/ui/button';
import { Calendar, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';

export type DateFormat = 'auto' | 'US' | 'ISO' | 'EU';

interface DateFormatOption {
  value: DateFormat;
  label: string;
  description: string;
  example: string;
}

const DATE_FORMAT_OPTIONS: DateFormatOption[] = [
  {
    value: 'auto',
    label: 'Auto-detect',
    description: 'Let the system detect the format automatically',
    example: 'Tries all formats'
  },
  {
    value: 'US',
    label: 'US Format (MM/DD/YYYY)',
    description: 'Month first, then day',
    example: '10/05/2025 = October 5, 2025'
  },
  {
    value: 'ISO',
    label: 'ISO Format (YYYY-MM-DD)',
    description: 'Year first (ISO 8601 standard)',
    example: '2025-10-05 = October 5, 2025'
  },
  {
    value: 'EU',
    label: 'European Format (DD/MM/YYYY)',
    description: 'Day first, then month',
    example: '05/10/2025 = October 5, 2025'
  }
];

interface DateFormatSelectorProps {
  onSelect: (format: DateFormat) => void;
  onCancel: () => void;
  isProcessing?: boolean;
  hasHeaders?: boolean;
  onHasHeadersChange?: (hasHeaders: boolean) => void;
}

export default function DateFormatSelector({
  onSelect,
  onCancel,
  isProcessing = false,
  hasHeaders = true,
  onHasHeadersChange
}: DateFormatSelectorProps) {
  const [selectedFormat, setSelectedFormat] = useState<DateFormat>('auto');

  const handleConfirm = () => {
    onSelect(selectedFormat);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Select Date Format</h3>
        <p className="text-sm text-muted-foreground">
          Choose the date format used in your file to ensure dates are parsed correctly.
        </p>
      </div>

      <div className="bg-secondary/10 border border-secondary/30 rounded-lg p-4">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-secondary mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-medium text-secondary">Important</h4>
            <p className="text-sm text-secondary mt-1">
              Incorrect date format selection may cause dates to be misinterpreted. 
              For example, 03/04/2025 could mean March 4th or April 3rd depending on the format.
            </p>
          </div>
        </div>
      </div>

      {/* Optional header checkbox */}
      {onHasHeadersChange && (
        <div className="border rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="has-headers-toggle"
              checked={!hasHeaders}
              onChange={(e) => onHasHeadersChange(!e.target.checked)}
              className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
            />
            <label htmlFor="has-headers-toggle" className="text-sm font-medium cursor-pointer">
              My file doesn&apos;t have headers
            </label>
          </div>
          <p className="text-xs text-muted-foreground mt-2 ml-6">
            Check this if your first row contains data instead of column names.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {DATE_FORMAT_OPTIONS.map((option) => (
          <div
            key={option.value}
            className={`flex items-start space-x-3 p-4 border rounded-lg cursor-pointer transition-colors ${
              selectedFormat === option.value
                ? 'border-primary bg-primary/10'
                : 'border-border hover:bg-muted'
            }`}
            onClick={() => setSelectedFormat(option.value)}
          >
            <div className="mt-1">
              {selectedFormat === option.value ? (
                <CheckCircle2 className="w-5 h-5 text-primary" />
              ) : (
                <div className="w-5 h-5 border-2 border-border rounded-full" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 font-medium">
                <Calendar className="w-4 h-4" />
                {option.label}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {option.description}
              </p>
              <p className="text-xs text-muted-foreground mt-1 font-mono bg-card px-2 py-1 rounded border inline-block">
                {option.example}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-between items-center pt-4 border-t">
        <div className="text-sm text-muted-foreground">
          Selected: <span className="font-medium">
            {DATE_FORMAT_OPTIONS.find(o => o.value === selectedFormat)?.label}
          </span>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onCancel} disabled={isProcessing}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isProcessing}>
            {isProcessing ? 'Processing...' : 'Continue'}
          </Button>
        </div>
      </div>
    </div>
  );
}
