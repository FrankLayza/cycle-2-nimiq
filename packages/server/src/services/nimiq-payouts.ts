import { Address, Client, ClientConfiguration, KeyPair, PrivateKey, TransactionBuilder } from '@nimiq/core';
import { loadConfig, type Config } from '../config.js';
import { PayoutSubmissionUnknownError, type PayoutBroadcaster } from './payouts.js';

const LUNA_PER_NIM = 100_000n;

function keyPairFromHex(value: string): KeyPair {
  const hex = value.trim().replace(/^0x/i, '');
  if (!/^[0-9a-f]{64}$/i.test(hex)) throw new Error('REWARD_SIGNER_KEY must be a 32-byte hex private key');
  const bytes = Uint8Array.from(hex.match(/../g)!.map((part) => Number.parseInt(part, 16)));
  return KeyPair.derive(new PrivateKey(bytes));
}

/** Broadcasts pool-funded basic transfers through the official Nimiq light client. */
export class NimiqPayoutBroadcaster implements PayoutBroadcaster {
  private readonly keyPair: KeyPair;
  private clientPromise?: Promise<Awaited<ReturnType<typeof Client.create>>>;

  constructor(private readonly config: Config = loadConfig()) {
    if (!config.rewardSignerKey) throw new Error('reward signer is not configured');
    if (!Number.isFinite(config.rewardFeeNim) || config.rewardFeeNim < 0) {
      throw new Error('REWARD_FEE_NIM must be a non-negative number');
    }
    this.keyPair = keyPairFromHex(config.rewardSignerKey);
  }

  private client() {
    if (!this.clientPromise) {
      const configuration = new ClientConfiguration();
      configuration.network(this.config.nimNetwork === 'mainnet' ? 'MainAlbatross' : 'TestAlbatross');
      this.clientPromise = Client.create(configuration.build());
    }
    return this.clientPromise;
  }

  async send(wallet: string, amountNim: number): Promise<{ txHash: string }> {
    if (!Number.isSafeInteger(amountNim) || amountNim <= 0) throw new Error('payout amount must be a positive integer NIM amount');
    const recipient = Address.fromString(wallet.replace(/\s+/g, '').toUpperCase());
    const client = await this.client();
    await client.waitForConsensusEstablished();
    const transaction = TransactionBuilder.newBasic(
      this.keyPair.toAddress(),
      recipient,
      BigInt(amountNim) * LUNA_PER_NIM,
      BigInt(Math.round(this.config.rewardFeeNim * Number(LUNA_PER_NIM))),
      await client.getHeadHeight(),
      await client.getNetworkId(),
    );
    transaction.sign(this.keyPair, this.keyPair);
    const txHash = transaction.toPlain(0, 0n).transactionHash;
    let details;
    try {
      details = await client.sendTransaction(transaction);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'network submission failed';
      throw new PayoutSubmissionUnknownError(`Nimiq submission result is unknown: ${message}`, txHash);
    }
    if (!details.transactionHash) throw new Error('Nimiq client did not return a transaction hash');
    return { txHash: details.transactionHash };
  }

  async close(): Promise<void> {
    const client = await this.clientPromise;
    if (!client) return;
    await client.disconnectNetwork();
    client.free();
  }
}
