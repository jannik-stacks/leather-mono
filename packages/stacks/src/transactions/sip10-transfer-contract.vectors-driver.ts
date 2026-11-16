import { Codec, type StacksNetwork } from '@jannik-stacks/kit';
import { sha512_256 } from '@noble/hashes/sha512';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';

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
  const tx = Codec.Transaction.decode(hex);
  const verified = getVerifiedSip10TransferDetails(tx);
  tx.postConditionMode = 'allow';
  const tampered = getVerifiedSip10TransferDetails(tx);
  return {
    hex,
    txid: bytesToHex(sha512_256(hexToBytes(hex))),
    decoded: decodeStxTransactionPayload(hex),
    verified,
    tampered,
  };
}
