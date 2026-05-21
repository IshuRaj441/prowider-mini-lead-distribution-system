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
    // Setup test database (delete children before parents due to FK constraints)
    await prisma.leadAssignment.deleteMany()
    await prisma.lead.deleteMany()
    await prisma.allocationState.deleteMany()
    await prisma.webhookEvent.deleteMany()
    await prisma.provider.deleteMany()

    // Create test providers

    await prisma.provider.createMany({
      data: [
        { id: 1, name: 'Provider 1', monthlyQuota: 10, remainingQuota: 0 }, // Mandatory, exhausted
        { id: 2, name: 'Provider 2', monthlyQuota: 10, remainingQuota: 10 },
        { id: 3, name: 'Provider 3', monthlyQuota: 10, remainingQuota: 10 },
        { id: 4, name: 'Provider 4', monthlyQuota: 10, remainingQuota: 10 },
      ],
    })

    // Create/ensure test service (service name is unique)
    await prisma.service.upsert({
      where: { id: 1 },
      update: { name: 'Test Service' },
      create: { id: 1, name: 'Test Service' },
    })
  })


  afterAll(async () => {
    await prisma.$disconnect()
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
