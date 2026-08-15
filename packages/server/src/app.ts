import Fastify from 'fastify';
import cors from '@fastify/cors';
import { loadConfig } from './config.js';
import { registerAdmin } from './api/admin.js';
import { registerHealth } from './api/health.js';
import { registerRewards } from './api/rewards.js';
import { registerRooms } from './api/rooms.js';
import { registerRuns } from './api/runs.js';

/** Fastify app with all REST routes — Colyseus attaches to the same http server in index.ts (D26). */
export function buildApp() {
  const cfg = loadConfig();
  const app = Fastify({ logger: false });
  app.register(cors, { origin: cfg.allowedOrigins });
  registerHealth(app);
  registerRooms(app);
  registerRuns(app);
  registerRewards(app);
  registerAdmin(app);
  return app;
}
