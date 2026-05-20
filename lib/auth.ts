/**
 * FIX #5: API Authentication Middleware
 * 
 * Lightweight production-safe authentication using API keys.
 * Protects sensitive endpoints like webhooks, admin routes, and quota reset operations.
 */

import { NextRequest } from 'next/server'
import { UnauthorizedError } from './errors/app-error'
import { logger } from './logger'

/**
 * Verify API key from request headers
 */
export function verifyApiKey(request: NextRequest): void {
  const apiKey = request.headers.get('x-api-key')
  const validApiKey = process.env.API_KEY

  // Skip authentication in development if API_KEY not set
  if (process.env.NODE_ENV === 'development' && !validApiKey) {
    logger.warn('API authentication bypassed in development (API_KEY not set)')
    return
  }

  // Require API key in production
  if (!validApiKey) {
    logger.error('API_KEY environment variable not configured')
    throw new UnauthorizedError('API authentication not configured')
  }

  if (!apiKey) {
    throw new UnauthorizedError('Missing API key header')
  }

  if (apiKey !== validApiKey) {
    logger.warn('Invalid API key attempt', { ip: request.headers.get('x-forwarded-for') })
    throw new UnauthorizedError('Invalid API key')
  }
}

/**
 * Middleware wrapper to protect routes with API key authentication
 */
export function withAuth(handler: (request: NextRequest) => Promise<Response>) {
  return async (request: NextRequest): Promise<Response> => {
    try {
      verifyApiKey(request)
      return handler(request)
    } catch (error) {
      const { handleApiError } = await import('./error-handler')
      return handleApiError(error)
    }
  }
}
