import { makeUnsignedSTXTokenTransfer } from '@stacks/transactions';
import { readFileSync as readStacksVectorFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

import { defaultNetworksKeyedById } from '@leather.io/models';
import type { UserSettings } from '@leather.io/services';

import * as feeQueryContractVectorDriver from './fee-query-contract.vectors-driver';
import { createStacksTransactionFeesQueryKey } from './stacks-transaction-fees.query-config';

const settings: UserSettings = {
  network: defaultNetworksKeyedById.mainnet,
  quoteCurrency: 'USD',
  assetVisibility: {},
};

async function makeTransaction(numSignatures: number) {
  return makeUnsignedSTXTokenTransfer({
    publicKeys: [
      '0250863ad64a87ae8a2fe83c1af1a8403cb53f53e486d8511dad8a04887e5b2352',
      '03774ae7f858a9411e5ef4246b70c65aac5649980be5c17891bbec17895da008cb',
    ],
    numSignatures,
    useNonSequentialMultiSig: true,
    recipient: 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG',
    amount: 1,
    fee: 0,
    nonce: 0,
    network: 'testnet',
  });
}

describe(createStacksTransactionFeesQueryKey.name, () => {
  test('separates estimates for different multisig thresholds', async () => {
    const oneSignature = await makeTransaction(1);
    const twoSignatures = await makeTransaction(2);
    expect(createStacksTransactionFeesQueryKey(oneSignature, settings, 2)).not.toEqual(
      createStacksTransactionFeesQueryKey(twoSignatures, settings, 2)
    );
  });

  test('separates estimates for different signer counts', async () => {
    const tx = await makeTransaction(1);
    expect(createStacksTransactionFeesQueryKey(tx, settings, 2)).not.toEqual(
      createStacksTransactionFeesQueryKey(tx, settings, 3)
    );
  });
});

describe('Stacks migration vectors: fee-query-contract', () => {
  const expected: unknown = JSON.parse(
    readStacksVectorFileSync(__dirname + '/vectors/fee-query-contract.json', 'utf8')
  );

  test('pins payload, multisig threshold and signer count fee query keys', () => {
    const hex =
      '8080000000040563859964ea29ad5a0916500860e2c4adec0a6b270020000000000001000000000000014100000000000203020000000000051a0000000000000000000000000000000000000000002000000000000100000000000000000000000000000000000000000000000000000000000000000000';
    const results = [undefined, 2, 3].map(count => feeQueryContractVectorDriver.query(hex, count));
    const actual: unknown = JSON.parse(
      JSON.stringify(results, (_, value: unknown) =>
        typeof value === 'bigint' ? value.toString() : value
      )
    );
    expect(actual).toEqual(expected);
  });
});
