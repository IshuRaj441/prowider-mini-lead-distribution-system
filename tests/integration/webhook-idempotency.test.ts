/**
 * FIX #13: Webhook Idempotency Tests
 * 
 * Validates that webhook processing is exactly-once:
 * - FIX #3: Check BEFORE transaction
 * - Duplicate webhook retries are safe
 * - Event processing is idempotent
 */

import { describe, it, expect, beforeEach } from '@jest/globals'
import { prisma } from '@/lib/prisma'
import { AllocationService } from '@/services/allocation-service'
import crypto from 'crypto'

describe('Webhook Idempotency', () => {
  beforeEach(async () => {
    // Clean up webhook events
    await prisma.webhookEvent.deleteMany()
    // Ensure providers have quota for quota reset operations
    await prisma.provider.updateMany({
      data: { remainingQuota: 10 }
    })
  })

  it('should prevent duplicate event processing', async () => {
    const eventId = crypto.randomUUID()
    
    // Process event first time
    await prisma.$transaction(async (tx: any) => {
      const claimed = await AllocationService.claimWebhookEvent(tx, eventId)
      expect(claimed).toBe(true)
      await AllocationService.resetProviderQuotas(tx)
    })

    // Try to process same event again
    const alreadyProcessed = await AllocationService.isWebhookEventProcessed(prisma, eventId)
    expect(alreadyProcessed).toBe(true)
  })

  it('should handle concurrent duplicate webhook requests', async () => {
    const eventId = crypto.randomUUID()
    
    // Simulate 10 concurrent webhook requests with same eventId
    const promises = Array.from({ length: 10 }, async () => {
      return prisma.$transaction(async (tx: any) => {
        const claimed = await AllocationService.claimWebhookEvent(tx, eventId)
        if (!claimed) {
          return { processed: false, skipped: true }
        }
        await AllocationService.resetProviderQuotas(tx)
        return { processed: true, skipped: false }
      })
    })

    const results = await Promise.all(promises)

    // Only one should have processed the event
    const processedCount = results.filter(r => r.processed).length
    const skippedCount = results.filter(r => r.skipped).length

    expect(processedCount).toBe(1)
    expect(skippedCount).toBe(9)
  })

  it('should allow processing of different events', async () => {
    const eventIds = [crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID()]
    
    for (const eventId of eventIds) {
      await prisma.$transaction(async (tx: any) => {
        const claimed = await AllocationService.claimWebhookEvent(tx, eventId)
        expect(claimed).toBe(true)
        await AllocationService.resetProviderQuotas(tx)
      })
    }

    // All events should be marked as processed
    for (const eventId of eventIds) {
      const alreadyProcessed = await AllocationService.isWebhookEventProcessed(prisma, eventId)
      expect(alreadyProcessed).toBe(true)
    }
  })
})
