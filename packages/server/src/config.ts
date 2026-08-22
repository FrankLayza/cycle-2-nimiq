export interface Config {
  port: number;
  dbPath: string;
  allowedOrigins: string[];
  adminToken: string;
  nimNetwork: 'testnet' | 'mainnet';
  seedSalt: string;
  appUrl: string;
  rewardSignerKey: string;
  rewardFeeNim: number;
  rewardPoolNim: number;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const config: Config = {
    port: Number(env.PORT ?? 8080),
    dbPath: env.DB_PATH ?? './data/snake.db',
    allowedOrigins: (env.ALLOWED_ORIGINS ?? 'http://localhost:5173')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    adminToken: env.ADMIN_TOKEN ?? 'dev-admin-token',
    nimNetwork: env.NIM_NETWORK === 'mainnet' ? 'mainnet' : 'testnet',
    seedSalt: env.SEED_SALT ?? 'dev-seed-salt',
    appUrl: env.APP_URL ?? 'http://localhost:5173',
    rewardSignerKey: env.REWARD_SIGNER_KEY ?? '',
    rewardFeeNim: Number(env.REWARD_FEE_NIM ?? 0),
    rewardPoolNim: Number(env.REWARD_POOL_NIM ?? 0),
  };
  if (!Number.isInteger(config.port) || config.port < 1 || config.port > 65_535) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }
  if (!Number.isFinite(config.rewardFeeNim) || config.rewardFeeNim < 0) {
    throw new Error('REWARD_FEE_NIM must be a non-negative number');
  }
  if (!Number.isFinite(config.rewardPoolNim) || config.rewardPoolNim < 0) {
    throw new Error('REWARD_POOL_NIM must be a non-negative number');
  }
  if (env.NIM_NETWORK && env.NIM_NETWORK !== 'testnet' && env.NIM_NETWORK !== 'mainnet') {
    throw new Error('NIM_NETWORK must be testnet or mainnet');
  }
  if (env.NODE_ENV === 'production') {
    if (config.adminToken === 'dev-admin-token') throw new Error('ADMIN_TOKEN must be configured in production');
    if (config.seedSalt === 'dev-seed-salt') throw new Error('SEED_SALT must be configured in production');
    if (!env.ALLOWED_ORIGINS || config.allowedOrigins.length === 0) throw new Error('ALLOWED_ORIGINS must be configured in production');
    if (config.allowedOrigins.includes('*')) throw new Error('ALLOWED_ORIGINS cannot use wildcard in production');
    if (!env.APP_URL) throw new Error('APP_URL must be configured in production');
    if (!config.rewardSignerKey) throw new Error('REWARD_SIGNER_KEY must be configured in production');
  }
  return config;
}
