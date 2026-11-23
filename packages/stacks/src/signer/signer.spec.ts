import { HDKey } from '@scure/bip32';

import { deriveBip39SeedFromMnemonic } from '@leather.io/crypto';
import { testMnemonic } from '@leather.io/test-config';

import { storedAccount } from '../accounts.vectors-driver';
import { stacksRootKeychainToAccountDescriptor } from '../stacks.utils';
import { initalizeStacksSigner } from './signer';

const testMnemonicKeychain = HDKey.fromMasterSeed(await deriveBip39SeedFromMnemonic(testMnemonic));

const mockStructureData = {
  signature: '',
  publicKey: '',
};

test('loads literal stored software and Ledger descriptors into the same account identities', () => {
  const software =
    "[000f25e8/44'/5757'/0'/0/1]026b15fdaf16b01db1eb36314d1bc9edd274ec4bf166123164a62e3715eb42716c";
  const ledger =
    "[00000000/44'/5757'/2'/0/0]02ffb37e6635be77b666f94204b20149ff91c7bea3502610d22645b8e0f334efc5";
  expect([
    storedAccount(software, 'mainnet'),
    storedAccount(software, 'testnet'),
    storedAccount(ledger, 'mainnet'),
    storedAccount(ledger, 'testnet'),
  ]).toEqual([
    {
      accountIndex: 1,
      address: 'SP3F9HGJNBA6TGEVF8TB9TKGA2GZR707DTGMGG11V',
      fingerprint: '000f25e8',
      publicKey: '026b15fdaf16b01db1eb36314d1bc9edd274ec4bf166123164a62e3715eb42716c',
    },
    {
      accountIndex: 1,
      address: 'ST3F9HGJNBA6TGEVF8TB9TKGA2GZR707DTHYGTAD3',
      fingerprint: '000f25e8',
      publicKey: '026b15fdaf16b01db1eb36314d1bc9edd274ec4bf166123164a62e3715eb42716c',
    },
    {
      accountIndex: 2,
      address: 'SP281432855PWGVM7GCX85JRERB7TJ80NEBES6TTC',
      fingerprint: '00000000',
      publicKey: '02ffb37e6635be77b666f94204b20149ff91c7bea3502610d22645b8e0f334efc5',
    },
    {
      accountIndex: 2,
      address: 'ST281432855PWGVM7GCX85JRERB7TJ80NEAVV0PJ2',
      fingerprint: '00000000',
      publicKey: '02ffb37e6635be77b666f94204b20149ff91c7bea3502610d22645b8e0f334efc5',
    },
  ]);
});

describe(initalizeStacksSigner.name, () => {
  const descriptor = stacksRootKeychainToAccountDescriptor(testMnemonicKeychain, 0);

  test('it derives the correct mainnet address', () => {
    const account = initalizeStacksSigner({
      descriptor,
      network: 'mainnet',
      signFn: tx => Promise.resolve(tx),
      signMessageFn: () => Promise.resolve(mockStructureData),
      signStructuredMessageFn: () => Promise.resolve(mockStructureData),
    });
    expect(account.address).toEqual('SP148VBW07WJ81V6B1FM0QP4AKB14QSRQQXERFRRV');
  });

  test('it derives the correct testnet address', () => {
    const account = initalizeStacksSigner({
      descriptor,
      network: 'testnet',
      signFn: tx => Promise.resolve(tx),
      signMessageFn: () => Promise.resolve(mockStructureData),
      signStructuredMessageFn: () => Promise.resolve(mockStructureData),
    });
    expect(account.address).toEqual('ST148VBW07WJ81V6B1FM0QP4AKB14QSRQQZ717SWG');
  });
});
