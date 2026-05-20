/**
 * FIX #13: Provider Repository Unit Tests
 * 
 * Tests for the provider repository layer
 */

import { describe, it, expect, beforeEach } from '@jest/globals'
import { prisma } from '@/lib/prisma'
import { ProviderRepository } from '@/lib/repositories/provider-repository'

describe('ProviderRepository', () => {
  let repository: ProviderRepository

  beforeEach(() => {
    repository = new ProviderRepository(prisma)
  })

  it('should find provider by ID', async () => {
    const provider = await repository.findById(1)
    expect(provider).toBeDefined()
    expect(provider?.id).toBe(1)
  })

  it('should find all providers', async () => {
    const providers = await repository.findAll()
    expect(providers.length).toBeGreaterThan(0)
  })

  it('should decrement quota atomically', async () => {
    const providerId = 1
    
    // Get initial quota
    const before = await repository.findById(providerId)
    const initialQuota = before?.remainingQuota || 0

    // Decrement
    const success = await repository.decrementQuotaAtomic(providerId)
    expect(success).toBe(true)

    // Verify quota decreased
    const after = await repository.findById(providerId)
    expect(after?.remainingQuota).toBe(initialQuota - 1)
  })

  it('should prevent quota from going negative', async () => {
    const providerId = 1
    
    // Set quota to 0
    await prisma.provider.update({
      where: { id: providerId },
      data: { remainingQuota: 0 },
    })

    // Try to decrement
    const success = await repository.decrementQuotaAtomic(providerId)
    expect(success).toBe(false)

    // Verify quota is still 0
    const provider = await repository.findById(providerId)
    expect(provider?.remainingQuota).toBe(0)
  })

  it('should reset all quotas', async () => {
    await repository.resetAllQuotas(50)
    
    const providers = await repository.findAll()
    for (const provider of providers) {
      expect(provider.remainingQuota).toBe(50)
    }
  })

  it('should get provider statistics', async () => {
    const stats = await repository.getStatistics()
    
    expect(stats.total).toBeGreaterThan(0)
    expect(stats.totalQuota).toBeGreaterThan(0)
    expect(stats.totalRemaining).toBeGreaterThanOrEqual(0)
    expect(stats.providers).toHaveLength(stats.total)
  })
})
