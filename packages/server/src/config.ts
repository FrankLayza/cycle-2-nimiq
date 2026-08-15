export interface Config {
  port: number;
  dbPath: string;
  allowedOrigins: string[];
  adminToken: string;
  nimNetwork: 'testnet' | 'mainnet';
  seedSalt: string;
  appUrl: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  return {
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
  };
}
