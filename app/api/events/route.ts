import { NextRequest } from 'next/server'
import { subscribeToChannel, unsubscribeFromChannel } from '@/lib/redis'

/**
 * FIX #4: SSE (Server-Sent Events) endpoint for real-time dashboard updates
 * 
 * This endpoint keeps a connection open and pushes updates when:
 * - A new lead is created
 * - Quotas are reset via webhook
 * 
 * Uses Redis Pub/Sub for distributed systems, enabling horizontal scaling.
 * Falls back to in-memory EventEmitter for development if Redis is not available.
 */

// Fallback in-memory event emitter for development
declare global {
  var leadUpdateEmitter: any
}

if (!global.leadUpdateEmitter) {
  const EventEmitter = require('events')
  global.leadUpdateEmitter = new EventEmitter()
  global.leadUpdateEmitter.setMaxListeners(100)
}

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder()
  const useRedis = process.env.REDIS_URL && process.env.NODE_ENV === 'production'

  // Create a readable stream for SSE
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: unknown) => {
        const message = `data: ${JSON.stringify(data)}\n\n`
        controller.enqueue(encoder.encode(message))
      }

      // Send initial connection message
      sendEvent({ type: 'connected', message: 'SSE connection established', useRedis })

      if (useRedis) {
        // FIX #4: Use Redis Pub/Sub for production
        try {
          await subscribeToChannel('lead-updates', (data) => {
            sendEvent(data)
          })
        } catch (error) {
          const logger = (await import('@/lib/logger')).logger
          logger.error('Error subscribing to Redis:', error as Error)
          // Fallback to in-memory if Redis fails
          handleInMemoryFallback(controller, request, sendEvent)
        }
      } else {
        // Use in-memory fallback for development
        handleInMemoryFallback(controller, request, sendEvent)
      }

      // Clean up on connection close
      request.signal.addEventListener('abort', async () => {
        if (useRedis) {
          try {
            await unsubscribeFromChannel('lead-updates')
          } catch (error) {
            const logger = (await import('@/lib/logger')).logger
            logger.error('Error unsubscribing from Redis:', error as Error)
          }
        } else {
          // Clean up in-memory listeners
          if (global.leadUpdateEmitter) {
            global.leadUpdateEmitter.removeAllListeners()
          }
        }
        controller.close()
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}

/**
 * Fallback to in-memory EventEmitter for development
 */
function handleInMemoryFallback(
  controller: ReadableStreamDefaultController,
  request: NextRequest,
  sendEvent: (data: unknown) => void
) {
  // Listen for lead creation events
  const onLeadCreated = (data: unknown) => {
    sendEvent({ type: 'lead-created', data })
  }

  const onQuotaReset = (data: unknown) => {
    sendEvent({ type: 'quota-reset', data })
  }

  const onBulkLeadsCreated = (data: unknown) => {
    sendEvent({ type: 'bulk-leads-created', data })
  }

  global.leadUpdateEmitter.on('lead-created', onLeadCreated)
  global.leadUpdateEmitter.on('quota-reset', onQuotaReset)
  global.leadUpdateEmitter.on('bulk-leads-created', onBulkLeadsCreated)

  // Clean up on connection close
  request.signal.addEventListener('abort', () => {
    global.leadUpdateEmitter.off('lead-created', onLeadCreated)
    global.leadUpdateEmitter.off('quota-reset', onQuotaReset)
    global.leadUpdateEmitter.off('bulk-leads-created', onBulkLeadsCreated)
  })
}
