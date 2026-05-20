/**
 * FIX #9: Repository Pattern for Lead operations
 * 
 * Encapsulates database operations for leads, providing:
 * - Single source of truth for lead queries
 * - Reusable query logic
 * - Type safety
 * - Easy testing with mocks
 */
export class LeadRepository {
  constructor(private prisma: any) {}

  /**
   * Find lead by ID with assignments
   */
  async findByIdWithAssignments(id: number) {
    return this.prisma.lead.findUnique({
      where: { id },
      include: {
        service: true,
        leadAssignments: {
          include: {
            provider: true,
          },
        },
      },
    })
  }

  /**
   * Find all leads with assignments
   */
  async findAllWithAssignments() {
    return this.prisma.lead.findMany({
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
  }

  /**
   * Find lead by phone number and service ID
   */
  async findByPhoneAndService(phoneNumber: string, serviceId: number) {
    return this.prisma.lead.findUnique({
      where: {
        phoneNumber_serviceId: {
          phoneNumber,
          serviceId,
        },
      },
    })
  }

  /**
   * Create a new lead
   */
  async create(data: {
    customerName: string
    phoneNumber: string
    city: string
    description: string
    serviceId: number
  }) {
    return this.prisma.lead.create({
      data,
    })
  }

  /**
   * Create lead assignment
   */
  async createAssignment(leadId: number, providerId: number) {
    return this.prisma.leadAssignment.create({
      data: {
        leadId,
        providerId,
      },
    })
  }

  /**
   * Get lead statistics
   */
  async getStatistics() {
    const leads = await this.prisma.lead.findMany({
      include: {
        leadAssignments: true,
      },
    })

    const totalLeads = leads.length
    const totalAssignments = leads.reduce((sum: number, lead: any) => sum + lead.leadAssignments.length, 0)

    const byService = leads.reduce((acc: any, lead: any) => {
      acc[lead.serviceId] = (acc[lead.serviceId] || 0) + 1
      return acc
    }, {})

    return {
      totalLeads,
      totalAssignments,
      averageAssignmentsPerLead: totalLeads > 0 ? totalAssignments / totalLeads : 0,
      byService,
    }
  }
}
