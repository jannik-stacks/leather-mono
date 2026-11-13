import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

import * as driver from './broadcast-contract.vectors-driver';

const expected: unknown = JSON.parse(
  readFileSync(__dirname + '/vectors/broadcast-contract.json', 'utf8')
);

test('pins successful, rejected and missing-txid broadcast results', async () => {
  const hex =
    '808000000004050e8321711b6c80b9137997b99ad33252b6d6a3cb0020000000000001000000000000014100000000000103020000000000051a0000000000000000000000000000000000000000002000000000000100000000000000000000000000000000000000000000000000000000000000000000';
  const results = await Promise.all(
    [
      { txid: 'bc1267dee77ba1b2a80311323d7903a9ee1206797ec06256b4ec230b2da599aa' },
      { error: 'transaction rejected', reason: 'BadNonce' },
      {},
    ].map(response => driver.result(hex, response))
  );
  const actual: unknown = JSON.parse(
    JSON.stringify(results, (_, value: unknown) =>
      typeof value === 'bigint' ? value.toString() : value
    )
  );
  expect(actual).toEqual(expected);
});
