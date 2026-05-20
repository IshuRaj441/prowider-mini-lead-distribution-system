import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('=== DATABASE VALIDATION ===\n')

  const providers = await prisma.provider.findMany()
  console.log('PROVIDERS:')
  console.log(`Total: ${providers.length}`)
  providers.forEach(p => {
    console.log(`  ID: ${p.id}, Name: ${p.name}, MonthlyQuota: ${p.monthlyQuota}, RemainingQuota: ${p.remainingQuota}`)
  })

  const services = await prisma.service.findMany()
  console.log('\nSERVICES:')
  console.log(`Total: ${services.length}`)
  services.forEach(s => {
    console.log(`  ID: ${s.id}, Name: ${s.name}`)
  })

  const allocationStates = await prisma.allocationState.findMany()
  console.log('\nALLOCATION STATES:')
  console.log(`Total: ${allocationStates.length}`)
  allocationStates.forEach(s => {
    console.log(`  ServiceID: ${s.serviceId}, CurrentIndex: ${s.currentIndex}`)
  })

  await prisma.$disconnect()
}

main()
