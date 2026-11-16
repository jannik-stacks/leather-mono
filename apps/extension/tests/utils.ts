import {
  Codec,
  type NetworkName,
  publicKeyToAddress,
  publicKeysToAddress,
} from '@jannik-stacks/kit';
import { type Locator, expect } from '@playwright/test';

import { SharedComponentsSelectors } from './selectors/shared-component.selectors';

const settledReadCount = 5;
const settledReadIntervalMs = 200;
const settleTimeoutMs = 10_000;

export async function expectToSettleAt<T>(read: () => Promise<T>, expected: T) {
  let consecutiveMatches = 0;
  await expect
    .poll(
      async () => {
        consecutiveMatches = (await read()) === expected ? consecutiveMatches + 1 : 0;
        return consecutiveMatches;
      },
      { intervals: [settledReadIntervalMs], timeout: settleTimeoutMs }
    )
    .toBe(settledReadCount);
}

export function json(arg: unknown) {
  return {
    body: JSON.stringify(arg),
    contentType: 'application/json',
  };
}

export function createTestSelector<T extends string>(name: T): `[data-testid="${T}"]` {
  return `[data-testid="${name}"]`;
}

export async function getDisplayerAddress(locator: Locator) {
  const displayerAddress = await locator
    .getByTestId(SharedComponentsSelectors.AddressDisplayer)
    .innerText();

  return displayerAddress.replaceAll('\n', '');
}

const unsignedTransferFee = 200;
const unsignedTransferNonce = 0;

export async function generateUnsignedStxTransfer(
  recipient: string,
  amount: number,
  network: NetworkName,
  publicKey: string,
  memo?: string
) {
  return Promise.resolve(
    Codec.Transaction.encode({
      type: 'transfer',
      recipient,
      memo,
      signer: { value: publicKeyToAddress(publicKey, { network }) },
      amount: BigInt(amount),
      network,
      fee: BigInt(unsignedTransferFee),
      nonce: BigInt(unsignedTransferNonce),
    })
  );
}

export async function generateMultisigUnsignedStxTransfer(
  recipient: string,
  amount: number,
  fee: number,
  network: NetworkName,
  publicKeys: string[],
  threshold: number,
  nonce: number,
  memo?: string
) {
  return Promise.resolve(
    Codec.Transaction.encode({
      type: 'transfer',
      fee: BigInt(fee),
      recipient,
      memo,
      signer: {
        value: publicKeysToAddress({ publicKeys, threshold }, { network }),
        hashMode: 'p2sh',
      },
      nonce: BigInt(nonce),
      signaturesRequired: threshold,
      signatures: [],
      amount: BigInt(amount),
      network,
    })
  );
}

// Intl formatters like NumberFormat output non-breaking spaces. This helper can wrap expected strings to avoid manually writing \u00A0 in tests.
export function withNbsp(value: string) {
  return value.replace(/ /g, '\u00A0');
}
