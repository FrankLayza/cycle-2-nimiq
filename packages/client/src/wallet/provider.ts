export interface WalletIdentity {
  address: string;
  connected: boolean;
  network: string;
}

let current: WalletIdentity | null = null;

/** Connect silently when hosted by Nimiq Pay; local development stays usable. */
export async function connectWallet(): Promise<WalletIdentity | null> {
  if (typeof window === 'undefined') return current;

  try {
    const nimiq = await init();
    const accounts = await nimiq.listAccounts();
    const address = accounts[0];
    if (!address) return current;
    current = {
      address,
      connected: true,
      network: import.meta.env.VITE_NIMIQ_ENV ?? 'mainnet',
    };
  } catch {
    // Provider access is optional and must never block free play.
  }
  return current;
}

export function getWallet(): WalletIdentity | null {
  return current;
}
import { init } from '@nimiq/mini-app-sdk';
