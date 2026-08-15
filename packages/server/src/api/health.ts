import type { FastifyInstance } from 'fastify';
import { SIM_VERSION } from '@snake/sim';

export function registerHealth(app: FastifyInstance): void {
  const handler = async () => ({
    ok: true,
    name: 'snake-server',
    version: '0.1.0',
    simVersion: SIM_VERSION,
    ts: new Date().toISOString(),
  });
  app.get('/health', handler);
  app.get('/api/v1/health', handler);
}
