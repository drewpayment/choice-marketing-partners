'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';

interface CurrencyInputProps {
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  readOnly?: boolean;
}

/**
 * Currency input component that:
 * - Accepts decimal numbers
 * - Formats as USD currency on blur
 * - Shows raw number on focus for easy editing
 */
export function CurrencyInput({
  value,
  onChange,
  placeholder = '0.00',
  className,
  disabled,
  readOnly
}: CurrencyInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [displayValue, setDisplayValue] = useState('');

  // Update display value when value prop changes or focus changes
  useEffect(() => {
    if (isFocused) {
      // Show raw number when focused
      setDisplayValue(value === 0 ? '' : value.toString());
    } else {
      // Show formatted currency when not focused
      const formatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value);
      setDisplayValue(formatted);
    }
  }, [value, isFocused]);

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;

    // Allow empty, minus sign, and valid decimal numbers (including negatives)
    if (inputValue === '' || inputValue === '-' || /^-?\d*\.?\d*$/.test(inputValue)) {
      setDisplayValue(inputValue);

      // Parse to number for onChange
      const numericValue = inputValue === '' || inputValue === '-' ? 0 : parseFloat(inputValue);
      onChange(numericValue);
    }
  };

  return (
    <Input
      type="text"
      value={displayValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      placeholder={placeholder}
      className={className}
      disabled={disabled}
      readOnly={readOnly}
    />
  );
}
