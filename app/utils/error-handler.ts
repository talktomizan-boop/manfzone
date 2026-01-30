/**
 * Centralized Error Handling Utilities
 */

import { DomainError } from '~/types/domain.types';

export function handleError(error: unknown): { message: string; code?: string } {
  console.error('Application Error:', error);

  if (error instanceof DomainError) {
    return {
      message: error.message,
      code: error.code,
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message,
    };
  }

  return {
    message: 'An unexpected error occurred',
  };
}

export function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.message.includes('network') || error.message.includes('fetch');
  }
  return false;
}

/**
 * Handle service-layer errors with context
 * @param error - The error object
 * @param context - Service method context
 */
export function handleServiceError(error: unknown, context: string): never {
  console.error(`[${context}] Service Error:`, error);

  if (error instanceof DomainError) {
    throw error;
  }

  if (error instanceof Error) {
    throw new DomainError(error.message, 'SERVICE_ERROR', 500);
  }

  throw new DomainError(
    'An unexpected service error occurred',
    'UNKNOWN_SERVICE_ERROR',
    500
  );
}
