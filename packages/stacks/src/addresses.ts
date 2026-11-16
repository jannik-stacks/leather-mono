import { privateKeyToAddress, publicKeysToAddress } from '@jannik-stacks/kit';
import { secp256k1 } from '@noble/curves/secp256k1';
import { bytesToHex, randomBytes } from '@noble/hashes/utils';

import { stacksChainIdToCoreNetworkMode } from './stacks.utils';

export function generateRandomStacksAddress() {
  const entropyBytes = 40;
  const entropy = BigInt('0x' + bytesToHex(randomBytes(entropyBytes)));
  const scalar = (entropy % (secp256k1.CURVE.n - 1n)) + 1n;
  return privateKeyToAddress(scalar.toString(16).padStart(64, '0'));
}

interface DeriveStxMultisigAddressArgs {
  publicKeys: string[];
  threshold: number;
  chainId: number;
}

// Derives the c32 multisig address (SM… mainnet / SN… testnet) for an ordered
// set of compressed public keys and an m-of-n threshold. Uses the
// P2SHNonSequential hash mode so signers may sign in any order. The public key
// order is part of the address identity and must NOT be sorted here.
export function deriveStxMultisigAddress({
  publicKeys,
  threshold,
  chainId,
}: DeriveStxMultisigAddressArgs): string {
  return publicKeysToAddress(
    { publicKeys, threshold },
    { network: stacksChainIdToCoreNetworkMode(chainId) }
  );
}
