/**
 * FIX #2: Centralized Error Handling
 * 
 * Enterprise-grade error handling utility that:
 * - Maps domain errors to proper HTTP status codes
 * - Returns consistent JSON error responses
 * - Logs errors appropriately
 * - Provides correlation IDs for tracing
 */

import { NextResponse } from 'next/server'
import { AppError } from './errors/app-error'
import { logger } from './logger'

interface ErrorResponse {
  success: false
  error: {
    code: string
    message: string
    correlationId?: string
    details?: unknown
  }
}

/**
 * Generate a correlation ID for error tracing
 */
function generateCorrelationId(): string {
  return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Handle AppError instances and return proper NextResponse
 */
export function handleApiError(error: unknown): NextResponse<ErrorResponse> {
  const correlationId = generateCorrelationId()

  // Log the error with correlation ID
  if (error instanceof AppError) {
    logger.error('API Error', error, { correlationId, code: error.code, statusCode: error.statusCode })
  } else if (error instanceof Error) {
    logger.error('Unexpected API Error', error, { correlationId })
  } else {
    logger.error('Unknown error type', undefined, { correlationId, error: String(error) })
  }

  // Handle known AppError instances
  if (error instanceof AppError) {
    const response: ErrorResponse = {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        correlationId,
      },
    }

    // Include details for validation errors
    if (error.code === 'VALIDATION_ERROR' && (error as any).details) {
      response.error.details = (error as any).details
    }

    return NextResponse.json(response, { status: error.statusCode })
  }

  // Handle Zod validation errors
  if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError') {
    const response: ErrorResponse = {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation error',
        correlationId,
        details: (error as any).errors,
      },
    }
    return NextResponse.json(response, { status: 400 })
  }

  // Handle Prisma unique constraint violations
  if (error && typeof error === 'object' && 'code' in error) {
    const prismaError = error as { code: string; meta?: { target?: string[] } }
    
    if (prismaError.code === 'P2002') {
      const response: ErrorResponse = {
        success: false,
        error: {
          code: 'DUPLICATE_ERROR',
          message: 'A record with this unique constraint already exists',
          correlationId,
          details: { target: prismaError.meta?.target },
        },
      }
      return NextResponse.json(response, { status: 409 })
    }
  }

  // Handle unknown/unexpected errors
  const response: ErrorResponse = {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      correlationId,
    },
  }

  // In development, include more details
  if (process.env.NODE_ENV === 'development' && error instanceof Error) {
    response.error.message = error.message
    response.error.details = {
      stack: error.stack,
    }
  }

  return NextResponse.json(response, { status: 500 })
}

/**
 * Wrap async route handlers with error handling
 */
export function withErrorHandler<T>(
  handler: () => Promise<NextResponse<T>>
): Promise<NextResponse<T | ErrorResponse>> {
  return handler().catch(handleApiError)
}
