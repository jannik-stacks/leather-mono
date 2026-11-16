import { type StacksTransaction } from '@jannik-stacks/kit';
import { type QueryFunctionContext } from '@tanstack/react-query';

import { type UserSettings, getStacksTransactionFeesService } from '@leather.io/services';
import { getSerializedUnsignedStacksTxPayload } from '@leather.io/stacks';
import { minutesInMs } from '@leather.io/utils';

import { createServiceQueryKey } from '../shared/query-key.factory';

export function createStacksTransactionFeesQueryKey(
  unsignedTx: StacksTransaction,
  settings: UserSettings,
  signerCount?: number
) {
  const payloadHex = getSerializedUnsignedStacksTxPayload(unsignedTx);
  const threshold = unsignedTx.signaturesRequired ?? 1;
  const hashMode = {
    p2pkh: 0,
    p2sh: 1,
    p2wpkh: 2,
    p2wsh: 3,
    'p2sh-non-sequential': 5,
    'p2wsh-non-sequential': 7,
  }[
    unsignedTx.signer?.hashMode ??
      (unsignedTx.signaturesRequired === undefined ? 'p2pkh' : 'p2sh-non-sequential')
  ];
  return createServiceQueryKey(
    'stacks-transaction-fees-service--get-stacks-transaction-fees',
    [payloadHex, signerCount ?? 1, hashMode, threshold],
    settings
  );
}

export function createStacksTransactionFeesQueryConfig(
  unsignedTx: StacksTransaction,
  settings: UserSettings,
  signerCount?: number
) {
  return {
    queryKey: createStacksTransactionFeesQueryKey(unsignedTx, settings, signerCount),
    queryFn: ({ signal }: QueryFunctionContext) =>
      getStacksTransactionFeesService().getStacksTransactionFees(unsignedTx, signerCount, signal),
    refetchOnWindowFocus: false,
    refetchInterval: minutesInMs(2),
    refetchOnMount: true,
  };
}
