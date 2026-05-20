/**
 * FIX #13: Concurrency Stress Tests
 * 
 * Validates that the allocation engine is safe under heavy concurrent load.
 * Tests for:
 * - FIX #1: Round-robin race condition with SELECT FOR UPDATE
 * - FIX #2: Quota race conditions with atomic updates
 * - FIX #7: Fairness under concurrency
 */

import { describe, it, expect, beforeAll } from '@jest/globals'
import { prisma } from '@/lib/prisma'
import { AllocationService } from '@/services/allocation-service'

describe('Allocation Service - Concurrency Stress Tests', () => {
  beforeAll(async () => {
    // Reset all provider quotas - ensure mandatory providers have sufficient quota
    await prisma.provider.updateMany({
      data: { remainingQuota: 100 },
    })
  })

  it('should handle 50 concurrent lead allocations without race conditions', async () => {
    const concurrentRequests = 50
    const serviceId = 1

    const promises = Array.from({ length: concurrentRequests }, async (_, i) => {
      return prisma.$transaction(async (tx: any) => {
        // Create lead
        const lead = await tx.lead.create({
          data: {
            customerName: `Test Customer ${i}`,
            phoneNumber: `555000${String(i).padStart(4, '0')}`,
            city: 'Test City',
            description: `Test lead ${i}`,
            serviceId,
          },
        })

        // Assign providers
        const assignedProviderIds = await AllocationService.assignProvidersToLead(
          tx,
          lead.id,
          serviceId
        )

        return { leadId: lead.id, assignedProviderIds }
      })
    })

    const results = await Promise.all(promises)

    // All requests should succeed
    expect(results.length).toBe(concurrentRequests)

    // Each lead should have exactly 3 providers assigned
    for (const result of results) {
      expect(result.assignedProviderIds.length).toBe(3)
    }

    // No duplicate assignments should exist
    const assignments = await prisma.leadAssignment.findMany()
    const uniqueAssignments = new Set(assignments.map(a => `${a.leadId}-${a.providerId}`))
    expect(uniqueAssignments.size).toBe(assignments.length)
  })

  it('should maintain fair distribution under concurrent load', async () => {
    const serviceId = 2
    const fairPoolIds = [6, 7, 8] // Service 2 fair pool
    const mandatoryProviderId = 5 // Service 2 mandatory provider

    // Reset allocation state
    await prisma.allocationState.deleteMany()
    await prisma.allocationState.create({
      data: { serviceId, currentIndex: 0 },
    })

    // Reset quotas - ensure mandatory provider has sufficient quota
    await prisma.provider.updateMany({
      where: { id: { in: [...fairPoolIds, mandatoryProviderId] } },
      data: { remainingQuota: 100 },
    })

    const concurrentRequests = 30

    const promises = Array.from({ length: concurrentRequests }, async (_, i) => {
      return prisma.$transaction(async (tx: any) => {
        const lead = await tx.lead.create({
          data: {
            customerName: `Test Customer ${i}`,
            phoneNumber: `556000${String(i).padStart(4, '0')}`,
            city: 'Test City',
            description: `Test lead ${i}`,
            serviceId,
          },
        })

        await AllocationService.assignProvidersToLead(tx, lead.id, serviceId)
      })
    })

    await Promise.all(promises)

    // Count assignments per provider
    const assignments = await prisma.leadAssignment.findMany({
      where: { providerId: { in: fairPoolIds } },
    })

    const counts = fairPoolIds.map(id => ({
      providerId: id,
      count: assignments.filter(a => a.providerId === id).length,
    }))

    // Distribution should be roughly even (within 20% variance)
    const avgCount = concurrentRequests / fairPoolIds.length
    for (const { count } of counts) {
      expect(count).toBeGreaterThan(avgCount * 0.8)
      expect(count).toBeLessThan(avgCount * 1.2)
    }
  })

  it('should handle quota exhaustion gracefully', async () => {
    const serviceId = 3
    // Use a fair pool provider (not mandatory) for quota exhaustion test
    const providerId = 2 // Provider 2 is in fair pool for service 3, not mandatory

    // Set quota to 5 for fair pool provider only
    await prisma.provider.update({
      where: { id: providerId },
      data: { remainingQuota: 5 },
    })
    // Ensure mandatory providers have sufficient quota
    await prisma.provider.updateMany({
      where: { id: { in: [1, 4] } }, // Mandatory providers for service 3
      data: { remainingQuota: 100 },
    })

    // Try to create 10 leads
    const promises = Array.from({ length: 10 }, async (_, i) => {
      return prisma.$transaction(async (tx: any) => {
        const lead = await tx.lead.create({
          data: {
            customerName: `Test Customer ${i}`,
            phoneNumber: `557000${String(i).padStart(4, '0')}`,
            city: 'Test City',
            description: `Test lead ${i}`,
            serviceId,
          },
        })

        try {
          await AllocationService.assignProvidersToLead(tx, lead.id, serviceId)
          return { success: true }
        } catch (error) {
          return { success: false, error: (error as Error).message }
        }
      })
    })

    const results = await Promise.all(promises)

    // Some should fail due to quota exhaustion
    const failures = results.filter(r => !r.success)
    expect(failures.length).toBeGreaterThan(0)

    // Verify quota never went negative
    const provider = await prisma.provider.findUnique({
      where: { id: providerId },
    })
    expect(provider?.remainingQuota).toBeGreaterThanOrEqual(0)
  })
})
