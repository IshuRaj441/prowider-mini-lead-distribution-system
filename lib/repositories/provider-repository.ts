/**
 * FIX #9: Repository Pattern for Provider operations
 * 
 * Encapsulates database operations for providers, providing:
 * - Single source of truth for provider queries
 * - Reusable query logic
 * - Type safety
 * - Easy testing with mocks
 */
export class ProviderRepository {
  constructor(private prisma: any) {}

  /**
   * Find provider by ID
   */
  async findById(id: number) {
    return this.prisma.provider.findUnique({
      where: { id },
    })
  }

  /**
   * Find all providers
   */
  async findAll() {
    return this.prisma.provider.findMany({
      orderBy: { name: 'asc' },
    })
  }

  /**
   * Find providers with available quota
   */
  async findWithAvailableQuota(providerIds: number[]) {
    return this.prisma.provider.findMany({
      where: {
        id: { in: providerIds },
        remainingQuota: { gt: 0 },
      },
    })
  }

  /**
   * Atomic quota decrement with WHERE clause
   * FIX #2: Prevents quota from going negative
   */
  async decrementQuotaAtomic(providerId: number): Promise<boolean> {
    const result = await this.prisma.provider.updateMany({
      where: {
        id: providerId,
        remainingQuota: { gt: 0 },
      },
      data: { remainingQuota: { decrement: 1 } },
    })
    return result.count > 0
  }

  /**
   * Reset all provider quotas
   */
  async resetAllQuotas(quota: number = 10) {
    return this.prisma.provider.updateMany({
      data: { remainingQuota: quota },
    })
  }

  /**
   * Get provider statistics
   */
  async getStatistics() {
    const providers = await this.prisma.provider.findMany()
    return {
      total: providers.length,
      totalQuota: providers.reduce((sum: number, p: any) => sum + p.monthlyQuota, 0),
      totalRemaining: providers.reduce((sum: number, p: any) => sum + p.remainingQuota, 0),
      providers: providers.map((p: any) => ({
        id: p.id,
        name: p.name,
        monthlyQuota: p.monthlyQuota,
        remainingQuota: p.remainingQuota,
        utilizationRate: ((p.monthlyQuota - p.remainingQuota) / p.monthlyQuota) * 100,
      })),
    }
  }
}
