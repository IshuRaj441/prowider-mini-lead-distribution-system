import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

/**
 * FIX #10: Health Check Endpoint
 * 
 * Production-grade health check for monitoring and orchestration.
 * Checks:
 * - Application status
 * - Database connectivity
 * - Redis connectivity (if configured)
 */
export async function GET() {
  const startTime = Date.now()
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {} as Record<string, any>,
  }

  try {
    // Check database connectivity
    try {
      await prisma.$queryRaw`SELECT 1`
      health.checks.database = {
        status: 'healthy',
        latency: `${Date.now() - startTime}ms`,
      }
    } catch (error) {
      health.checks.database = {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
      }
      health.status = 'degraded'
    }

    // Redis is required only in production (distributed SSE)
    const redisRequired =
      process.env.REDIS_URL && process.env.NODE_ENV === 'production'
    if (process.env.REDIS_URL) {
      try {
        const { getRedisClient } = await import('@/lib/redis')
        const redis = await getRedisClient()
        await redis.ping()
        health.checks.redis = {
          status: 'healthy',
        }
      } catch (error) {
        health.checks.redis = {
          status: 'unhealthy',
          error: error instanceof Error ? error.message : 'Unknown error',
          required: redisRequired,
        }
        if (redisRequired) {
          health.status = 'degraded'
        }
      }
    }

    // Determine overall status
    const allHealthy = Object.values(health.checks).every(
      (check) => check.status === 'healthy'
    )
    health.status = allHealthy ? 'healthy' : 'degraded'

    logger.info('Health check completed', health)

    return NextResponse.json(health, {
      status: health.status === 'healthy' ? 200 : 503,
    })
  } catch (error) {
    logger.error('Health check failed', error as Error)
    health.status = 'unhealthy'
    health.checks.system = {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
    }

    return NextResponse.json(health, { status: 503 })
  }
}
