import { decryptMnemonic } from '@stacks/encryption';
import { LocalStorageMock } from '@tests/unit/local-storage-mock';
import { vi } from 'vitest';

import { assumedZeroFingerprint } from '@shared/utils';

import type { initialKeysState } from '../software-keys/software-key.slice';
import { migrateVaultReducerStoreToNewStateStructure } from './vault-reducer-migration';

Reflect.set(globalThis, 'localStorage', new LocalStorageMock());

test('decrypts the fixed mnemonic after migrating the legacy localStorage vault keys', async () => {
  localStorage.setItem('stacks-wallet-salt', '07070707070707070707070707070707');
  localStorage.setItem(
    'stacks-wallet-encrypted-key',
    '070707070707070707070707070707079c344e86d8b6f5b4ed4d6a646844e9b01328cf847854e9dcbbaebf4b833a4d140ed8ca251d0d35b149bb086085ad971169fbe3419cb154c49e5b5cdbf30a68d9'
  );
  const migrated = migrateVaultReducerStoreToNewStateStructure(createEmptyKeysState());
  const key = migrated.entities[assumedZeroFingerprint];
  if (!key) throw new Error('Missing migrated key');
  expect(
    await decryptMnemonic(
      key.encryptedSecretKey,
      '7002728d90ebd2ef32b51a6d197970a6788baddfed67034c7b98f35fc5ba1762972f2dd332bcd9e2bb406b51dfd5c6dd'
    )
  ).toEqual(
    'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
  );
  expect(localStorage.getItem('stacks-wallet-salt')).toBeNull();
  expect(localStorage.getItem('stacks-wallet-encrypted-key')).toBeNull();
});

function createEmptyKeysState(): typeof initialKeysState {
  return { ids: [], entities: {} };
}

describe(migrateVaultReducerStoreToNewStateStructure.name, () => {
  describe('no migration needed scenario', () => {
    test('nothing happens when no localStorage values are detected', () => {
      const emptyKeysState = createEmptyKeysState();
      const returnedValue = migrateVaultReducerStoreToNewStateStructure(emptyKeysState);
      expect(returnedValue).toEqual(emptyKeysState);
    });
  });

  describe('migration scenario', () => {
    beforeEach(() => {
      localStorage.setItem('stacks-wallet-salt', 'test-salt');
      localStorage.setItem('stacks-wallet-encrypted-key', 'test-encrypted-key');
    });

    test('that it reads localstorage wallet values', () => {
      const getItemSpy = vi.spyOn(LocalStorageMock.prototype, 'getItem');

      migrateVaultReducerStoreToNewStateStructure(createEmptyKeysState());

      expect(getItemSpy).toHaveBeenCalledWith('stacks-wallet-salt');
      expect(getItemSpy).toHaveBeenCalledWith('stacks-wallet-encrypted-key');
    });

    test('that it returns a migrated state object when wallet values are detected', () => {
      const returnedValue = migrateVaultReducerStoreToNewStateStructure(createEmptyKeysState());
      expect(returnedValue).toEqual({
        ids: [assumedZeroFingerprint],
        entities: {
          [assumedZeroFingerprint]: {
            type: 'software',
            id: assumedZeroFingerprint,
            encryptedSecretKey: 'test-encrypted-key',
            salt: 'test-salt',
          },
        },
      });
    });

    test('it removes the existing localStorage values', () => {
      const removeItemSpy = vi.spyOn(LocalStorageMock.prototype, 'removeItem');
      migrateVaultReducerStoreToNewStateStructure(createEmptyKeysState());
      expect(removeItemSpy).toHaveBeenCalledWith('stacks-wallet-salt');
      expect(removeItemSpy).toHaveBeenCalledWith('stacks-wallet-encrypted-key');
    });
  });
});
