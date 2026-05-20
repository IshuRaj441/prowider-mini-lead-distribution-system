import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { AllocationService } from '@/services/allocation-service'
import { publishEvent } from '@/lib/redis'
import { handleApiError } from '@/lib/error-handler'
import { verifyApiKey } from '@/lib/auth'

/**
 * POST /api/test/generate-leads
 * 
 * Test endpoint for generating concurrent leads to stress test the allocation engine.
 * This simulates multiple simultaneous lead submissions to test concurrency safety.
 */

export async function POST(request: NextRequest) {
  try {
    // FIX #5: Verify API key for test endpoints
    verifyApiKey(request)

    const body = await request.json()
    const count = body.count || 10

    if (count < 1 || count > 100) {
      return NextResponse.json(
        {
          success: false,
          error: 'Count must be between 1 and 100',
        },
        { status: 400 }
      )
    }

    // Generate leads concurrently to test concurrency
    const leadPromises = Array.from({ length: count }, async (_, i) => {
      const serviceId = (i % 3) + 1 // Rotate through services 1, 2, 3
      
      try {
        const result = await prisma.$transaction(async (tx: any) => {
          // Create lead with unique phone number
          const lead = await tx.lead.create({
            data: {
              customerName: `Test Customer ${i + 1}`,
              phoneNumber: `555000${String(i + 1).padStart(4, '0')}`,
              city: 'Test City',
              description: `Test lead ${i + 1} for concurrency testing`,
              serviceId,
            },
          })

          // Assign providers
          const assignedProviderIds = await AllocationService.assignProvidersToLead(
            tx,
            lead.id,
            serviceId
          )

          return {
            leadId: lead.id,
            serviceId,
            assignedProviderIds,
            success: true,
          }
        })

        return result
      } catch (error: any) {
        return {
          leadId: i + 1,
          serviceId,
          success: false,
          error: error.message,
        }
      }
    })

    const results = await Promise.all(leadPromises)

    const successCount = results.filter((r: any) => r.success).length
    const failureCount = results.filter((r: any) => !r.success).length

    // FIX #4: Emit real-time update event using Redis Pub/Sub
    // Falls back to in-memory EventEmitter for development
    const useRedis = process.env.REDIS_URL && process.env.NODE_ENV === 'production'
    
    if (useRedis) {
      await publishEvent('lead-updates', { type: 'bulk-leads-created', data: { results } })
    } else if (global.leadUpdateEmitter) {
      global.leadUpdateEmitter.emit('bulk-leads-created', { results })
    }

    return NextResponse.json({
      success: true,
      data: {
        total: count,
        successful: successCount,
        failed: failureCount,
        results,
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
