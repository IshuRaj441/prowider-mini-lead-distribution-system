/**
 * Duplicate lead prevention under concurrent submissions (DB unique constraint)
 */

import { describe, it, expect, beforeEach } from '@jest/globals'
import { prisma } from '@/lib/prisma'
import { AllocationService } from '@/services/allocation-service'

describe('Duplicate Lead Concurrency', () => {
  const phone = '5559998888'
  const serviceId = 1

  beforeEach(async () => {
    await prisma.leadAssignment.deleteMany()
    await prisma.lead.deleteMany({ where: { phoneNumber: phone, serviceId } })
    await prisma.provider.updateMany({ data: { remainingQuota: 100 } })
  })

  it('allows only one lead for same phone + service under concurrent create', async () => {
    const results = await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        prisma
          .$transaction(async (tx) => {
            const lead = await tx.lead.create({
              data: {
                customerName: `Concurrent ${i}`,
                phoneNumber: phone,
                city: 'Test',
                description: 'Concurrent duplicate prevention test',
                serviceId,
              },
            })
            await AllocationService.assignProvidersToLead(tx, lead.id, serviceId)
            return 'created'
          })
          .catch((e: { code?: string }) => (e.code === 'P2002' ? 'duplicate' : 'error'))
      )
    )

    const created = results.filter((r) => r === 'created').length
    const duplicates = results.filter((r) => r === 'duplicate').length

    expect(created).toBe(1)
    expect(duplicates).toBe(9)

    const leadCount = await prisma.lead.count({ where: { phoneNumber: phone, serviceId } })
    expect(leadCount).toBe(1)
  })
})
