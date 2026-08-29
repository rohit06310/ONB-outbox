import IORedis from 'ioredis';
import { env } from './env';

let redisClient: IORedis | null = null;

export function getRedisClient(): IORedis {
  if (!redisClient) {
    redisClient = new IORedis({
      host: env.redis.host,
      port: env.redis.port,
      password: env.redis.password,
      maxRetriesPerRequest: null, // Required by BullMQ
      enableReadyCheck: false,
      lazyConnect: false,
    });

    redisClient.on('connect', () => {
      console.log('✅  Redis connected');
    });

    redisClient.on('error', (err) => {
      console.error('❌  Redis error:', err.message);
    });

    redisClient.on('close', () => {
      console.warn('⚠️   Redis connection closed');
    });
  }

  return redisClient;
}

export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}
