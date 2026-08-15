export interface WalletStub {
  address: string;
  connected: boolean;
  network: string;
}

let current: WalletStub | null = null;

/**
 * Silent read-only wallet identity. D7: connect is tier-2 — never blocks the
 * first match. TODO(W2): replace with the Nimiq provider `init()` so the wallet
 * is the player's identity and enables payouts (living doc §6/§7).
 */
export async function connectWallet(): Promise<WalletStub> {
  await new Promise((r) => setTimeout(r, 250));
  current = {
    address: 'NQ00STUB0000000000000000000000000000000',
    connected: true,
    network: 'testnet',
  };
  return current;
}

export function getWallet(): WalletStub | null {
  return current;
}
