import { type SwapExecutionData } from '@bitflowlabs/core-sdk';
import { Cl, Codec } from '@jannik-stacks/kit';
import { readFileSync } from 'node:fs';
import { expect, test, vi } from 'vitest';

import { createMock } from '../../../test/create-mock';
import { type HttpCacheService } from '../../cache/http-cache.service';
import { BitflowSdkClient } from '../bitflow/bitflow-sdk.client';
import { VelarSdkClient } from '../velar/velar-sdk.client';
import * as driver from './vendor-contract.vectors-driver';

const expected: unknown = JSON.parse(
  readFileSync(__dirname + '/vectors/vendor-contract.json', 'utf8')
);

test('pins vendor swap argument order, bigint units and unknown currency rejection', async () => {
  const results = [
    await driver.swap(
      'ST000000000000000000002AMW42H',
      'token-wstx',
      'token-alex',
      9007199254740993n,
      1234567890123456789n
    ),
    await driver.swap('ST000000000000000000002AMW42H', 'token-wstx', 'unknown', 1n, 0n),
  ];
  const actual: unknown = JSON.parse(
    JSON.stringify(results, (_, value: unknown) =>
      typeof value === 'bigint' ? value.toString() : value
    )
  );
  expect(actual).toEqual(expected);
});

const vendorSwap = vi.hoisted(() => vi.fn());
vi.mock('@velarprotocol/velar-sdk', () => ({
  VelarSDK: class {
    getSwapInstance() {
      return Promise.resolve({ swap: vendorSwap });
    }
  },
}));
vi.mock('@bitflowlabs/core-sdk', () => ({
  BitflowSDK: class {
    getSwapParams = vendorSwap;
  },
}));
test('preserves Velar and Bitflow swap wire values at their Kit boundaries', async () => {
  vendorSwap.mockResolvedValue({
    functionArgs: [{ type: 'uint', value: 9007199254740993n }],
    postConditions: [
      { type: 'stx-postcondition', address: 'origin', condition: 'eq', amount: '9007199254740993' },
    ],
    postConditionMode: 2,
  });
  const cache = createMock<HttpCacheService>({});
  const velar = new VelarSdkClient(cache);
  const bitflow = new BitflowSdkClient(
    {
      environment: 'test',
      bitflow: {
        bitflowApiHost: 'https://bitflow.example',
        bitflowApiKey: '',
        bitflowProviderAddress: '',
        keeperApiKey: '',
        keeperApiHost: '',
      },
    },
    cache
  );
  const velarTx = await velar.getSwap('ST000000000000000000002AMW42H', 'a', 'b', 1, 0);
  const results = [
    velarTx,
    await bitflow.getSwapParams(createMock<SwapExecutionData>({}), 'ST000000000000000000002AMW42H'),
  ];
  for (const tx of results) {
    if (!tx) throw new Error('Missing vendor transaction');
    expect(tx.functionArgs.map(Cl.serialize)).toEqual(['0100000000000000000020000000000001']);
    expect(tx.postConditions.map(Codec.Raw.PostCondition.encode)).toEqual([
      '0001010020000000000001',
    ]);
    expect(tx.postConditions[0]).toEqual({
      type: 'stx-postcondition',
      address: 'origin',
      condition: 'eq',
      amount: 9007199254740993n,
    });
  }
  expect(velarTx.postConditionMode).toBe('deny');
});
