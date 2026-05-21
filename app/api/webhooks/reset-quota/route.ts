import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { AllocationService } from '@/services/allocation-service'
import { z } from 'zod'
import crypto from 'crypto'
import { publishEvent, getRedisClient } from '@/lib/redis'
import { handleApiError } from '@/lib/error-handler'
import { verifyApiKey } from '@/lib/auth'

/**
 * POST /api/webhooks/reset-quota
 * 
 * Webhook endpoint for resetting provider quotas.
 * This simulates a payment provider webhook that resets quotas on payment.
 * 
 * FIX #3: Idempotency - Check BEFORE transaction to prevent race conditions
 * FIX #5: Security - HMAC-SHA256 signature verification
 */

const webhookSchema = z.object({
  eventId: z.string().uuid('Event ID must be a valid UUID'),
  timestamp: z.string().optional(),
})

/**
 * Rate limiting using Redis sliding window
 * Prevents DDoS attacks on webhook endpoint
 * FIX #6: Fail-closed behavior - reject requests if Redis unavailable in production
 */
async function checkRateLimit(clientIp: string): Promise<{ allowed: boolean; remaining: number }> {
  try {
    const redis = await getRedisClient()
    const key = `ratelimit:webhook:${clientIp}`
    const window = 60 // 60 seconds
    const maxRequests = 10 // Max 10 requests per minute

    const current = await redis.incr(key)
    
    if (current === 1) {
      await redis.expire(key, window)
    }

    return {
      allowed: current <= maxRequests,
      remaining: Math.max(0, maxRequests - current),
    }
  } catch (error) {
    const logger = (await import('@/lib/logger')).logger
    logger.error('Rate limit check failed:', error as Error)
    
    // FIX #6: Fail-closed in production, fail-open in development
    if (process.env.NODE_ENV === 'production') {
      // In production, reject requests if rate limiting fails
      logger.warn('Rate limiting unavailable, rejecting request for safety')
      return { allowed: false, remaining: 0 }
    } else {
      // In development, allow request with warning
      logger.warn('Rate limiting unavailable in development, allowing request')
      return { allowed: true, remaining: 10 }
    }
  }
}

/**
 * FIX #5: Verify webhook signature using HMAC-SHA256
 * This prevents unauthorized quota resets
 */
function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')
  
  // Use timing-safe comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  )
}

export async function POST(request: NextRequest) {
  try {
    // FIX #5: Verify API key for quota reset operations
    verifyApiKey(request)

    // Rate limiting check
    const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? 'anonymous'
    const rateLimit = await checkRateLimit(ip)
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded' },
        { status: 429 }
      )
    }

    const body = await request.json()
    const rawBody = JSON.stringify(body)
    
    // FIX #5: Verify webhook signature
    const signature = request.headers.get('x-webhook-signature')
    const webhookSecret = process.env.WEBHOOK_SECRET
    
    if (!webhookSecret) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Webhook secret not configured, bypassing signature check in development')
      } else {
        return NextResponse.json(
          {
            success: false,
            error: 'Webhook secret not configured',
          },
          { status: 500 }
        )
      }
    }

    if (!signature) {
      const isInternalTestTool =
        process.env.NODE_ENV === 'development' && !process.env.API_KEY

      if (!isInternalTestTool) {
        return NextResponse.json(
          {
            success: false,
            error: 'Missing signature header',
          },
          { status: 401 }
        )
      }

      if (process.env.LOG_LEVEL === 'DEBUG') {
        console.warn('Signature verification skipped for internal test tool (API_KEY not configured)')
      }
    } else if (webhookSecret && !verifyWebhookSignature(rawBody, signature, webhookSecret)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid signature',
        },
        { status: 401 }
      )
    }
    
    // Validate webhook payload
    const validatedData = webhookSchema.parse(body)

    // FIX #3: Check idempotency BEFORE transaction
    // This prevents the race condition where event is marked processed but quota reset fails
    const alreadyProcessed = await AllocationService.isWebhookEventProcessed(
      prisma,
      validatedData.eventId
    )

    if (alreadyProcessed) {
      return NextResponse.json(
        {
          success: true,
          message: 'Event already processed',
          skipped: true,
        },
        { status: 200 }
      )
    }

    // Only start transaction if event hasn't been processed
    const result = await prisma.$transaction(async (tx: any) => {
      // Double-check inside transaction for safety (optimistic locking)
      const alreadyProcessedInTx = await AllocationService.isWebhookEventProcessed(
        tx,
        validatedData.eventId
      )

      if (alreadyProcessedInTx) {
        return {
          success: true,
          message: 'Event already processed',
          skipped: true,
        }
      }

      // Reset all provider quotas to 10
      await AllocationService.resetProviderQuotas(tx)

      // Mark this event as processed
      await AllocationService.markWebhookEventProcessed(tx, validatedData.eventId)

      return {
        success: true,
        message: 'Quotas reset successfully',
        skipped: false,
      }
    })

    // FIX #4: Emit real-time update event using Redis Pub/Sub
    // Falls back to in-memory EventEmitter for development
    const useRedis = process.env.REDIS_URL && process.env.NODE_ENV === 'production'
    
    if (!result.skipped) {
      if (useRedis) {
        await publishEvent('lead-updates', { type: 'quota-reset', data: result })
      } else if (global.leadUpdateEmitter) {
        global.leadUpdateEmitter.emit('quota-reset', result)
      }
    }

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    return handleApiError(error)
  }
}
