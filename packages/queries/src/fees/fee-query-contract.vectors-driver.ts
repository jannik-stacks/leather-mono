import { Codec } from '@jannik-stacks/kit';

import { defaultNetworksKeyedById } from '@leather.io/models';

import { createStacksTransactionFeesQueryConfig } from './stacks-transaction-fees.query-config';

export function query(hex: string, signerCount?: number) {
  const config = createStacksTransactionFeesQueryConfig(
    Codec.Transaction.decode(hex),
    { network: defaultNetworksKeyedById.mainnet, quoteCurrency: 'USD', assetVisibility: {} },
    signerCount
  );
  return {
    key: config.queryKey,
    refetchOnWindowFocus: config.refetchOnWindowFocus,
    refetchInterval: config.refetchInterval,
    refetchOnMount: config.refetchOnMount,
  };
}
