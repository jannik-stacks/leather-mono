import {
  AddressHashMode,
  AddressVersion,
  addressFromPublicKeys,
  addressToString,
  createStacksPublicKey,
} from '@stacks/transactions';
import { readFileSync as readStacksVectorFileSync } from 'node:fs';

import type { VaultAccount, VaultAccountSigner } from '@leather.io/models';
import { createMoney } from '@leather.io/utils';

import { buildUnsignedMultisigStxTransfer } from './build-stx-transfer';
import * as transferContractVectorDriver from './transfer-contract.vectors-driver';

const publicKeys = [
  '0250863ad64a87ae8a2fe83c1af1a8403cb53f53e486d8511dad8a04887e5b2352',
  '03774ae7f858a9411e5ef4246b70c65aac5649980be5c17891bbec17895da008cb',
  '02f9308a019258c31049344f85f89d5229b531c845836f99b08601f113bce036f9',
];

const recipient = 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG';

function deriveTestnetAddress(threshold: number, keys: string[]) {
  return addressToString(
    addressFromPublicKeys(
      AddressVersion.TestnetMultiSig,
      AddressHashMode.P2SHNonSequential,
      threshold,
      keys.map(createStacksPublicKey)
    )
  );
}

function makeSigner(signerIndex: number, signingPubkey: string): VaultAccountSigner {
  return {
    network: 'stx:testnet',
    publicKey: signingPubkey,
    address: 'ST000000000000000000002AMW42H',
    id: `signer-${signerIndex}`,
    userId: `user-${signerIndex}`,
    xpub: null,
    xpubOriginFingerprint: null,
    xpubOriginPath: null,
    signerIndex,
    signingPubkey,
  };
}

function makeAccount(overrides: Partial<VaultAccount> = {}): VaultAccount {
  return {
    id: 'va-1',
    vaultId: 'v-1',
    name: 'Test vault account',
    icon: null,
    network: 'stx:testnet',
    threshold: 2,
    multisigAddress: deriveTestnetAddress(2, publicKeys),
    accountIndex: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    signers: publicKeys.map((key, index) => makeSigner(index, key)),
    pendingTransactionCount: 0,
    queuedTransactionCount: 0,
    ...overrides,
  };
}

describe(buildUnsignedMultisigStxTransfer.name, () => {
  test('builds a non-sequential multisig transfer with placeholder nonce 0', async () => {
    const tx = await buildUnsignedMultisigStxTransfer({
      account: makeAccount(),
      recipient,
      amount: createMoney(1_000_000, 'STX'),
      fee: createMoney(3000, 'STX'),
    });

    const { spendingCondition } = tx.auth;
    expect(spendingCondition.hashMode).toEqual(AddressHashMode.P2SHNonSequential);
    expect(Number(spendingCondition.nonce)).toEqual(0);
    expect(Number(spendingCondition.fee)).toEqual(3000);
    expect(
      'signaturesRequired' in spendingCondition && spendingCondition.signaturesRequired
    ).toEqual(2);
  });

  test('defaults the fee to zero for the estimation pass', async () => {
    const tx = await buildUnsignedMultisigStxTransfer({
      account: makeAccount(),
      recipient,
      amount: createMoney(1_000_000, 'STX'),
    });

    expect(Number(tx.auth.spendingCondition.fee)).toEqual(0);
  });

  test('orders signer public keys by signer index regardless of input order', async () => {
    const shuffledSigners = [...makeAccount().signers].reverse();

    const tx = await buildUnsignedMultisigStxTransfer({
      account: makeAccount({ signers: shuffledSigners }),
      recipient,
      amount: createMoney(1_000_000, 'STX'),
    });

    expect(tx.auth.spendingCondition.hashMode).toEqual(AddressHashMode.P2SHNonSequential);
  });

  test('throws when the derived sender does not match the vault address', async () => {
    await expect(
      buildUnsignedMultisigStxTransfer({
        account: makeAccount({ multisigAddress: 'SN2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4BG6ZQ5R' }),
        recipient,
        amount: createMoney(1_000_000, 'STX'),
      })
    ).rejects.toThrow('does not match vault address');
  });
});

