import { type StacksTransaction } from '@jannik-stacks/kit';
import { useQuery } from '@tanstack/react-query';

import { createStacksTransactionFeesQueryConfig } from '@leather.io/queries';

import { useUserSettings } from '@app/hooks/use-user-settings';

export function useStacksTransactionFees(unsignedTx?: StacksTransaction, signerCount?: number) {
  const settings = useUserSettings();
  const config = unsignedTx
    ? createStacksTransactionFeesQueryConfig(unsignedTx, settings, signerCount)
    : {
        queryKey: ['stacks-transaction-fees-disabled'],
        queryFn: () => Promise.reject(new Error('No unsigned tx')),
      };
  return useQuery({
    ...config,
    enabled: !!unsignedTx,
  });
}
