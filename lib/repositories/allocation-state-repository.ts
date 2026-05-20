/**
 * FIX #9: Repository Pattern for Allocation State operations
 * 
 * Encapsulates database operations for allocation state, providing:
 * - Single source of truth for allocation state queries
 * - Reusable query logic
 * - Type safety
 * - Easy testing with mocks
 */
export class AllocationStateRepository {
  constructor(private prisma: any) {}

  /**
   * Find allocation state by service ID
   */
  async findByServiceId(serviceId: number) {
    return this.prisma.allocationState.findUnique({
      where: { serviceId },
    })
  }

  /**
   * Find allocation state by service ID with FOR UPDATE lock
   * FIX #1: Prevents race conditions in concurrent allocations
   */
  async findByServiceIdForUpdate(serviceId: number) {
    return this.prisma.$queryRaw`
      SELECT * FROM "AllocationState" 
      WHERE "serviceId" = ${serviceId}
      FOR UPDATE
    `
  }

  /**
   * Create allocation state for a service
   */
  async create(serviceId: number, currentIndex: number = 0) {
    return this.prisma.allocationState.create({
      data: {
        serviceId,
        currentIndex,
      },
    })
  }

  /**
   * Update allocation state with atomic increment
   */
  async incrementIndex(serviceId: number) {
    return this.prisma.allocationState.update({
      where: { serviceId },
      data: { currentIndex: { increment: 1 } },
    })
  }

  /**
   * Reset allocation state for a service
   */
  async resetIndex(serviceId: number) {
    return this.prisma.allocationState.update({
      where: { serviceId },
      data: { currentIndex: 0 },
    })
  }

  /**
   * Get or create allocation state for a service
   */
  async getOrCreate(serviceId: number) {
    let state = await this.findByServiceId(serviceId)
    if (!state) {
      state = await this.create(serviceId, 0)
    }
    return state
  }
}
