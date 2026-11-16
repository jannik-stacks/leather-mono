import { Codec } from '@jannik-stacks/kit';
import { LedgerError } from '@zondax/ledger-stacks';
import { readFileSync as readStacksVectorFileSync } from 'node:fs';

import { ChainId } from '@leather.io/models';
import { generateStacksUnsignedTransaction } from '@leather.io/stacks';
import { createMoney } from '@leather.io/utils';

import {
  isLedgerDeviceDisconnectedError,
  isLedgerDeviceLockedError,
} from '../dmk/ledger-dmk-errors';
import { makeFakeLedgerStacksApp } from './ledger-app.mocks';
import * as ledgerContractVectorDriver from './ledger-contract.vectors-driver';
import {
  MINIMUM_STACKS_APP_VERSION,
  getStacksAppVersion,
  isStxAddressResponseRejected,
  isStxAddressResponseSuccess,
  showStxAddressOnDevice,
  signStacksTransactionWithSignature,
  stacksChainIdToSingleSigAddressVersion,
  validateStacksAppVersion,
} from './stacks-ledger-utils';

const recipient = 'SPXH3HNBPM5YP15VH16ZXZ9AX6CK289K3MCXRKCB';
const signerPublicKey = '02b6b0afe5f620bc8e532b640b148dd9dea0ed19d11f8ab420fcce488fe3974893';
const secondPublicKey = '03c1e856462ca2844adb898aee90af5237e9d1be0fe51212635b2f7a643b0585e1';
const signatureHex = '00'.repeat(65);
const signatureVrs = Buffer.from(signatureHex, 'hex');

describe(signStacksTransactionWithSignature.name, () => {
  test('sets the signature on single-sig transactions', async () => {
    const unsignedTx = await generateStacksUnsignedTransaction({
      recipient,
      amount: createMoney(500, 'STX'),
      fee: createMoney(100, 'STX'),
      nonce: 0,
      network: 'mainnet',
      publicKey: signerPublicKey,
      txType: 'token_transfer',
    });

    const signedTx = signStacksTransactionWithSignature(
      Codec.Transaction.encode(unsignedTx),
      signatureVrs
    );
    const spendingCondition = signedTx;

    if (spendingCondition.signaturesRequired !== undefined)
      throw new Error('Expected single-sig spending condition');

    expect(spendingCondition.signature).toEqual(signatureHex);
    expect(() => Codec.Transaction.encode(signedTx)).not.toThrow();
  });

  test('appends a signature auth field to multisig transactions', async () => {
    const unsignedTx = await generateStacksUnsignedTransaction({
      recipient,
      amount: createMoney(500, 'STX'),
      fee: createMoney(100, 'STX'),
      nonce: 0,
      network: 'mainnet',
      publicKeys: [secondPublicKey, signerPublicKey],
      numSignatures: 2,
      txType: 'token_transfer',
    });

    const signedTx = signStacksTransactionWithSignature(
      Codec.Transaction.encode(unsignedTx),
      signatureVrs
    );
    const spendingCondition = signedTx;

    if (spendingCondition.signaturesRequired === undefined)
      throw new Error('Expected multisig spending condition');

    expect(spendingCondition.signatures).toHaveLength(1);
    expect(() => Codec.Transaction.encode(signedTx)).not.toThrow();

    const serializedTx = Codec.Transaction.encode(signedTx);
    const deserializedTx = Codec.Transaction.decode(serializedTx);
    const deserializedSpendingCondition = deserializedTx;

    if (deserializedSpendingCondition.signaturesRequired === undefined)
      throw new Error('Expected deserialized multisig spending condition');

    expect(deserializedSpendingCondition.signatures).toHaveLength(1);
  });
});

function makeAddressResponse(returnCode: number) {
  return {
    returnCode,
    errorMessage: '',
    publicKey: Buffer.alloc(33),
    address: 'SPXH3HNBPM5YP15VH16ZXZ9AX6CK289K3MCXRKCB',
  };
}

describe(getStacksAppVersion.name, () => {
  function makeVersionResponse(returnCode: number, errorMessage: string) {
    return {
      returnCode,
      errorMessage,
      testMode: false,
      major: 0,
      minor: 26,
      patch: 19,
      deviceLocked: false,
      targetId: '',
    };
  }

  test('returns the version tagged with the app name and chain', async () => {
    const app = makeFakeLedgerStacksApp({
      getVersion: vi.fn().mockResolvedValue(makeVersionResponse(LedgerError.NoErrors, 'No errors')),
    });

    await expect(getStacksAppVersion(app)).resolves.toMatchObject({
      name: 'Stacks',
      chain: 'stacks',
      major: 0,
      minor: 26,
      patch: 19,
    });
  });

  test('keeps the disconnect cause when the transport fails during the version check', async () => {
    const response = Object.assign(makeVersionResponse(0xffff, 'Unknown transport error'), {
      cause: { _tag: 'DeviceDisconnectedWhileSendingError' },
    });
    const app = makeFakeLedgerStacksApp({ getVersion: vi.fn().mockResolvedValue(response) });

    await expect(getStacksAppVersion(app)).rejects.toSatisfy(isLedgerDeviceDisconnectedError);
  });

  test('keeps the status code when the device is locked during the version check', async () => {
    const app = makeFakeLedgerStacksApp({
      getVersion: vi.fn().mockResolvedValue(makeVersionResponse(0x5515, 'Unknown Status Code')),
    });

    await expect(getStacksAppVersion(app)).rejects.toSatisfy(isLedgerDeviceLockedError);
  });
});

