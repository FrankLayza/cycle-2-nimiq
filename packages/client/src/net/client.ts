import { Client } from 'colyseus.js';

/**
 * Colyseus client factory. W1: bot matches run locally (spike path) — this
 * exists for the W2 room-code PvP wiring (joinOrCreate('match', { mode, code })).
 * In the Nimiq Pay WebView the WS URL is the app origin (same-origin, no CORS).
 */
export function createMatchClient(wsUrl = '/colyseus'): Client {
  return new Client(wsUrl);
}
