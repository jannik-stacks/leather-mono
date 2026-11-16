import { Cl } from '@jannik-stacks/kit';

import { multisigProposalDomainTag } from '@leather.io/crypto';
import { type AuthNetworkId } from '@leather.io/models';

const stxMainnetChainId = 1;
const stxTestnetChainId = 2147483648;

export const stxChainIdByAuthNetworkId: Record<AuthNetworkId, number> = {
  'stx:mainnet': stxMainnetChainId,
  'stx:testnet': stxTestnetChainId,
  'btc:mainnet': stxTestnetChainId,
  'btc:testnet': stxTestnetChainId,
  'btc:regtest': stxTestnetChainId,
};

// SIP-018 domain for the STX proposal commitment
export function buildStxProposalDomain(chainId: number): Cl.Types.Tuple {
  return {
    type: 'tuple',
    value: {
      name: Cl.ascii(multisigProposalDomainTag),
      version: Cl.ascii('1'),
      'chain-id': Cl.uint(chainId),
    },
  };
}
