import {
  Codec,
  type StacksNetwork,
  type StacksTransaction,
  createClient,
} from '@jannik-stacks/kit';
import { z } from 'zod';

import { delay, flattenObject, isError } from '@leather.io/utils';

import { logger } from '@shared/logger';
import { analytics } from '@shared/utils/analytics';

import { createError, serializeError } from '@app/common/utils';
import { hiroFetchWrapper } from '@app/query/stacks/stacks-client';

interface StacksBroadcastTransactionArgs {
  network: StacksNetwork;
  signedTx: StacksTransaction;
  onSuccess(txid: string, transaction: StacksTransaction): void;
  onError(error: Error | string, reason?: string): void;
}

function runSuccessHandler(handleSuccess: () => void) {
  try {
    handleSuccess();
  } catch (error) {
    logger.error('Stacks transaction broadcast but the success handler failed', error);
  }
}

export async function stacksBroadcastTransaction({
  network,
  signedTx,
  onSuccess,
  onError,
}: StacksBroadcastTransactionArgs) {
  const attemptId = crypto.randomUUID();
  try {
    analytics.untypedTrack('stacks_transaction_broadcast_initiated', {
      attemptId,
    });

    const { data, error } = await createClient({
      network,
      fetch: hiroFetchWrapper,
    }).api.POST('/v2/transactions', {
      body: Codec.Transaction.encode(signedTx),
      bodySerializer(tx) {
        return JSON.stringify({ tx });
      },
      headers: { 'Content-Type': 'application/json' },
      parseAs: 'text',
    });
    const txid = typeof data === 'string' ? data.replace(/["]+/g, '') : undefined;
    if (typeof data === 'string' && (txid === undefined || !/^(?:0x)?[a-f0-9]{64}$/i.test(txid)))
      throw new Error(data);
    const response = z
      .object({
        txid: z.string().optional(),
        error: z.string().optional(),
        reason: z.string().optional(),
      })
      .parse(error ?? { txid });

    await delay(500);

    if (response.error !== undefined) {
      logger.error('Transaction failed to broadcast', response);
      const error = createError({
        ...flattenObject({ error: response.error ?? '', reason: response.reason ?? '' }),
        name: response.reason ?? '',
        message: response.error ?? '',
      });
      throw error;
    }

    if (!response.txid) {
      logger.error('Transaction failed to broadcast', response);
      throw createError({
        name: 'TransactionBroadcastError',
        message: 'Transaction broadcast but returned no txid',
      });
    }

    logger.info('Transaction broadcast', response);
    analytics.track('broadcast_transaction', { symbol: 'stx' });
    analytics.untypedTrack('stacks_transaction_broadcast_succeeded', {
      attemptId,
    });

    await delay(500);

    const broadcastTxid = response.txid;
    runSuccessHandler(() => onSuccess(broadcastTxid, signedTx));
    return;
  } catch (error) {
    logger.error('Transaction error', { error });
    analytics.untypedTrack('stacks_transaction_broadcast_failed', {
      attemptId,
      ...serializeError(error),
    });
    onError(isError(error) ? error : { name: '', message: '' });
    return;
  }
}
