import { prisma } from '@/lib/prisma'
import { MANDATORY_PROVIDERS, FAIR_ALLOCATION_POOLS, REQUIRED_ASSIGNMENTS } from '@/lib/allocation-config'
import { MandatoryProviderUnavailableError, QuotaExhaustionError } from '@/lib/errors/app-error'

/**
 * Allocation Engine
 * 
 * Implements enterprise-grade lead distribution with:
 * - Mandatory provider assignments
 * - Persistent round-robin fair allocation
 * - Quota enforcement
 * - Concurrency-safe transactions
 * - Idempotency guarantees
 */

export class AllocationService {
  /**
   * Assign providers to a lead using transaction-safe allocation
   * 
   * This method must be called within a Prisma transaction
   * to ensure atomicity and prevent race conditions
   * 
   * FIX #1 & #2: Uses atomic operations to prevent race conditions:
   * - SELECT FOR UPDATE on allocation state
   * - Atomic quota decrement with WHERE remainingQuota > 0
   * - Proper quota exhaustion handling
   */
  static async assignProvidersToLead(
    tx: any,
    leadId: number,
    serviceId: number
  ): Promise<number[]> {
    // Get mandatory providers for this service
    const mandatoryProviderIds = MANDATORY_PROVIDERS[serviceId] || []
    
    // Get fair allocation pool for this service
    const fairPoolIds = FAIR_ALLOCATION_POOLS[serviceId] || []

    // Step 1: Assign mandatory providers (MUST ALWAYS succeed)
    const assignedProviderIds: number[] = []

    for (const providerId of mandatoryProviderIds) {
      // FIX #1: Atomic quota decrement with WHERE clause to prevent negative quota
      const result = await tx.provider.updateMany({
        where: {
          id: providerId,
          remainingQuota: { gt: 0 },
        },
        data: { remainingQuota: { decrement: 1 } },
      })

      // FIX #1: CRITICAL - If mandatory provider has no quota, FAIL TRANSACTION
      // Business rule: Mandatory providers MUST ALWAYS receive lead assignment
      if (result.count === 0) {
        throw new MandatoryProviderUnavailableError(providerId)
      }

      // Create assignment
      await tx.leadAssignment.create({
        data: {
          leadId,
          providerId,
        },
      })

      assignedProviderIds.push(providerId)
    }

    // Step 2: Fill remaining slots using persistent round-robin
    const remainingSlots = REQUIRED_ASSIGNMENTS - assignedProviderIds.length

    if (remainingSlots > 0 && fairPoolIds.length > 0) {
      // FIX #1: Use SELECT FOR UPDATE to lock allocation state row
      // This prevents concurrent transactions from reading the same currentIndex
      let allocationState = await tx.$queryRaw`
        SELECT * FROM "AllocationState" 
        WHERE "serviceId" = ${serviceId}
        FOR UPDATE
      `

      // Initialize state if doesn't exist
      if (!allocationState || allocationState.length === 0) {
        allocationState = await tx.allocationState.create({
          data: {
            serviceId,
            currentIndex: 0,
          },
        })
      } else {
        allocationState = allocationState[0]
      }

      // FIX #7: Redesigned fairness algorithm
      // Track which providers we've attempted to avoid infinite loops
      const attemptedProviders = new Set<number>()
      let selectedCount = 0

      while (selectedCount < remainingSlots && attemptedProviders.size < fairPoolIds.length) {
        // Read currentIndex WITHOUT incrementing first
        const currentIndex = allocationState.currentIndex % fairPoolIds.length
        const providerId = fairPoolIds[currentIndex]

        // Skip if we've already tried this provider (handles exhausted providers)
        if (attemptedProviders.has(providerId)) {
          // Increment currentIndex to move to next provider
          allocationState = await tx.allocationState.update({
            where: { serviceId },
            data: { currentIndex: { increment: 1 } },
          })
          continue
        }
        attemptedProviders.add(providerId)

        // FIX #2: Atomic quota decrement with WHERE clause
        const result = await tx.provider.updateMany({
          where: {
            id: providerId,
            remainingQuota: { gt: 0 },
          },
          data: { remainingQuota: { decrement: 1 } },
        })

        if (result.count > 0) {
          // Create assignment
          await tx.leadAssignment.create({
            data: {
              leadId,
              providerId,
            },
          })

          assignedProviderIds.push(providerId)
          selectedCount++

          // Only increment currentIndex AFTER successful assignment
          allocationState = await tx.allocationState.update({
            where: { serviceId },
            data: { currentIndex: { increment: 1 } },
          })
        } else {
          // Provider has no quota, increment to skip
          allocationState = await tx.allocationState.update({
            where: { serviceId },
            data: { currentIndex: { increment: 1 } },
          })
        }
      }

      // FIX #2: Quota exhaustion handling with proper domain error
      // If we couldn't assign all required providers, fail the transaction
      if (assignedProviderIds.length < REQUIRED_ASSIGNMENTS) {
        throw new QuotaExhaustionError(
          `Insufficient provider quota. Only ${assignedProviderIds.length} providers available, but ${REQUIRED_ASSIGNMENTS} required.`
        )
      }
    }

    return assignedProviderIds
  }

  /**
   * Reset provider quotas (called via webhook)
   * This is idempotent - can be called multiple times safely
   */
  static async resetProviderQuotas(tx: any): Promise<void> {
    await tx.provider.updateMany({
      data: {
        remainingQuota: 10,
      },
    })
  }

  /**
   * Check if a webhook event has already been processed
   * Used for idempotency
   */
  static async isWebhookEventProcessed(tx: any, eventId: string): Promise<boolean> {
    const existingEvent = await tx.webhookEvent.findUnique({
      where: { eventId },
    })
    return !!existingEvent
  }

  /**
   * Mark a webhook event as processed
   */
  static async markWebhookEventProcessed(tx: any, eventId: string): Promise<void> {
    // Idempotent write to avoid Prisma P2002 (unique constraint) -> HTTP 409
    // Assumes `eventId` is uniquely constrained in the `webhookEvent` table.
    await tx.webhookEvent.upsert({
      where: { eventId },
      create: { eventId },
      update: {},
    })
  }
}
