import { Address, PublicKey, Signature } from '@nimiq/core';

export interface NimiqAttestation {
  message: string;
  publicKey: string;
  signature: string;
}

export function attestationMessage(day: string, seed: number, score: number, runId: string): string {
  return `snake-rink:today:${runId}:${day}:${seed}:${score}`;
}

export function verifyNimiqAttestation(attestation: NimiqAttestation, wallet: string): boolean {
  try {
    const publicKey = PublicKey.fromHex(attestation.publicKey);
    const signature = Signature.fromHex(attestation.signature);
    const message = new TextEncoder().encode(attestation.message);
    const expectedAddress = Address.fromString(wallet.replace(/\s+/g, '').toUpperCase());
    return publicKey.toAddress().equals(expectedAddress) && publicKey.verify(signature, message);
  } catch {
    return false;
  }
}
