import { useCallback } from 'react';

import { Codec, type StacksTransaction, isTransaction, signInPlace } from '@jannik-stacks/kit';

import { logger } from '@shared/logger';

import { useWalletType } from '@app/common/use-wallet-type';
import { useLedgerFlow } from '@app/features/ledger/flow/ledger-flow.context';
import { unwrapLedgerSigningOutcome } from '@app/features/ledger/flow/unwrap-ledger-signing-outcome';
import { useToast } from '@app/features/toasts/use-toast';
import { useCurrentStacksAccount } from '@app/store/accounts/blockchain/stacks/stacks-account.hooks';

function useSignTransactionSoftwareWallet() {
  const toast = useToast();
  const account = useCurrentStacksAccount();

  return useCallback(
    (tx: StacksTransaction) => {
      if (account?.type !== 'software') {
        const message = 'Cannot use this method to sign a non-software wallet transaction';
        toast.error(message);
        logger.error(message);
        return;
      }
      if (!isTransaction(tx)) throw new Error('Unsupported transaction type');
      signInPlace(tx, account.stxPrivateKey);
      return tx;
    },
    [account, toast]
  );
}

interface UseSignStacksTransactionOptions {
  settleOnRejection?: boolean;
}
export function useSignStacksTransaction({
  settleOnRejection = false,
}: UseSignStacksTransactionOptions = {}) {
  const { whenWallet } = useWalletType();
  const ledgerFlow = useLedgerFlow();
  const signSoftwareTx = useSignTransactionSoftwareWallet();

  return (tx: StacksTransaction) =>
    whenWallet({
      async ledger(tx: StacksTransaction) {
        const outcome = await ledgerFlow.sign({
          kind: 'sign-stacks-tx',
          tx: Codec.Transaction.encode(tx),
          settleOnRejection,
        });
        return unwrapLedgerSigningOutcome(outcome);
      },
      software(tx: StacksTransaction) {
        return signSoftwareTx(tx);
      },
    })(tx);
}