describe('Stacks migration vectors: transfer-contract', () => {
  const expected: unknown = JSON.parse(
    readStacksVectorFileSync(__dirname + '/vectors/transfer-contract.json', 'utf8')
  );

  const realStxAccount = {
    id: '1c6e1479-4c6d-4495-b50e-2af7812ff2e6',
    vaultId: '476656f3-5967-4be0-92df-fcc79e031d6b',
    name: 'STX 2of3 (deux)',
    icon: 'piggybank',
    network: 'stx:mainnet',
    threshold: 2,
    multisigAddress: 'SM3D2DNRRVABKVTZTD680CTNCD6KDPTRGC06G4JKK',
    accountIndex: 1,
    createdAt: '2026-06-23T14:03:56.337Z',
    signers: [
      {
        network: 'stx:mainnet',
        publicKey: '024af1cf1974636213c5c197bb5eb8cc34601f17d1923bfb9fbe4f72a45abfa114',
        address: 'SP3FJQK31NMDM594YKP1640V5WESX38ENSSJ3YC6B',
        id: '99e0ec6e-58ba-4fa5-a908-6c45860d3291',
        userId: '834974b4-239b-4cb0-9e1c-f01813510394',
        xpub: null,
        xpubOriginFingerprint: null,
        xpubOriginPath: null,
        signerIndex: 0,
        signingPubkey: '024af1cf1974636213c5c197bb5eb8cc34601f17d1923bfb9fbe4f72a45abfa114',
      },
      {
        network: 'stx:mainnet',
        publicKey: '03bea6b877b6007ace146b99f96b47373b50a61db4ae0801366ce8e3ffd2e6e1e0',
        address: 'SPJYYA9MHWS5Z53WWNZN91AC1M4DB8P59DCENJMA',
        id: '65f873ca-f4b7-4d48-9bd8-a9222e121c06',
        userId: '0b9161c6-91ee-46f7-abdf-fbd93d4fe618',
        xpub: null,
        xpubOriginFingerprint: null,
        xpubOriginPath: null,
        signerIndex: 1,
        signingPubkey: '03bea6b877b6007ace146b99f96b47373b50a61db4ae0801366ce8e3ffd2e6e1e0',
      },
      {
        network: 'stx:mainnet',
        publicKey: '033e8d8852ea1beb9bb7f65d1a4f8d56c038e50e65faf7bf1c7e7584d55f11d1f4',
        address: 'SP3TB3AJ0XMZ9S6CGY2CQ6R06H1Z6DJQ1SH15ZP2H',
        id: 'd9dfe9cb-3f00-4d5b-afab-44058c753be0',
        userId: '27298df0-7632-487b-8d94-64a36b9f2d9c',
        xpub: null,
        xpubOriginFingerprint: null,
        xpubOriginPath: null,
        signerIndex: 2,
        signingPubkey: '033e8d8852ea1beb9bb7f65d1a4f8d56c038e50e65faf7bf1c7e7584d55f11d1f4',
      },
    ],
    pendingTransactionCount: 0,
    queuedTransactionCount: 0,
  } satisfies Parameters<typeof transferContractVectorDriver.build>[0];

  test('pins web multisig production builders, signer order, default fees and sender validation', async () => {
    const results = {
      stx: await transferContractVectorDriver.build(
        realStxAccount,
        'stx',
        '9007199254740993',
        'SP000000000000000000002Q6VF78'
      ),
      shuffled: await transferContractVectorDriver.build(
        { ...realStxAccount, signers: [...realStxAccount.signers].reverse() },
        'stx',
        '9007199254740993',
        'SP000000000000000000002Q6VF78'
      ),
      sip10: await transferContractVectorDriver.build(
        realStxAccount,
        'sip10',
        '9007199254740993',
        'SP000000000000000000002Q6VF78'
      ),
      tampered: await transferContractVectorDriver.build(
        { ...realStxAccount, multisigAddress: 'SN000000000000000000003YDHWKJ' },
        'stx',
        '1',
        'SP000000000000000000002Q6VF78'
      ),
    };
    const actual: unknown = JSON.parse(
      JSON.stringify(results, (_, value: unknown) =>
        typeof value === 'bigint' ? value.toString() : value
      )
    );
    expect(actual).toEqual(expected);
  });
});
