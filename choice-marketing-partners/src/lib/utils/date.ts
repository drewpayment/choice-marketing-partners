import dayjs from 'dayjs'

/**
 * Format a date string or Date object for display
 * Uses dayjs to avoid timezone issues with MySQL DATE columns
 * 
 * @param date - Date string (YYYY-MM-DD) or Date object
 * @param format - dayjs format string (default: 'MMM D, YYYY')
 * @returns Formatted date string
 */
export function formatDate(date: string | Date | null, format: string = 'MMM D, YYYY'): string {
  if (!date) return ''
  
  // If it's a date string in YYYY-MM-DD format, parse it explicitly to avoid timezone issues
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return dayjs(date, 'YYYY-MM-DD').format(format)
  }
  
  // For other formats or Date objects, use dayjs normally
  return dayjs(date).format(format)
}

/**
 * Parse a date string in YYYY-MM-DD format to avoid timezone issues
 * 
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns dayjs instance
 */
export function parseDate(dateString: string) {
  return dayjs(dateString, 'YYYY-MM-DD')
}

/**
 * Get today's date in YYYY-MM-DD format
 * 
 * @returns Today's date string
 */
export function getTodayString(): string {
  return dayjs().format('YYYY-MM-DD')
}

/**
 * Check if a date string is in valid YYYY-MM-DD format
 * 
 * @param dateString - Date string to validate
 * @returns True if valid format
 */
export function isValidDateString(dateString: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateString) && dayjs(dateString, 'YYYY-MM-DD').isValid()
}
