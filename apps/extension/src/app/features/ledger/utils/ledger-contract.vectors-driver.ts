import { signatureVrsToRsv } from '@stacks/common';

import {
  signStacksTransactionWithSignature,
  stacksChainIdToSingleSigAddressVersion,
} from './stacks-ledger-utils';

export function sign(hex: string, signature: string) {
  const tx = signStacksTransactionWithSignature(hex, Buffer.from(signature, 'hex'));
  return {
    hex: tx.serialize(),
    txid: tx.txid(),
    messageSignature: signatureVrsToRsv(signature),
  };
}
export { stacksChainIdToSingleSigAddressVersion as addressVersion };
