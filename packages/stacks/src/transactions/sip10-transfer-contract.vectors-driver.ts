import { hexToBytes } from '@stacks/common';
import type { StacksNetwork } from '@stacks/network';
import { PostConditionMode, deserializeTransaction } from '@stacks/transactions';

import { createMoney } from '@leather.io/utils';

import { createTransferSip10TxHex } from './create-tx-hex';
import { decodeStxTransactionPayload } from './decode-stx-transaction';
import { getVerifiedSip10TransferDetails } from './sip-10-contract-call.utils';

export async function transfer(input: {
  publicKey: string;
  address: string;
  assetId: string;
  recipient: string;
  amount: number;
  nonce: number;
  fee: number;
  memo?: string;
  sponsored?: boolean;
  network?: StacksNetwork;
}) {
  const hex = await createTransferSip10TxHex({
    ...input,
    signer: { publicKey: hexToBytes(input.publicKey), address: input.address },
    fee: createMoney(input.fee, 'STX'),
  });
  const tx = deserializeTransaction(hex);
  const verified = getVerifiedSip10TransferDetails(tx);
  tx.postConditionMode = PostConditionMode.Allow;
  const tampered = getVerifiedSip10TransferDetails(tx);
  return {
    hex,
    txid: deserializeTransaction(hex).txid(),
    decoded: decodeStxTransactionPayload(hex),
    verified,
    tampered,
  };
}
