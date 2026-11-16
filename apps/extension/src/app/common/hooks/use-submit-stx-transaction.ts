import { useCallback } from 'react';

import { Codec, type StacksTransaction, createClient } from '@jannik-stacks/kit';
import { z } from 'zod';

import { delay, isError } from '@leather.io/utils';

import { logger } from '@shared/logger';
import { analytics } from '@shared/utils/analytics';

import { useRefreshAllAccountData } from '@app/common/hooks/account/use-refresh-all-account-data';
import { hiroFetchWrapper } from '@app/query/stacks/stacks-client';
import { useCurrentStacksNetworkState } from '@app/store/networks/networks.hooks';
import { useLoading } from '@app/store/ui/ui.hooks';

const timeForApiToUpdate = 250;

interface UseSubmitTransactionArgs {
  loadingKey: string;
}
interface UseSubmitTransactionCallbackArgs {
  replaceByFee?: boolean;
  onSuccess(txId: string): void;
  onError(error: Error | string): void;
}
export function useSubmitTransactionCallback({ loadingKey }: UseSubmitTransactionArgs) {
  const refreshAccountData = useRefreshAllAccountData();
  const { setIsLoading, setIsIdle } = useLoading(loadingKey);
  const stacksNetwork = useCurrentStacksNetworkState();

  return useCallback(
    ({ onSuccess, onError }: UseSubmitTransactionCallbackArgs) =>
      async (transaction: StacksTransaction) => {
        setIsLoading();
        try {
          const { data, error } = await createClient({
            network: stacksNetwork,
            fetch: hiroFetchWrapper,
          }).api.POST('/v2/transactions', {
            body: Codec.Transaction.encode(transaction),
            bodySerializer(tx) {
              return JSON.stringify({ tx });
            },
            headers: { 'Content-Type': 'application/json' },
            parseAs: 'text',
          });
          const txid = typeof data === 'string' ? data.replace(/["]+/g, '') : undefined;
          if (
            typeof data === 'string' &&
            (txid === undefined || !/^(?:0x)?[a-f0-9]{64}$/i.test(txid))
          )
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
            logger.error('Transaction failed to broadcast', response);
            onError(response.error);
            return setIsIdle();
          }

          if (!response.txid) {
            logger.error('Transaction failed to broadcast', response);
            return setIsIdle();
          }

          logger.info('Transaction broadcast', response);

          await delay(500);

          analytics.track('broadcast_transaction', {
            symbol: 'stx',
          });
          onSuccess(response.txid);
          setIsIdle();
          await refreshAccountData(timeForApiToUpdate);
          return { txid: response.txid, transaction };
        } catch (error) {
          logger.error('Transaction callback', { error });
          onError(isError(error) ? error : { name: '', message: '' });
          return setIsIdle();
        }
      },
    [setIsLoading, stacksNetwork, setIsIdle, refreshAccountData]
  );
}
