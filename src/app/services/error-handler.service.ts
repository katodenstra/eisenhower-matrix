/**
 * Error Handler Service
 *
 * Centralized error handling and user-friendly error messages
 * Provides:
 * - Error logging
 * - User-facing error messages
 * - Error recovery suggestions
 * - Error context preservation
 */

import { Injectable, signal } from '@angular/core';
import { ErrorOccurredEvent } from '../types/events.types';

export interface AppError {
  code: string;
  message: string;
  userMessage: string;
  recoverable: boolean;
  context?: Record<string, any>;
  timestamp: number;
}

@Injectable({
  providedIn: 'root',
})
export class ErrorHandlerService {
  /** Signal for monitoring active errors */
  private readonly activeErrors = signal<AppError[]>([]);
  readonly errors = this.activeErrors.asReadonly();

  /**
   * Log and track an error
   *
   * @param error - Error object or message
   * @param code - Error code for categorization
   * @param context - Additional context information
   * @param recoverable - Whether the error is recoverable
   * @returns The processed error
   */
  handleError(
    error: Error | string,
    code: string = 'UNKNOWN_ERROR',
    context?: Record<string, any>,
    recoverable: boolean = true,
  ): AppError {
    const message = error instanceof Error ? error.message : String(error);
    const userMessage = this.getUserFriendlyMessage(code, message);

    const appError: AppError = {
      code,
      message,
      userMessage,
      recoverable,
      context,
      timestamp: Date.now(),
    };

    console.error('[Error]', code, message, context);

    // Store error for tracking
    this.activeErrors.update((errors) => [...errors, appError]);

    // Auto-remove error after 5 seconds if recoverable
    if (recoverable) {
      setTimeout(() => this.clearError(code), 5000);
    }

    return appError;
  }

  /**
   * Clear a specific error
   *
   * @param code - Error code to clear
   */
  clearError(code: string): void {
    this.activeErrors.update((errors) => errors.filter((e) => e.code !== code));
  }

  /**
   * Clear all errors
   */
  clearAll(): void {
    this.activeErrors.set([]);
  }

  /**
   * Get user-friendly error message based on error code
   *
   * @param code - Error code
   * @param originalMessage - Original error message
   * @returns User-friendly message
   */
  private getUserFriendlyMessage(code: string, originalMessage: string): string {
    const messages: Record<string, string> = {
      STORAGE_ERROR: 'Unable to save your changes. Please check your browser storage settings.',
      LOAD_ERROR: 'Unable to load tasks. Please refresh the page.',
      INVALID_INPUT: 'Please check your input and try again.',
      NETWORK_ERROR: 'Network connection error. Please check your internet.',
      UNKNOWN_ERROR: 'Something went wrong. Please try again.',
    };

    return messages[code] || `Error: ${originalMessage}`;
  }

  /**
   * Convert error to event for accessibility announcements
   *
   * @param error - The error
   * @returns Error event for live region announcement
   */
  toEvent(error: AppError): ErrorOccurredEvent {
    return {
      code: error.code,
      message: error.message,
      context: error.context,
      recoverable: error.recoverable,
    };
  }
}
