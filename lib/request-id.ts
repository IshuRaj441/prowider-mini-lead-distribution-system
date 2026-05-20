/**
 * FIX #10: Request ID Middleware
 * 
 * Generates and tracks request IDs for distributed tracing
 * Helps debug issues across services and requests
 */

import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'

const REQUEST_ID_HEADER = 'x-request-id'

/**
 * Get or generate request ID for tracing
 */
export function getRequestId(request: NextRequest): string {
  // Check if request ID is already present
  const existingId = request.headers.get(REQUEST_ID_HEADER)
  if (existingId) {
    return existingId
  }

  // Generate new request ID
  return randomUUID()
}

/**
 * Add request ID to response headers
 */
export function addRequestIdToResponse(request: NextRequest, response: NextResponse): NextResponse {
  const requestId = getRequestId(request)
  response.headers.set(REQUEST_ID_HEADER, requestId)
  return response
}

/**
 * Middleware wrapper to add request ID tracking
 */
export function withRequestId(handler: (request: NextRequest) => Promise<NextResponse>) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const requestId = getRequestId(request)
    
    // Add request ID to request headers for downstream use
    const requestWithId = new NextRequest(request.url, {
      ...request,
      headers: new Headers(request.headers),
    })
    requestWithId.headers.set(REQUEST_ID_HEADER, requestId)

    const response = await handler(requestWithId)
    return addRequestIdToResponse(requestWithId, response)
  }
}
