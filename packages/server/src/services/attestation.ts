import { Address, PublicKey, Signature } from '@nimiq/core';

export interface NimiqAttestation {
  message: string;
  publicKey: string;
  signature: string;
}

export function verifyNimiqAttestation(attestation: NimiqAttestation, wallet: string): boolean {
  try {
    const publicKey = PublicKey.fromHex(attestation.publicKey);
    const signature = Signature.fromHex(attestation.signature);
    const message = new TextEncoder().encode(attestation.message);
    const expectedAddress = Address.fromString(wallet.replace(/\s+/g, '').toUpperCase());
    return publicKey.toAddress().equals(expectedAddress) && signature.verify(publicKey, message);
  } catch {
    return false;
  }
}
