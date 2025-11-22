/**
 * Environment-aware logger utility
 *
 * In development: logs everything
 * In production: only logs warnings and errors
 *
 * Usage:
 *   import { logger } from '@/lib/utils/logger'
 *   logger.log('Debug info')      // Only in dev
 *   logger.info('Info message')   // Only in dev
 *   logger.warn('Warning')        // Always
 *   logger.error('Error')         // Always
 */

const isDevelopment = process.env.NODE_ENV === 'development';

export const logger = {
  /**
   * Debug logging - only in development
   */
  log: (...args: unknown[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },

  /**
   * Info logging - only in development
   */
  info: (...args: unknown[]) => {
    if (isDevelopment) {
      console.info(...args);
    }
  },

  /**
   * Warning logging - always shown
   */
  warn: (...args: unknown[]) => {
    console.warn(...args);
  },

  /**
   * Error logging - always shown
   */
  error: (...args: unknown[]) => {
    console.error(...args);
  },

  /**
   * Conditional debug logging with prefix
   * Useful for debugging specific features
   */
  debug: (prefix: string, ...args: unknown[]) => {
    if (isDevelopment) {
      console.log(`[${prefix}]`, ...args);
    }
  },
};
