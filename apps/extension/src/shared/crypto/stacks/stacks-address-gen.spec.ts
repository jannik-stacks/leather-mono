import { HDKey } from '@scure/bip32';
import { mnemonicToSeedSync } from '@scure/bip39';

import { DATA_DERIVATION_PATH, deriveStacksSalt } from './stacks-address-gen';

describe(deriveStacksSalt.name, () => {
  test('it makes the same hash as wallet sdk', () => {
    const mnemonic = 'candy maple cake sugar pudding cream honey rich smooth crumble sweet treat';
    const seed = mnemonicToSeedSync(mnemonic);
    const keychain = HDKey.fromMasterSeed(seed);

    const result = deriveStacksSalt(keychain.derive(DATA_DERIVATION_PATH));

    const walletSdkResult = '1e21b44e4a7f4839a59e3a80ed9b0c42f52f04ae6f2891b20c26deea38db8cc4';

    expect(result).toEqual(walletSdkResult);
  });
});
