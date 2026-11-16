import { useCallback } from 'react';

import { type Cl, type ClarityValue } from '@jannik-stacks/kit';

import { signMessage, signStructuredDataMessage } from '@leather.io/stacks';
import { delay, isString } from '@leather.io/utils';

import { useCurrentStacksAccount } from '@app/store/accounts/blockchain/stacks/stacks-account.hooks';

export async function improveUxWithShortDelayAsStacksSigningIsSoFast() {
  return delay(600);
}

export function useMessageSignerStacksSoftwareWallet() {
  const account = useCurrentStacksAccount();
  return useCallback(
    ({ message, domain }: { message: string | ClarityValue; domain?: Cl.Types.Tuple }) => {
      if (!account || account.type === 'ledger') return null;

      const privateKey = account.stxPrivateKey;

      if (isString(message)) {
        return signMessage(message, privateKey);
      } else {
        if (!domain) throw new Error('Domain is required for structured messages');

        // returns signature in RSV format
        return signStructuredDataMessage(message, domain, privateKey);
      }
    },
    [account]
  );
}
