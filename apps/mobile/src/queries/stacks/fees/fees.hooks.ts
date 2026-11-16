import { useUserSettings } from '@/hooks/use-user-settings';
import { type StacksTransaction } from '@jannik-stacks/kit';
import { useQuery } from '@tanstack/react-query';

import { createStacksTransactionFeesQueryConfig } from '@leather.io/queries';

export function useCalculateStacksTxFees(unsignedTx: StacksTransaction) {
  const settings = useUserSettings();
  return useQuery(createStacksTransactionFeesQueryConfig(unsignedTx, settings));
}
