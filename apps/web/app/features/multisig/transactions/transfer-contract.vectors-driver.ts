import BigNumber from 'bignumber.js';

import type { VaultAccount } from '@leather.io/models';
import { createMoney } from '@leather.io/utils';

import { buildUnsignedMultisigSip10Transfer } from './build-sip10-transfer';
import { buildUnsignedMultisigStxTransfer } from './build-stx-transfer';

export async function build(
  account: VaultAccount,
  kind: 'stx' | 'sip10',
  amount: string,
  recipient: string
) {
  const args = {
    account,
    recipient,
    amount: createMoney(new BigNumber(amount), 'STX'),
    memo: '🌟',
  };
  try {
    const tx =
      kind === 'stx'
        ? await buildUnsignedMultisigStxTransfer(args)
        : await buildUnsignedMultisigSip10Transfer({
            ...args,
            assetId: 'SP000000000000000000002Q6VF78.token::coin',
          });
    return {
      hex: tx.serialize(),
      txid: tx.txid(),
      nonce: tx.auth.spendingCondition.nonce,
      fee: tx.auth.spendingCondition.fee,
    };
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    return { error: error.message };
  }
}
