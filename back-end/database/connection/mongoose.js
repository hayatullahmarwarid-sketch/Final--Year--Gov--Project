import mongoose from 'mongoose';
import { getEnv } from '../../src/config/env.js';
import { getLogger } from '../../src/config/logger.js';

let connecting;

/**
 * @returns {Promise<typeof mongoose>}
 */
export async function connectMongo() {
  if (mongoose.connection.readyState === 1) return mongoose;
  if (connecting) return connecting;

  const env = getEnv();
  const log = getLogger();

  connecting = mongoose
    .connect(env.MONGODB_URI, {
      // autoIndex in dev/test only — production must use migrations.
      autoIndex: env.NODE_ENV !== 'production',
      autoCreate: env.NODE_ENV !== 'production',
      maxPoolSize: env.MONGO_MAX_POOL_SIZE,
      minPoolSize: env.MONGO_MIN_POOL_SIZE,
      socketTimeoutMS: env.MONGO_SOCKET_TIMEOUT_MS,
      serverSelectionTimeoutMS: env.MONGO_SERVER_SELECTION_TIMEOUT_MS,
      heartbeatFrequencyMS: env.MONGO_HEARTBEAT_FREQUENCY_MS,
      retryWrites: true,
    })
    .then((m) => {
      log.info(
        { maxPoolSize: env.MONGO_MAX_POOL_SIZE, minPoolSize: env.MONGO_MIN_POOL_SIZE },
        'MongoDB connected',
      );
      return m;
    })
    .catch((err) => {
      log.error({ err }, 'MongoDB connection failed');
      throw err;
    })
    .finally(() => {
      connecting = undefined;
    });

  return connecting;
}

export async function disconnectMongo() {
  if (mongoose.connection.readyState === 0) return;
  await mongoose.disconnect();
  getLogger().info('MongoDB disconnected');
}

export function mongoReady() {
  return mongoose.connection.readyState === 1;
}
