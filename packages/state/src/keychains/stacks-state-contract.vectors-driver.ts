import { descriptorKeychainSelectors, filterKeychainsByStacksAccount } from './keychain.utils';

export function select(descriptors: string[], fingerprint: string, index: number) {
  const selectors = descriptorKeychainSelectors(
    descriptors.map(descriptor => ({ descriptor })),
    filterKeychainsByStacksAccount
  );
  return {
    fingerprint: selectors.fromFingerprint(fingerprint),
    index: selectors.fromAccountIndex(fingerprint, index),
    id: selectors.fromAccountId(fingerprint + '/' + index),
  };
}