describe(stacksChainIdToSingleSigAddressVersion.name, () => {
  test('maps the mainnet chain id to the mainnet single sig version', () => {
    expect(stacksChainIdToSingleSigAddressVersion(ChainId.Mainnet)).toBe(22);
  });

  test('maps the testnet chain id to the testnet single sig version', () => {
    expect(stacksChainIdToSingleSigAddressVersion(ChainId.Testnet)).toBe(26);
  });

  test('falls back to the testnet version for custom chain ids', () => {
    expect(stacksChainIdToSingleSigAddressVersion(256)).toBe(26);
  });
});

describe(isStxAddressResponseRejected.name, () => {
  test('detects an on-device rejection', () => {
    expect(isStxAddressResponseRejected(makeAddressResponse(LedgerError.TransactionRejected))).toBe(
      true
    );
  });

  test('does not flag a successful response', () => {
    expect(isStxAddressResponseRejected(makeAddressResponse(LedgerError.NoErrors))).toBe(false);
  });
});

describe(isStxAddressResponseSuccess.name, () => {
  test('accepts a successful response', () => {
    expect(isStxAddressResponseSuccess(makeAddressResponse(LedgerError.NoErrors))).toBe(true);
  });

  test('rejects any error return code', () => {
    expect(isStxAddressResponseSuccess(makeAddressResponse(LedgerError.TransactionRejected))).toBe(
      false
    );
  });
});

describe(showStxAddressOnDevice.name, () => {
  test('shows the account derivation path with the given address version', async () => {
    const showAddressAndPubKey = vi.fn(() =>
      Promise.resolve(makeAddressResponse(LedgerError.NoErrors))
    );
    const app = makeFakeLedgerStacksApp({ showAddressAndPubKey });

    await showStxAddressOnDevice(app)("m/44'/5757'/0'/0/3", 22);

    expect(showAddressAndPubKey).toHaveBeenCalledWith("m/44'/5757'/0'/0/3", 22);
  });

  test('shows a ledger live derivation path unchanged', async () => {
    const showAddressAndPubKey = vi.fn(() =>
      Promise.resolve(makeAddressResponse(LedgerError.NoErrors))
    );
    const app = makeFakeLedgerStacksApp({ showAddressAndPubKey });

    await showStxAddressOnDevice(app)("m/44'/5757'/3'/0/0", 22);

    expect(showAddressAndPubKey).toHaveBeenCalledWith("m/44'/5757'/3'/0/0", 22);
  });
});

describe(validateStacksAppVersion.name, () => {
  test('rejects versions below the minimum', () => {
    expect(validateStacksAppVersion({ major: 0, minor: 26, patch: 18 })).toEqual({
      meetsMinimum: false,
      currentVersion: '0.26.18',
    });
    expect(validateStacksAppVersion({ major: 0, minor: 25, patch: 99 }).meetsMinimum).toBe(false);
  });

  test('accepts the exact minimum version', () => {
    expect(validateStacksAppVersion({ major: 0, minor: 26, patch: 19 })).toEqual({
      meetsMinimum: true,
      currentVersion: MINIMUM_STACKS_APP_VERSION,
    });
  });

  test('accepts versions above the minimum', () => {
    expect(validateStacksAppVersion({ major: 0, minor: 26, patch: 20 }).meetsMinimum).toBe(true);
    expect(validateStacksAppVersion({ major: 0, minor: 27, patch: 0 }).meetsMinimum).toBe(true);
    expect(validateStacksAppVersion({ major: 1, minor: 0, patch: 0 }).meetsMinimum).toBe(true);
  });
});

describe('Stacks migration vectors: ledger-contract', () => {
  const expected: unknown = JSON.parse(
    readStacksVectorFileSync(__dirname + '/vectors/ledger-contract.json', 'utf8')
  );

  test('pins Ledger VRS transaction fields and RSV message signature layout', () => {
    const unsigned =
      '8080000000040563859964ea29ad5a0916500860e2c4adec0a6b270020000000000001000000000000014100000000000203020000000000051a0000000000000000000000000000000000000000002000000000000100000000000000000000000000000000000000000000000000000000000000000000';
    const signature =
      '00c97448cd7db4c5a7a782c1a7fd5c975cbc67087e09c95a5c09aa6b45d045000b09261a8270ab63586e4385166eb6aa22fc0327448ae9e58a586267b627a0777f';
    const results = {
      multisig: ledgerContractVectorDriver.sign(unsigned, signature),
      addressVersions: [1, 2147483648, 256].map(ledgerContractVectorDriver.addressVersion),
    };
    const actual: unknown = JSON.parse(
      JSON.stringify(results, (_, value: unknown) =>
        typeof value === 'bigint' ? value.toString() : value
      )
    );
    expect(actual).toEqual(expected);
  });
});
