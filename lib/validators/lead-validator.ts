import { z } from 'zod'

/**
 * FIX #7: Input sanitization to prevent XSS and script injection
 * Sanitizes user input while preserving validation
 */

/**
 * Sanitize string input to prevent XSS and script injection
 * Removes HTML tags, scripts, and potentially dangerous characters
 */
function sanitizeString(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers like onclick=
    .trim()
}

export const createLeadSchema = z.object({
  customerName: z.string()
    .min(2, 'Customer name must be at least 2 characters')
    .max(100, 'Customer name must be less than 100 characters')
    .transform(sanitizeString),
  phoneNumber: z.string()
    .min(10, 'Phone number must be at least 10 characters')
    .max(20, 'Phone number must be less than 20 characters')
    .regex(/^[0-9+\-\s()]+$/, 'Phone number can only contain digits, spaces, and common phone symbols'),
  city: z.string()
    .min(2, 'City must be at least 2 characters')
    .max(100, 'City must be less than 100 characters')
    .transform(sanitizeString),
  serviceId: z.number().int().positive('Service ID must be a positive integer'),
  description: z.string()
    .min(10, 'Description must be at least 10 characters')
    .max(1000, 'Description must be less than 1000 characters')
    .transform(sanitizeString),
})

export type CreateLeadInput = z.infer<typeof createLeadSchema>
