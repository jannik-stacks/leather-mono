import { Cl, hashMessage } from '@jannik-stacks/kit';

import { signMessage, signStructuredDataMessage, verifySip018Signature } from './message-signing';
import { buildStxProposalDomain } from './multisig/stx-proposal-domain';

export function plain(message: string, privateKey: string) {
  return signMessage(message, privateKey);
}
export function plainHash(message: string) {
  return hashMessage(message);
}
export function structured(messageHex: string, chainId: number, privateKey: string) {
  return signStructuredDataMessage(
    Cl.deserialize(messageHex),
    buildStxProposalDomain(chainId),
    privateKey
  );
}
export function verify(messageHex: string, chainId: number, signature: string, publicKey: string) {
  return verifySip018Signature({
    message: Cl.deserialize(messageHex),
    domain: buildStxProposalDomain(chainId),
    signature,
    publicKey,
  });
}
