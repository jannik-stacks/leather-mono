import { Codec } from '@jannik-stacks/kit';
import { sha512_256 } from '@noble/hashes/sha512';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import { signatureVrsToRsv } from '@stacks/common';

import {
  signStacksTransactionWithSignature,
  stacksChainIdToSingleSigAddressVersion,
} from './stacks-ledger-utils';

export function sign(hex: string, signature: string) {
  const tx = signStacksTransactionWithSignature(hex, Buffer.from(signature, 'hex'));
  return {
    hex: Codec.Transaction.encode(tx),
    txid: bytesToHex(sha512_256(hexToBytes(Codec.Transaction.encode(tx)))),
    messageSignature: signatureVrsToRsv(signature),
  };
}
export { stacksChainIdToSingleSigAddressVersion as addressVersion };
