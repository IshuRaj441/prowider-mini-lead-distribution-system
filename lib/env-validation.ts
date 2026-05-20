/**
 * FIX #10: Environment Validation
 * 
 * Validates required environment variables at startup
 * Prevents runtime errors due to missing configuration
 */

import { logger } from './logger'

interface EnvConfig {
  DATABASE_URL: string
  REDIS_URL?: string
  WEBHOOK_SECRET?: string
  API_KEY?: string
  NODE_ENV: string
  LOG_LEVEL?: string
}

/**
 * Validate environment variables
 * Throws error if required variables are missing
 */
export function validateEnv(): EnvConfig {
  const required = ['DATABASE_URL']
  const missing: string[] = []

  for (const key of required) {
    if (!process.env[key]) {
      missing.push(key)
    }
  }

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }

  // Warn about optional but recommended variables
  const recommended = ['WEBHOOK_SECRET', 'API_KEY']
  const missingRecommended: string[] = []

  for (const key of recommended) {
    if (!process.env[key]) {
      missingRecommended.push(key)
    }
  }

  if (missingRecommended.length > 0) {
    logger.warn(`Missing recommended environment variables: ${missingRecommended.join(', ')}`)
  }

  return {
    DATABASE_URL: process.env.DATABASE_URL!,
    REDIS_URL: process.env.REDIS_URL,
    WEBHOOK_SECRET: process.env.WEBHOOK_SECRET,
    API_KEY: process.env.API_KEY,
    NODE_ENV: process.env.NODE_ENV || 'development',
    LOG_LEVEL: process.env.LOG_LEVEL,
  }
}

/**
 * Get validated environment configuration
 */
export const env = validateEnv()
