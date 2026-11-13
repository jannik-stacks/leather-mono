import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

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
