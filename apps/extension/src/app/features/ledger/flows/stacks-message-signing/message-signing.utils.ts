import { Cl, type ClarityValue } from '@jannik-stacks/kit';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex, concatBytes, hexToBytes } from '@noble/hashes/utils';

import { ChainId } from '@leather.io/models';
import { formatClarityValue, stacksChainIdToCoreNetworkMode } from '@leather.io/stacks';
import { capitalize } from '@leather.io/utils';

import { type UnsignedMessageStructured } from '@shared/signature/signature-types';

export function cvToDisplay(cv: ClarityValue): string {
  return formatClarityValue(cv).replaceAll('"', '');
}

export function chainIdToDisplay(chainIdCv: ClarityValue): string | undefined {
  if (chainIdCv.type !== 'uint') return undefined;
  const chainIdString = formatClarityValue(chainIdCv);
  const chainId = parseInt(chainIdString.replace('u', ''), 10);
  if (chainId !== ChainId.Mainnet && chainId !== ChainId.Testnet) return undefined;
  return capitalize(stacksChainIdToCoreNetworkMode(chainId));
}

export function deriveStructuredMessageHash({
  domain,
  message,
}: Omit<UnsignedMessageStructured, 'messageType'>) {
  return bytesToHex(
    sha256(
      concatBytes(
        new TextEncoder().encode('SIP018'),
        sha256(hexToBytes(Cl.serialize(domain))),
        sha256(hexToBytes(Cl.serialize(message)))
      )
    )
  );
}
