import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { AllocationService } from '@/services/allocation-service'
import { createLeadSchema } from '@/lib/validators/lead-validator'
import { publishEvent } from '@/lib/redis'
import { handleApiError } from '@/lib/error-handler'
import { DuplicateLeadError } from '@/lib/errors/app-error'

/**
 * POST /api/leads
 * 
 * Creates a new lead and automatically assigns providers using the allocation engine.
 * 
 * This endpoint is transaction-safe and handles:
 * - Lead creation with unique constraint enforcement
 * - Automatic provider allocation (3 providers per lead)
 * - Mandatory provider assignments
 * - Fair round-robin allocation for remaining slots
 * - Quota enforcement
 * - Concurrency safety via Prisma transactions
 * 
 * Returns the created lead with assigned providers
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate input
    const validatedData = createLeadSchema.parse(body)

    // Use transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx: any) => {
      // Create the lead (unique on phoneNumber + serviceId enforced at DB level)
      let lead
      try {
        lead = await tx.lead.create({
          data: {
            customerName: validatedData.customerName,
            phoneNumber: validatedData.phoneNumber,
            city: validatedData.city,
            description: validatedData.description,
            serviceId: validatedData.serviceId,
          },
        })
      } catch (error: unknown) {
        if (
          error &&
          typeof error === 'object' &&
          'code' in error &&
          (error as { code: string }).code === 'P2002'
        ) {
          throw new DuplicateLeadError(validatedData.phoneNumber, validatedData.serviceId)
        }
        throw error
      }

      // Assign providers using allocation engine
      const assignedProviderIds = await AllocationService.assignProvidersToLead(
        tx,
        lead.id,
        validatedData.serviceId
      )

      // Fetch assigned providers with details
      const assignments = await tx.leadAssignment.findMany({
        where: { leadId: lead.id },
        include: {
          provider: true,
        },
      })

      return {
        lead,
        assignments,
        assignedProviderIds,
      }
    })

    // FIX #4: Emit real-time update event using Redis Pub/Sub
    // Falls back to in-memory EventEmitter for development
    const useRedis = process.env.REDIS_URL && process.env.NODE_ENV === 'production'
    
    if (useRedis) {
      await publishEvent('lead-updates', { type: 'lead-created', data: result })
    } else if (global.leadUpdateEmitter) {
      global.leadUpdateEmitter.emit('lead-created', result)
    }

    return NextResponse.json(
      {
        success: true,
        data: result,
      },
      { status: 201 }
    )
  } catch (error) {
    return handleApiError(error)
  }
}

/**
 * GET /api/leads
 * 
 * Retrieves all leads with their assignments
 */
export async function GET() {
  try {
    const leads = await prisma.lead.findMany({
      include: {
        service: true,
        leadAssignments: {
          include: {
            provider: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({
      success: true,
      data: leads,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
