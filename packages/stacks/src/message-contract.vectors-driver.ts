import { bytesToHex } from '@stacks/common';
import { hashMessage } from '@stacks/encryption';
import { deserializeCV } from '@stacks/transactions';

import { signMessage, signStructuredDataMessage, verifySip018Signature } from './message-signing';
import { buildStxProposalDomain } from './multisig/stx-proposal-domain';

export function plain(message: string, privateKey: string) {
  return signMessage(message, privateKey);
}
export function plainHash(message: string) {
  return bytesToHex(hashMessage(message));
}
export function structured(messageHex: string, chainId: number, privateKey: string) {
  return signStructuredDataMessage(
    deserializeCV(messageHex),
    buildStxProposalDomain(chainId),
    privateKey
  );
}
export function verify(messageHex: string, chainId: number, signature: string, publicKey: string) {
  return verifySip018Signature({
    message: deserializeCV(messageHex),
    domain: buildStxProposalDomain(chainId),
    signature,
    publicKey,
  });
}
