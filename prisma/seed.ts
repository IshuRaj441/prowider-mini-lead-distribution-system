import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting database seed...')

  // Create Services
  const services = await Promise.all([
    prisma.service.upsert({
      where: { name: 'Service 1' },
      update: {},
      create: { name: 'Service 1' },
    }),
    prisma.service.upsert({
      where: { name: 'Service 2' },
      update: {},
      create: { name: 'Service 2' },
    }),
    prisma.service.upsert({
      where: { name: 'Service 3' },
      update: {},
      create: { name: 'Service 3' },
    }),
  ])

  console.log('Created services:', services.map(s => s.name))

  // Create Providers (8 providers with monthlyQuota=10, remainingQuota=10)
  const providers = await Promise.all(
    Array.from({ length: 8 }, async (_, i) => {
      const providerNum = i + 1
      return prisma.provider.upsert({
        where: { id: providerNum },
        update: { remainingQuota: 10 },
        create: {
          id: providerNum,
          name: `Provider ${providerNum}`,
          monthlyQuota: 10,
          remainingQuota: 10,
        },
      })
    })
  )

  console.log('Created providers:', providers.map(p => p.name))

  // Initialize AllocationState for each service
  await Promise.all(
    services.map(service =>
      prisma.allocationState.upsert({
        where: { serviceId: service.id },
        update: { currentIndex: 0 },
        create: {
          serviceId: service.id,
          currentIndex: 0,
        },
      })
    )
  )

  console.log('Initialized allocation states for all services')

  console.log('Database seed completed successfully!')
}

main()
  .catch((e) => {
    console.error('Error during seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
