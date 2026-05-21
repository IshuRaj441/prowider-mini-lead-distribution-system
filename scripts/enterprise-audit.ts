/**
 * Enterprise audit script — fairness, compliance, concurrency evidence
 */
import { PrismaClient } from '@prisma/client'
import { AllocationService } from '../services/allocation-service'
import {
  MANDATORY_PROVIDERS,
  FAIR_ALLOCATION_POOLS,
  REQUIRED_ASSIGNMENTS,
} from '../lib/allocation-config'
import crypto from 'crypto'

const prisma = new PrismaClient()

async function resetForAudit() {
  await prisma.leadAssignment.deleteMany()
  await prisma.lead.deleteMany()
  await prisma.webhookEvent.deleteMany()
  await prisma.allocationState.deleteMany()
  // High quota for fairness audit (mandatory providers consume quota per lead)
  await prisma.provider.updateMany({ data: { remainingQuota: 500 } })
  for (const serviceId of [1, 2, 3]) {
    await prisma.allocationState.upsert({
      where: { serviceId },
      update: { currentIndex: 0 },
      create: { serviceId, currentIndex: 0 },
    })
  }
}

async function auditSeededData() {
  const providers = await prisma.provider.findMany({ orderBy: { id: 'asc' } })
  const services = await prisma.service.findMany({ orderBy: { id: 'asc' } })
  return {
    providerCount: providers.length,
    providersOk:
      providers.length === 8 &&
      providers.every((p) => p.monthlyQuota === 10 && p.remainingQuota === 10),
    serviceNames: services.map((s) => s.name).sort(),
    servicesOk: ['Service 1', 'Service 2', 'Service 3'].every((n) =>
      services.some((s) => s.name === n)
    ),
  }
}

async function fairnessStats(serviceId: number, leadCount: number) {
  const fairPool = FAIR_ALLOCATION_POOLS[serviceId]
  const mandatory = MANDATORY_PROVIDERS[serviceId]

  for (let i = 0; i < leadCount; i++) {
    await prisma.$transaction(async (tx) => {
      const lead = await tx.lead.create({
        data: {
          customerName: `Audit ${serviceId}-${i}`,
          phoneNumber: `audit-${serviceId}-${i}`,
          city: 'Audit City',
          description: 'audit',
          serviceId,
        },
      })
      await AllocationService.assignProvidersToLead(tx, lead.id, serviceId)
    })
  }

  const assignments = await prisma.leadAssignment.findMany({
    where: { lead: { serviceId } },
    include: { lead: true },
  })

  const byLead = new Map<number, number[]>()
  for (const a of assignments) {
    const list = byLead.get(a.leadId) ?? []
    list.push(a.providerId)
    byLead.set(a.leadId, list)
  }

  let exactThree = 0
  let hasDuplicateProvider = 0
  let mandatoryViolations = 0

  for (const [, providers] of byLead) {
    if (providers.length === REQUIRED_ASSIGNMENTS) exactThree++
    if (new Set(providers).size !== providers.length) hasDuplicateProvider++
    for (const m of mandatory) {
      if (!providers.includes(m)) mandatoryViolations++
    }
  }

  const fairCounts = Object.fromEntries(
    fairPool.map((id) => [
      id,
      assignments.filter((a) => a.providerId === id).length,
    ])
  )

  const state = await prisma.allocationState.findUnique({ where: { serviceId } })

  return {
    serviceId,
    leadCount,
    mandatory,
    fairPool,
    fairCounts,
    exactThree,
    mandatoryViolations,
    hasDuplicateProvider,
    currentIndex: state?.currentIndex ?? null,
  }
}

async function duplicateLeadRace() {
  const phone = 'dup-race-999'
  const serviceId = 1
  const results = await Promise.all(
    Array.from({ length: 10 }, () =>
      prisma.$transaction(async (tx) => {
        const existing = await tx.lead.findUnique({
          where: { phoneNumber_serviceId: { phoneNumber: phone, serviceId } },
        })
        if (existing) return 'duplicate-check'
        const lead = await tx.lead.create({
          data: {
            customerName: 'Race',
            phoneNumber: phone,
            city: 'X',
            description: 'race',
            serviceId,
          },
        })
        await AllocationService.assignProvidersToLead(tx, lead.id, serviceId)
        return 'created'
      }).catch((e) => (e.code === 'P2002' ? 'p2002' : 'error'))
    )
  )
  const leads = await prisma.lead.count({
    where: { phoneNumber: phone, serviceId },
  })
  return { results, uniqueLeads: leads }
}

async function webhookRace() {
  const eventId = crypto.randomUUID()
  const results = await Promise.all(
    Array.from({ length: 10 }, async () => {
      try {
        return await prisma.$transaction(async (tx) => {
          const claimed = await AllocationService.claimWebhookEvent(tx, eventId)
          if (!claimed) return 'skipped'
          await AllocationService.resetProviderQuotas(tx)
          return 'processed'
        })
      } catch (e: any) {
        if (e.code === 'P2002') return 'p2002'
        return 'error'
      }
    })
  )
  const events = await prisma.webhookEvent.count({ where: { eventId } })
  return { results, eventRows: events }
}

async function main() {
  console.log('=== ENTERPRISE AUDIT ===\n')
  const seed = await auditSeededData()
  console.log('SEED:', JSON.stringify(seed, null, 2))

  await resetForAudit()

  for (const serviceId of [1, 2, 3]) {
    const stats = await fairnessStats(serviceId, 30)
    console.log('\nFAIRNESS service', serviceId, JSON.stringify(stats, null, 2))
  }

  await resetForAudit()
  const dup = await duplicateLeadRace()
  console.log('\nDUPLICATE RACE:', JSON.stringify(dup, null, 2))

  await prisma.webhookEvent.deleteMany()
  const wh = await webhookRace()
  console.log('\nWEBHOOK RACE (create-first):', JSON.stringify(wh, null, 2))

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
