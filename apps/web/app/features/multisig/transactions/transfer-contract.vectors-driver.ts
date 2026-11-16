import { Codec } from '@jannik-stacks/kit';
import { sha512_256 } from '@noble/hashes/sha512';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import BigNumber from 'bignumber.js';

import { type VaultAccount } from '@leather.io/models';
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
      hex: Codec.Transaction.encode(tx),
      txid: bytesToHex(sha512_256(hexToBytes(Codec.Transaction.encode(tx)))),
      nonce: tx.nonce ?? 0n,
      fee: tx.fee ?? 0n,
    };
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    return { error: error.message };
  }
}
