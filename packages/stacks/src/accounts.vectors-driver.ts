import { HDKey } from '@scure/bip32';
import { bytesToHex } from '@stacks/common';
import {
  privateKeyToPublic,
  publicKeyToAddressSingleSig,
  publicKeyToHex,
} from '@stacks/transactions';
import crypto from 'node:crypto';
import { vi } from 'vitest';
import { z } from 'zod';

import { deriveStxMultisigAddress, generateRandomStacksAddress } from './addresses';
import { initalizeStacksSigner } from './signer/signer';
import {
  deriveStxPrivateKey,
  deriveStxPublicKey,
  makeStxDerivationPathForType,
  stacksChainIdToCoreNetworkMode,
  stacksRootKeychainToAccountDescriptorV2,
} from './stacks.utils';

export function randomAddress() {
  const entropy = vi
    .spyOn(crypto, 'randomBytes')
    .mockImplementation(
      (size: number, callback?: (error: Error | null, buffer: Buffer) => void) => {
        const bytes = Buffer.alloc(size, 1);
        if (callback) {
          callback(null, bytes);
          return;
        }
        return bytes;
      }
    );
  try {
    return generateRandomStacksAddress();
  } finally {
    entropy.mockRestore();
  }
}

export function storedAccount(descriptor: string, network: 'mainnet' | 'testnet') {
  const signer = initalizeStacksSigner({
    descriptor,
    network,
    signFn() {
      throw new Error('Signing is outside the stored-account vector');
    },
    signMessageFn() {
      throw new Error('Signing is outside the stored-account vector');
    },
    signStructuredMessageFn() {
      throw new Error('Signing is outside the stored-account vector');
    },
  });
  return {
    fingerprint: z.object({ fingerprint: z.string() }).parse(signer).fingerprint,
    accountIndex: signer.accountIndex,
    publicKey: bytesToHex(signer.publicKey),
    address: signer.address,
  };
}

export function account(seed: number[], index: number, type: 'stacks' | 'ledgerLive') {
  const keychain = HDKey.fromMasterSeed(Uint8Array.from(seed));
  const path = makeStxDerivationPathForType(type, index);
  const child = keychain.derive(path);
  if (!child.privateKey || !child.publicKey) throw new Error('Missing test key');
  return {
    path,
    privateKey: bytesToHex(child.privateKey),
    publicKey: bytesToHex(child.publicKey),
    leatherPrivateKey: deriveStxPrivateKey({ keychain, index }),
    leatherPublicKey: deriveStxPublicKey({ keychain, index }),
    descriptor: stacksRootKeychainToAccountDescriptorV2(keychain, index),
    mainnet: publicKeyToAddressSingleSig(child.publicKey, 'mainnet'),
    testnet: publicKeyToAddressSingleSig(child.publicKey, 'testnet'),
    compressed: publicKeyToHex(privateKeyToPublic(bytesToHex(child.privateKey) + '01')),
  };
}
export function multisig(publicKeys: string[], threshold: number, chainId: number) {
  return {
    address: deriveStxMultisigAddress({ publicKeys, threshold, chainId }),
    network: stacksChainIdToCoreNetworkMode(chainId),
  };
}
