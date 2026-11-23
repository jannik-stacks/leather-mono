import { useCallback } from 'react';

import { useUserSettings } from '@/hooks/use-user-settings';
import { useQueries } from '@tanstack/react-query';

import { type StacksApiAddressTransactionWithTransfers } from '@leather.io/models';
import { createStacksAddressTransactionsQueryConfig } from '@leather.io/queries';
import { uniqueArray } from '@leather.io/utils';

export function useGetAccountTransactionsWithTransfersQueries(addresses: string[]) {
  const settings = useUserSettings();
  const uniqueAddresses = uniqueArray(addresses);
  const queries = useQueries({
    queries: uniqueAddresses.map(address => ({
      ...createStacksAddressTransactionsQueryConfig(address, settings),
    })),
  });
  const combinedResult = useCallback(
    () => ({
      queries,
      totalData: queries.flatMap((result): StacksApiAddressTransactionWithTransfers[] => {
        if (result.data) return result.data;
        return [];
      }),
      pending: queries.some(result => result.isPending),
    }),
    [queries]
  );

  return combinedResult();
}
