/**
 * FIX #13: Test Setup Configuration
 */

import { beforeAll, afterAll, beforeEach } from '@jest/globals'
import { prisma } from '@/lib/prisma'

beforeAll(async () => {
  // Setup test database connection
  await prisma.$connect()
})

afterAll(async () => {
  // Cleanup test database connection
  await prisma.$disconnect()
})

beforeEach(async () => {
  // FIX #12: Clean up database before each test
  // Use sequential deletes to avoid deadlocks
  await prisma.leadAssignment.deleteMany()
  await prisma.lead.deleteMany()
  await prisma.allocationState.deleteMany()
  await prisma.webhookEvent.deleteMany()

  // Do NOT reset provider quotas here.
  // Individual tests control provider quota/fixtures to keep scenarios deterministic.
})

