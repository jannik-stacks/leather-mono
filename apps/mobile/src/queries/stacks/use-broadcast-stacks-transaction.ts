import {
  Codec,
  type StacksNetwork,
  type StacksTransaction,
  createClient,
} from '@jannik-stacks/kit';
import { useMutation } from '@tanstack/react-query';
import { z } from 'zod';

import { getErrorMessage } from '@leather.io/stacks';

import { fetchFn } from './fetch-fn';

interface BroadcastStacksTransactionParams {
  tx: StacksTransaction;
  stacksNetwork: StacksNetwork;
}

export async function broadcastStacksTransaction({
  tx,
  stacksNetwork,
}: BroadcastStacksTransactionParams) {
  const { data, error } = await createClient({ network: stacksNetwork, fetch: fetchFn }).api.POST(
    '/v2/transactions',
    {
      body: Codec.Transaction.encode(tx),
      bodySerializer(tx) {
        return JSON.stringify({ tx });
      },
      headers: { 'Content-Type': 'application/json' },
      parseAs: 'text',
    }
  );
  const txid = typeof data === 'string' ? data.replace(/["]+/g, '') : undefined;
  if (typeof data === 'string' && (txid === undefined || !/^(?:0x)?[a-f0-9]{64}$/i.test(txid)))
    throw new Error(data);
  const response = z
    .object({
      txid: z.string().optional(),
      error: z.string().optional(),
      reason: z.string().optional(),
    })
    .loose()
    .parse(error ?? { txid });

  if (response.error !== undefined) {
    return Promise.reject(new Error(getErrorMessage(response.reason)));
  }

  // Sometimes we might get "API rate limit exceeded" with no txid
  if (!response.txid) {
    return Promise.reject(new Error('Something went wrong'));
  }

  return Promise.resolve({ ...response, txid: response.txid });
}

export function useBroadcastStacksTransaction() {
  return useMutation({
    mutationKey: ['broadcast-stx-transaction'],
    mutationFn: broadcastStacksTransaction,
  });
}
