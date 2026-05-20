import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { handleApiError } from '@/lib/error-handler'

/**
 * GET /api/providers
 * 
 * Retrieves all providers with their current quota status
 */
export async function GET() {
  try {
    const providers = await prisma.provider.findMany({
      include: {
        leadAssignments: {
          include: {
            lead: {
              select: {
                id: true,
                customerName: true,
                phoneNumber: true,
                service: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
          orderBy: {
            assignedAt: 'desc',
          },
          take: 10, // Limit to recent 10 assignments to avoid N+1 query
        },
      },
      orderBy: {
        id: 'asc',
      },
    })

    // Calculate leads received count for each provider
    const providersWithStats = providers.map((provider: any) => ({
      ...provider,
      leadsReceived: provider.leadAssignments.length,
    }))

    return NextResponse.json({
      success: true,
      data: providersWithStats,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
