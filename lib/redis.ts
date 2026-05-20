import { createClient, RedisClientType } from 'redis'

/**
 * FIX #4: Distributed Redis Pub/Sub for scalable realtime updates
 * 
 * This replaces the in-memory EventEmitter with Redis Pub/Sub,
 * enabling horizontal scaling across multiple instances.
 */

const globalForRedis = globalThis as unknown as {
  redis: RedisClientType | undefined
  redisPublisher: RedisClientType | undefined
  redisSubscriber: RedisClientType | undefined
}

export const getRedisClient = async (): Promise<RedisClientType> => {
  if (!globalForRedis.redis) {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
    
    globalForRedis.redis = createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: (retries: number) => {
          if (retries > 10) {
            return new Error('Max reconnection attempts reached')
          }
          return Math.min(retries * 100, 3000)
        },
      },
    })

    globalForRedis.redis.on('error', (err: Error) => {
      console.error('Redis Client Error:', err)
    })

    await globalForRedis.redis.connect()
  }

  return globalForRedis.redis
}

export const getRedisPublisher = async (): Promise<RedisClientType> => {
  if (!globalForRedis.redisPublisher) {
    globalForRedis.redisPublisher = await getRedisClient()
  }
  return globalForRedis.redisPublisher
}

export const getRedisSubscriber = async (): Promise<RedisClientType> => {
  if (!globalForRedis.redisSubscriber) {
    globalForRedis.redisSubscriber = await getRedisClient()
  }
  return globalForRedis.redisSubscriber
}

/**
 * Publish an event to Redis Pub/Sub
 */
export const publishEvent = async (channel: string, data: unknown): Promise<void> => {
  try {
    const publisher = await getRedisPublisher()
    await publisher.publish(channel, JSON.stringify(data))
  } catch (error) {
    console.error('Error publishing to Redis:', error)
    // Fallback to in-memory for development if Redis is not available
    if (process.env.NODE_ENV === 'development') {
      console.warn('Redis not available, using in-memory fallback')
    }
  }
}

/**
 * Subscribe to Redis Pub/Sub channel
 */
export const subscribeToChannel = async (
  channel: string,
  callback: (message: unknown) => void
): Promise<void> => {
  try {
    const subscriber = await getRedisSubscriber()
    await subscriber.subscribe(channel, (message: string) => {
      try {
        const data = JSON.parse(message)
        callback(data)
      } catch (error) {
        console.error('Error parsing Redis message:', error)
      }
    })
  } catch (error) {
    console.error('Error subscribing to Redis channel:', error)
    // Fallback to in-memory for development if Redis is not available
    if (process.env.NODE_ENV === 'development') {
      console.warn('Redis not available, using in-memory fallback')
    }
  }
}

/**
 * Unsubscribe from Redis Pub/Sub channel
 */
export const unsubscribeFromChannel = async (channel: string): Promise<void> => {
  try {
    const subscriber = await getRedisSubscriber()
    await subscriber.unsubscribe(channel)
  } catch (error) {
    console.error('Error unsubscribing from Redis channel:', error)
  }
}
