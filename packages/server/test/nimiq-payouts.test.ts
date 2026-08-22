import { describe, expect, it } from 'vitest';
import type { Config } from '../src/config.js';
import { NimiqPayoutBroadcaster } from '../src/services/nimiq-payouts.js';

function config(overrides: Partial<Config> = {}): Config {
  return {
    port: 8080,
    dbPath: ':memory:',
    allowedOrigins: [],
    adminToken: 'test',
    nimNetwork: 'testnet',
    seedSalt: 'test',
    appUrl: 'http://localhost',
    rewardSignerKey: '01'.repeat(32),
    rewardFeeNim: 0,
    rewardPoolNim: 0,
    ...overrides,
  };
}

describe('Nimiq payout broadcaster configuration', () => {
  it('rejects an invalid signer before connecting to the network', () => {
    expect(() => new NimiqPayoutBroadcaster(config({ rewardSignerKey: 'not-a-private-key' })))
      .toThrow('32-byte hex private key');
  });

  it('rejects invalid fee configuration before connecting to the network', () => {
    expect(() => new NimiqPayoutBroadcaster(config({ rewardFeeNim: -1 })))
      .toThrow('non-negative number');
  });

  it('rejects invalid payout amounts before connecting to the network', async () => {
    const broadcaster = new NimiqPayoutBroadcaster(config());
    await expect(broadcaster.send('invalid', 0)).rejects.toThrow('positive integer');
  });
});
