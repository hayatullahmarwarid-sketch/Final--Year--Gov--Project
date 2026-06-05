import { Router } from 'express';
import { mongoReady } from '../../database/connection/mongoose.js';
import { getRedis } from '../config/redis.js';
import { sendSuccess, sendError } from '../utils/api-response.js';
import { asyncHandler } from '../core/async-handler.js';
import { isOutboundEmailConfigured } from '../services/email/smtp-mailer.service.js';
import { HttpStatus } from '../core/errors/http-status.js';

export const healthRouter = Router();

/**
 * Liveness. Returns 200 as long as the process is alive + can answer HTTP. Do NOT check Mongo
 * here — probes that flap on Mongo blips cause restart storms.
 */
healthRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    return sendSuccess(
      res,
      {
        service: 'sharia-decrees-api',
        status: 'live',
        uptimeSec: Math.round(process.uptime()),
      },
      { message: 'OK' },
    );
  }),
);

/**
 * Readiness. Returns 503 when a required backing service is unavailable so the load balancer
 * can take the instance out of rotation until it recovers. Redis + SMTP are optional.
 */
healthRouter.get(
  '/ready',
  asyncHandler(async (_req, res) => {
    const mongo = mongoReady();
    const redisClient = getRedis();
    let redis = 'disabled';
    if (redisClient) {
      redis = redisClient.status === 'ready' ? 'up' : 'down';
    }
    const smtp = isOutboundEmailConfigured() ? 'configured' : 'disabled';

    const healthy = mongo && (redisClient === null || redis === 'up');
    const body = {
      service: 'sharia-decrees-api',
      status: healthy ? 'ready' : 'not_ready',
      checks: {
        mongo: mongo ? 'up' : 'down',
        redis,
        smtp,
      },
    };

    if (!healthy) {
      return sendError(res, {
        code: 'NOT_READY',
        message: 'Dependencies unhealthy',
        details: body,
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
      });
    }

    return sendSuccess(res, body, { message: 'OK' });
  }),
);
