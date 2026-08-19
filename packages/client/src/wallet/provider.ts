import { init } from '@nimiq/mini-app-sdk';

export interface WalletIdentity {
  address: string;
  connected: boolean;
  network: string;
}

export interface WalletSignature {
  publicKey: string;
  signature: string;
}

export type WalletStatus = 'idle' | 'initializing' | 'ready' | 'connecting' | 'connected' | 'unavailable' | 'error';

type NimiqProvider = Awaited<ReturnType<typeof init>>;

let current: WalletIdentity | null = null;
let providerPromise: Promise<NimiqProvider> | null = null;
let status: WalletStatus = 'idle';
let lastError: Error | null = null;

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error('Nimiq wallet request failed');
}

/** Initialize the injected provider without requesting account permission. */
export async function initializeWallet(): Promise<boolean> {
  if (typeof window === 'undefined') {
    status = 'unavailable';
    return false;
  }

  status = 'initializing';
  lastError = null;
  try {
    providerPromise ??= init();
    await providerPromise;
    status = current ? 'connected' : 'ready';
    return true;
  } catch (error) {
    providerPromise = null;
    lastError = toError(error);
    status = 'unavailable';
    return false;
  }
}

/** Request account access after an explicit user action. */
export async function connectWallet(): Promise<WalletIdentity | null> {
  status = 'connecting';
  lastError = null;
  try {
    if (!providerPromise && !(await initializeWallet())) return current;
    const nimiq = await providerPromise!;
    const accounts = await nimiq.listAccounts();
    const address = Array.isArray(accounts) ? accounts[0] : undefined;
    if (!address) {
      current = null;
      status = 'ready';
      return null;
    }
    current = {
      address,
      connected: true,
      network: import.meta.env.VITE_NIMIQ_ENV ?? 'mainnet',
    };
    status = 'connected';
  } catch (error) {
    lastError = toError(error);
    status = 'error';
  }
  return current;
}

/** Sign a rewarded-mode attestation. This always triggers native confirmation. */
export async function signWalletMessage(message: string): Promise<WalletSignature> {
  if (!current) throw new Error('Connect a Nimiq wallet before signing');
  if (!message.trim()) throw new Error('Cannot sign an empty message');
  if (!providerPromise && !(await initializeWallet())) throw new Error('Nimiq Pay provider is unavailable');

  try {
    return await (await providerPromise!).sign(message);
  } catch (error) {
    lastError = toError(error);
    status = 'error';
    throw lastError;
  }
}

export function getWallet(): WalletIdentity | null {
  return current;
}

export function getWalletStatus(): WalletStatus {
  return status;
}

export function getWalletError(): Error | null {
  return lastError;
}
