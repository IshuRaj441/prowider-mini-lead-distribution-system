/**
 * Assignment compliance: mandatory providers, exactly 3 assignments, no duplicates
 */

import { describe, it, expect, beforeEach } from '@jest/globals'
import { prisma } from '@/lib/prisma'
import { AllocationService } from '@/services/allocation-service'
import {
  MANDATORY_PROVIDERS,
  FAIR_ALLOCATION_POOLS,
  REQUIRED_ASSIGNMENTS,
} from '@/lib/allocation-config'

describe('Allocation Rules Compliance', () => {
  beforeEach(async () => {
    await prisma.allocationState.deleteMany()
    await prisma.provider.updateMany({ data: { remainingQuota: 100 } })
    for (const serviceId of [1, 2, 3]) {
      await prisma.allocationState.upsert({
        where: { serviceId },
        update: { currentIndex: 0 },
        create: { serviceId, currentIndex: 0 },
      })
    }
  })

  for (const serviceId of [1, 2, 3]) {
    it(`service ${serviceId}: assigns exactly ${REQUIRED_ASSIGNMENTS} providers with mandatory rules`, async () => {
      const mandatory = MANDATORY_PROVIDERS[serviceId]
      const fairPool = FAIR_ALLOCATION_POOLS[serviceId]

      const assignedProviderIds = await prisma.$transaction(async (tx) => {
        const lead = await tx.lead.create({
          data: {
            customerName: 'Rules Test',
            phoneNumber: `rules-${serviceId}-${Date.now()}`,
            city: 'Test City',
            description: 'Assignment rules compliance test lead',
            serviceId,
          },
        })
        return AllocationService.assignProvidersToLead(tx, lead.id, serviceId)
      })

      expect(assignedProviderIds).toHaveLength(REQUIRED_ASSIGNMENTS)
      expect(new Set(assignedProviderIds).size).toBe(REQUIRED_ASSIGNMENTS)

      for (const providerId of mandatory) {
        expect(assignedProviderIds).toContain(providerId)
      }

      const fairSlotCount = REQUIRED_ASSIGNMENTS - mandatory.length
      const fairAssignments = assignedProviderIds.filter((id) => fairPool.includes(id))
      expect(fairAssignments).toHaveLength(fairSlotCount)
    })
  }
})
