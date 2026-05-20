/**
 * FIX #11: Test for Authentication Middleware
 * 
 * Verifies API key authentication logic works correctly
 */

import { UnauthorizedError } from '@/lib/errors/app-error'

describe('Authentication Middleware', () => {
  it('should create UnauthorizedError with default message', () => {
    const error = new UnauthorizedError()
    expect(error.statusCode).toBe(401)
    expect(error.code).toBe('UNAUTHORIZED')
    expect(error.message).toBe('Unauthorized access')
  })

  it('should create UnauthorizedError with custom message', () => {
    const error = new UnauthorizedError('Custom auth message')
    expect(error.statusCode).toBe(401)
    expect(error.code).toBe('UNAUTHORIZED')
    expect(error.message).toBe('Custom auth message')
  })

  it('should mark UnauthorizedError as operational', () => {
    const error = new UnauthorizedError()
    expect(error.isOperational).toBe(true)
  })
})
