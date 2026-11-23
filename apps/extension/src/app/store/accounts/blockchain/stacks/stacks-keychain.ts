import { type NetworkName, privateKeyToPublicKey, publicKeyToAddress } from '@jannik-stacks/kit';
import { type HDKey } from '@scure/bip32';

import { deriveStxPrivateKey } from '@leather.io/stacks';

export function getStacksAddressByIndex(rootKeychain: HDKey, network: NetworkName) {
  return (index: number) => {
    const accountPrivateKey = deriveStxPrivateKey({
      keychain: rootKeychain,
      index,
    });

    const pubKey = privateKeyToPublicKey(accountPrivateKey);
    return publicKeyToAddress(pubKey, { network });
  };
}
