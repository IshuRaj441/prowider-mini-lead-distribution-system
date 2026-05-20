/**
 * FIX #11: Test for Error Handling
 * 
 * Verifies proper error responses with correct HTTP status codes:
 * - MandatoryProviderUnavailableError → 409
 * - QuotaExhaustionError → 503
 * - DuplicateLeadError → 409
 * - ValidationError → 400
 * - UnauthorizedError → 401
 */

import { MandatoryProviderUnavailableError, QuotaExhaustionError, DuplicateLeadError, ValidationError, UnauthorizedError } from '@/lib/errors/app-error'

describe('Error Handling', () => {
  it('MandatoryProviderUnavailableError should have correct status code and message', () => {
    const error = new MandatoryProviderUnavailableError(1)
    expect(error.statusCode).toBe(409)
    expect(error.code).toBe('MANDATORY_PROVIDER_UNAVAILABLE')
    expect(error.message).toContain('Mandatory provider 1')
    expect(error.isOperational).toBe(true)
  })

  it('QuotaExhaustionError should have correct status code and message', () => {
    const error = new QuotaExhaustionError('Custom quota message')
    expect(error.statusCode).toBe(503)
    expect(error.code).toBe('QUOTA_EXHAUSTED')
    expect(error.message).toBe('Custom quota message')
    expect(error.isOperational).toBe(true)
  })

  it('DuplicateLeadError should have correct status code and message', () => {
    const error = new DuplicateLeadError('5550000000', 1)
    expect(error.statusCode).toBe(409)
    expect(error.code).toBe('DUPLICATE_LEAD')
    expect(error.message).toContain('5550000000')
    expect(error.message).toContain('1')
    expect(error.isOperational).toBe(true)
  })

  it('ValidationError should have correct status code', () => {
    const error = new ValidationError('Validation failed')
    expect(error.statusCode).toBe(400)
    expect(error.code).toBe('VALIDATION_ERROR')
    expect(error.isOperational).toBe(true)
  })

  it('UnauthorizedError should have correct status code', () => {
    const error = new UnauthorizedError('Not authorized')
    expect(error.statusCode).toBe(401)
    expect(error.code).toBe('UNAUTHORIZED')
    expect(error.message).toBe('Not authorized')
    expect(error.isOperational).toBe(true)
  })

  it('UnauthorizedError should have default message', () => {
    const error = new UnauthorizedError()
    expect(error.statusCode).toBe(401)
    expect(error.code).toBe('UNAUTHORIZED')
    expect(error.message).toBe('Unauthorized access')
  })
})
