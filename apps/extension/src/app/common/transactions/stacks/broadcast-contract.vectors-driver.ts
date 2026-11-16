import { Codec, STACKS_TESTNET } from '@jannik-stacks/kit';
import { vi } from 'vitest';

import type * as LeatherUtils from '@leather.io/utils';

import { stacksBroadcastTransaction } from './stacks-broadcast-transaction';

const transport = vi.hoisted(() => vi.fn());
vi.mock('@leather.io/utils', async importOriginal => ({
  ...(await importOriginal<typeof LeatherUtils>()),
  delay() {
    return Promise.resolve();
  },
}));
vi.mock('@shared/logger', () => ({ logger: { error: vi.fn(), info: vi.fn() } }));
vi.mock('@shared/utils/analytics', () => ({
  analytics: { track: vi.fn(), untypedTrack: vi.fn() },
}));
vi.mock('@app/query/stacks/stacks-client', () => ({ hiroFetchWrapper: transport }));

export async function result(hex: string, response: unknown) {
  const successful =
    typeof response === 'object' &&
    response !== null &&
    'txid' in response &&
    typeof response.txid === 'string';
  const body = successful ? JSON.stringify(response.txid) : JSON.stringify(response);
  return httpResult(hex, successful ? 200 : 400, body);
}

async function httpResult(hex: string, status: number, body: string) {
  transport.mockImplementation(() => Promise.resolve(new Response(body, { status })));
  const success: unknown[] = [];
  const errors: unknown[] = [];
  await stacksBroadcastTransaction({
    network: STACKS_TESTNET,
    signedTx: Codec.Transaction.decode(hex),
    onSuccess(txid, tx) {
      success.push({ txid, hex: Codec.Transaction.encode(tx) });
    },
    onError(error, reason) {
      errors.push({
        error: typeof error === 'string' ? error : { name: error.name, message: error.message },
        reason,
      });
    },
  });
  return { success, errors };
}
