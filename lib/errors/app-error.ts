/**
 * FIX #1 & #2: Enterprise-grade Domain Error Classes
 * 
 * Custom error classes for different error types with proper HTTP status codes
 * Enables proper error handling, logging, and API responses
 */

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code: string = 'INTERNAL_ERROR',
    public isOperational: boolean = true
  ) {
    super(message)
    this.name = this.constructor.name
    Error.captureStackTrace(this, this.constructor)
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR')
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(message, 404, 'NOT_FOUND')
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT_ERROR')
  }
}

export class InsufficientQuotaError extends AppError {
  constructor(message: string) {
    super(message, 400, 'INSUFFICIENT_QUOTA')
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string) {
    super(message, 401, 'AUTHENTICATION_ERROR')
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized access') {
    super(message, 401, 'UNAUTHORIZED')
  }
}

export class DatabaseError extends AppError {
  constructor(message: string) {
    super(message, 500, 'DATABASE_ERROR')
  }
}

/**
 * FIX #1: Domain-specific error for mandatory provider unavailability
 * Thrown when a mandatory provider has exhausted quota
 * HTTP 409 - Business rule violation
 */
export class MandatoryProviderUnavailableError extends AppError {
  constructor(providerId: number) {
    super(
      `Mandatory provider ${providerId} has exhausted quota and cannot be assigned. This violates business rules.`,
      409,
      'MANDATORY_PROVIDER_UNAVAILABLE'
    )
  }
}

/**
 * FIX #2: Domain-specific error for quota exhaustion
 * Thrown when insufficient quota is available for allocation
 * HTTP 503 - Service unavailable due to resource exhaustion
 */
export class QuotaExhaustionError extends AppError {
  constructor(message: string = 'Insufficient provider quota available') {
    super(message, 503, 'QUOTA_EXHAUSTED')
  }
}

/**
 * FIX #3: Domain-specific error for allocation conflicts
 * Thrown when concurrent allocation attempts conflict
 * HTTP 409 - Conflict with concurrent operation
 */
export class AllocationConflictError extends AppError {
  constructor(message: string = 'Allocation conflict detected') {
    super(message, 409, 'ALLOCATION_CONFLICT')
  }
}

/**
 * FIX #2: Domain-specific error for duplicate lead
 * Thrown when attempting to create a duplicate lead
 * HTTP 409 - Conflict with existing resource
 */
export class DuplicateLeadError extends AppError {
  constructor(phoneNumber: string, serviceId: number) {
    super(
      `Lead with phone number ${phoneNumber} and service ID ${serviceId} already exists`,
      409,
      'DUPLICATE_LEAD'
    )
  }
}
