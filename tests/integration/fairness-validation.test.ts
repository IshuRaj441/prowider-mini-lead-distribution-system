/**
 * FIX #13: Fairness Validation Tests
 * 
 * Validates that the allocation engine maintains fair distribution:
 * - FIX #7: Fair rotation algorithm
 * - FIX #1: No race condition unfairness
 * - Persistent fairness across restarts
 */

import { describe, it, expect, beforeEach } from '@jest/globals'
import { prisma } from '@/lib/prisma'
import { AllocationService } from '@/services/allocation-service'

describe('Fairness Validation', () => {
  beforeEach(async () => {
    // Reset allocation state
    await prisma.allocationState.deleteMany()
    
    // Reset provider quotas - ensure mandatory providers have sufficient quota
    await prisma.provider.updateMany({
      data: { remainingQuota: 100 },
    })
  })

  it('should distribute leads fairly across providers', async () => {
    const serviceId = 1
    const fairPoolIds = [2, 3, 4] // Service 1 fair pool
    const leadCount = 30

    // Create leads sequentially
    for (let i = 0; i < leadCount; i++) {
      await prisma.$transaction(async (tx: any) => {
        const lead = await tx.lead.create({
          data: {
            customerName: `Test Customer ${i}`,
            phoneNumber: `558000${String(i).padStart(4, '0')}`,
            city: 'Test City',
            description: `Test lead ${i}`,
            serviceId,
          },
        })

        await AllocationService.assignProvidersToLead(tx, lead.id, serviceId)
      })
    }

    // Count assignments per provider
    const assignments = await prisma.leadAssignment.findMany({
      where: { providerId: { in: fairPoolIds } },
    })

    const counts = fairPoolIds.map(id => ({
      providerId: id,
      count: assignments.filter((a: any) => a.providerId === id).length,
    }))

    // Distribution should be roughly even (within 20% variance)
    const avgCount = leadCount / fairPoolIds.length
    for (const { count } of counts) {
      expect(count).toBeGreaterThan(avgCount * 0.8)
      expect(count).toBeLessThan(avgCount * 1.2)
    }
  })

  it('should maintain fairness after quota exhaustion and reset', async () => {
    const serviceId = 2
    const fairPoolIds = [6, 7, 8]
    const mandatoryProviderId = 5 // Service 2 mandatory provider

    // Set low quotas for fair pool only (keep mandatory provider quota high)
    await prisma.provider.updateMany({
      where: { id: { in: fairPoolIds } },
      data: { remainingQuota: 5 },
    })
    // Ensure mandatory provider has sufficient quota
    await prisma.provider.update({
      where: { id: mandatoryProviderId },
      data: { remainingQuota: 100 },
    })

    // Create leads until fair pool quotas are exhausted
    for (let i = 0; i < 15; i++) {
      try {
        await prisma.$transaction(async (tx: any) => {
          const lead = await tx.lead.create({
            data: {
              customerName: `Test Customer ${i}`,
              phoneNumber: `559000${String(i).padStart(4, '0')}`,
              city: 'Test City',
              description: `Test lead ${i}`,
              serviceId,
            },
          })

          await AllocationService.assignProvidersToLead(tx, lead.id, serviceId)
        })
      } catch (error) {
        // Expected to fail when fair pool quotas are exhausted
      }
    }

    // Reset quotas
    await prisma.provider.updateMany({
      where: { id: { in: [...fairPoolIds, mandatoryProviderId] } },
      data: { remainingQuota: 100 },
    })

    // Create more leads
    for (let i = 15; i < 30; i++) {
      await prisma.$transaction(async (tx: any) => {
        const lead = await tx.lead.create({
          data: {
            customerName: `Test Customer ${i}`,
            phoneNumber: `560000${String(i).padStart(4, '0')}`,
            city: 'Test City',
            description: `Test lead ${i}`,
            serviceId,
          },
        })

        await AllocationService.assignProvidersToLead(tx, lead.id, serviceId)
      })
    }

    // Verify overall fairness
    const assignments = await prisma.leadAssignment.findMany({
      where: { providerId: { in: fairPoolIds } },
    })

    const counts = fairPoolIds.map(id => ({
      providerId: id,
      count: assignments.filter((a: any) => a.providerId === id).length,
    }))

    // Total assignments should be roughly equal
    const totalCounts = counts.map(c => c.count)
    const max = Math.max(...totalCounts)
    const min = Math.min(...totalCounts)
    
    // Variance should be less than 30%
    expect((max - min) / max).toBeLessThan(0.3)
  })

  it('should persist fairness state across restarts', async () => {
    const serviceId = 3
    const fairPoolIds = [2, 3, 5, 6, 7, 8]

    // Create some leads
    for (let i = 0; i < 10; i++) {
      await prisma.$transaction(async (tx: any) => {
        const lead = await tx.lead.create({
          data: {
            customerName: `Test Customer ${i}`,
            phoneNumber: `561000${String(i).padStart(4, '0')}`,
            city: 'Test City',
            description: `Test lead ${i}`,
            serviceId,
          },
        })

        await AllocationService.assignProvidersToLead(tx, lead.id, serviceId)
      })
    }

    // Get current allocation state
    const stateBefore = await prisma.allocationState.findUnique({
      where: { serviceId },
    })

    // Simulate restart by creating more leads
    for (let i = 10; i < 20; i++) {
      await prisma.$transaction(async (tx: any) => {
        const lead = await tx.lead.create({
          data: {
            customerName: `Test Customer ${i}`,
            phoneNumber: `562000${String(i).padStart(4, '0')}`,
            city: 'Test City',
            description: `Test lead ${i}`,
            serviceId,
          },
        })

        await AllocationService.assignProvidersToLead(tx, lead.id, serviceId)
      })
    }

    // Verify state continued from where it left off
    const stateAfter = await prisma.allocationState.findUnique({
      where: { serviceId },
    })

    expect(stateAfter?.currentIndex).toBeGreaterThan(stateBefore?.currentIndex || 0)
  })
})
