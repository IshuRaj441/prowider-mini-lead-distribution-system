/**
 * FIX #9: Repository Pattern for Webhook Event operations
 * 
 * Encapsulates database operations for webhook events, providing:
 * - Single source of truth for webhook event queries
 * - Reusable query logic
 * - Type safety
 * - Easy testing with mocks
 */
export class WebhookEventRepository {
  constructor(private prisma: any) {}

  /**
   * Find webhook event by event ID
   */
  async findByEventId(eventId: string) {
    return this.prisma.webhookEvent.findUnique({
      where: { eventId },
    })
  }

  /**
   * Check if event has been processed
   */
  async isProcessed(eventId: string): Promise<boolean> {
    const event = await this.findByEventId(eventId)
    return !!event
  }

  /**
   * Mark event as processed
   */
  async markAsProcessed(eventId: string) {
    return this.prisma.webhookEvent.create({
      data: {
        eventId,
      },
    })
  }

  /**
   * Get webhook event statistics
   */
  async getStatistics() {
    const events = await this.prisma.webhookEvent.findMany()
    return {
      totalProcessed: events.length,
      lastProcessedAt: events.length > 0 ? events[0].processedAt : null,
    }
  }
}
