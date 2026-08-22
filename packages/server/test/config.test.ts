import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.js';

const baseEnv = {
  NODE_ENV: 'test',
  PORT: '8080',
  ALLOWED_ORIGINS: 'https://snake.example',
  ADMIN_TOKEN: 'admin-secret',
  SEED_SALT: 'seed-secret',
  REWARD_FEE_NIM: '0',
  REWARD_POOL_NIM: '100',
  NIM_NETWORK: 'testnet',
  APP_URL: 'https://snake.example',
  REWARD_SIGNER_KEY: '01'.repeat(32),
};

describe('server configuration', () => {
  it('keeps development defaults outside production', () => {
    expect(loadConfig({ NODE_ENV: 'test' }).adminToken).toBe('dev-admin-token');
    expect(loadConfig({ NODE_ENV: 'test' }).seedSalt).toBe('dev-seed-salt');
  });

  it('rejects unsafe production defaults', () => {
    expect(() => loadConfig({ NODE_ENV: 'production' })).toThrow('ADMIN_TOKEN');
    expect(() => loadConfig({ ...baseEnv, NODE_ENV: 'production', ADMIN_TOKEN: 'dev-admin-token' })).toThrow('ADMIN_TOKEN');
    expect(() => loadConfig({ ...baseEnv, NODE_ENV: 'production', SEED_SALT: 'dev-seed-salt' })).toThrow('SEED_SALT');
    expect(() => loadConfig({ ...baseEnv, NODE_ENV: 'production', APP_URL: undefined })).toThrow('APP_URL');
    expect(() => loadConfig({ ...baseEnv, NODE_ENV: 'production', REWARD_SIGNER_KEY: '' })).toThrow('REWARD_SIGNER_KEY');
    expect(() => loadConfig({ ...baseEnv, NODE_ENV: 'production', ALLOWED_ORIGINS: '*' })).toThrow('wildcard');
  });

  it('rejects malformed numeric and network settings', () => {
    expect(() => loadConfig({ ...baseEnv, PORT: '0' })).toThrow('PORT');
    expect(() => loadConfig({ ...baseEnv, REWARD_POOL_NIM: '-1' })).toThrow('REWARD_POOL_NIM');
    expect(() => loadConfig({ ...baseEnv, NIM_NETWORK: 'staging' })).toThrow('NIM_NETWORK');
  });
});
