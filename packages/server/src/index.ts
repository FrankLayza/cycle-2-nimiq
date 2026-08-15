import { pathToFileURL } from 'node:url';
import { Server } from 'colyseus';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { buildApp } from './app.js';
import { loadConfig } from './config.js';
import { getDb } from './db/client.js';
import { MatchRoom } from './rooms/MatchRoom.js';

export interface RunningServer {
  app: ReturnType<typeof buildApp>;
  gameServer: Server;
  port: number;
}

/**
 * Start everything: Fastify (REST) + Colyseus (WS) on a single port (D26).
 * Room routing by (mode, code) via filterBy — joinOrCreate('match', { mode, code })
 * reuses a room with the same code (room-code PvP, D14).
 */
export async function startServer(portOverride?: number): Promise<RunningServer> {
  const cfg = loadConfig();
  const app = buildApp();
  const port = portOverride ?? cfg.port;

  // Colyseus attaches its WebSocket + matchmaking routes to the Fastify http
  // server at construction (Server.attach) — never call gameServer.listen(),
  // which would double-listen (D26: REST + WS on one port).
  const gameServer = new Server({ transport: new WebSocketTransport({ server: app.server }) });
  gameServer.define('match', MatchRoom).filterBy(['mode', 'code']);

  getDb(); // open + migrate on boot

  await app.listen({ port, host: '0.0.0.0' });

  return { app, gameServer, port };
}

// Run directly: `pnpm --filter @snake/server dev` / `tsx src/index.ts`
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  startServer().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
