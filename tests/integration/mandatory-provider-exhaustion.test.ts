/**
 * FIX #11: Test for Mandatory Provider Exhaustion
 * 
 * Verifies that mandatory provider rule is enforced:
 * - When mandatory provider has no quota, transaction should fail
 * - Error should be MandatoryProviderUnavailableError
 * - No partial assignments should occur
 */

import { prisma } from '@/lib/prisma'
import { AllocationService } from '@/services/allocation-service'
import { MandatoryProviderUnavailableError } from '@/lib/errors/app-error'

describe('Mandatory Provider Exhaustion', () => {
  beforeAll(async () => {
    await prisma.leadAssignment.deleteMany()
    await prisma.lead.deleteMany()

    const providerIds = [1, 2, 3, 4, 5, 6, 7, 8]
    for (const id of providerIds) {
      await prisma.provider.upsert({
        where: { id },
        update: {},
        create: {
          id,
          name: `Provider ${id}`,
          monthlyQuota: 10,
          remainingQuota: 10,
        },
      })
    }

    await prisma.provider.update({
      where: { id: 1 },
      data: { remainingQuota: 0 },
    })
  })

  afterAll(async () => {
    await prisma.provider.updateMany({
      data: { remainingQuota: 10 },
    })
  })

  it('should fail transaction when mandatory provider has no quota', async () => {
    await expect(
      prisma.$transaction(async (tx) => {
        // Create lead
        const lead = await tx.lead.create({
          data: {
            customerName: 'Test Customer',
            phoneNumber: '5550000001',
            city: 'Test City',
            description: 'Test description for mandatory provider test',
            serviceId: 1,
          },
        })

        // Try to assign providers - should fail because Provider 1 is mandatory and exhausted
        await AllocationService.assignProvidersToLead(tx, lead.id, 1)
      })
    ).rejects.toThrow(MandatoryProviderUnavailableError)
  })

  it('should not create partial assignments when mandatory provider exhausted', async () => {
    try {
      await prisma.$transaction(async (tx) => {
        // Create lead
        const lead = await tx.lead.create({
          data: {
            customerName: 'Test Customer',
            phoneNumber: '5550000002',
            city: 'Test City',
            description: 'Test description for partial assignment test',
            serviceId: 1,
          },
        })

        // Try to assign providers - should fail
        await AllocationService.assignProvidersToLead(tx, lead.id, 1)
      })
    } catch (error) {
      // Expected to fail
    }

    // Verify no lead was created (transaction rolled back)
    const lead = await prisma.lead.findUnique({
      where: { phoneNumber_serviceId: { phoneNumber: '5550000002', serviceId: 1 } },
    })
    expect(lead).toBeNull()

    // Verify no assignments were created
    const assignments = await prisma.leadAssignment.findMany()
    expect(assignments).toHaveLength(0)
  })

  it('should succeed when mandatory provider has quota', async () => {
    // Reset Provider 1 quota
    await prisma.provider.update({
      where: { id: 1 },
      data: { remainingQuota: 10 },
    })

    const result = await prisma.$transaction(async (tx) => {
      // Create lead
      const lead = await tx.lead.create({
        data: {
          customerName: 'Test Customer',
          phoneNumber: '5550000003',
          city: 'Test City',
          description: 'Test description for successful assignment',
          serviceId: 1,
        },
      })

      // Assign providers - should succeed
      const assignedProviderIds = await AllocationService.assignProvidersToLead(tx, lead.id, 1)
      return { lead, assignedProviderIds }
    })

    // Verify lead was created
    expect(result.lead).toBeDefined()
    expect(result.lead.phoneNumber).toBe('5550000003')

    // Verify mandatory provider was assigned
    expect(result.assignedProviderIds).toContain(1)

    // Verify assignments were created
    const assignments = await prisma.leadAssignment.findMany({
      where: { leadId: result.lead.id },
    })
    expect(assignments.length).toBeGreaterThan(0)
  })
})
