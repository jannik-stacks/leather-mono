import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

import * as driver from './request-contract.vectors-driver';

const expected: unknown = JSON.parse(
  readFileSync(__dirname + '/vectors/request-contract.json', 'utf8')
);

test('pins mobile request fees, zero nonce handling, sponsorship and modes', () => {
  const inputs: Parameters<typeof driver.request>[0][] = [
    {},
    { fee: 1000.4 },
    { fee: 0 },
    { nonce: 0 },
    { nonce: 3 },
    { sponsored: true, fee: 1000 },
    { sponsored: true, fee: 0 },
    { postConditions: ['0301030000000002625a00'], postConditionMode: 'originator' },
  ];
  const results = inputs.map(params => driver.request(params, 7));
  const actual: unknown = JSON.parse(
    JSON.stringify(results, (_, value: unknown) =>
      typeof value === 'bigint' ? value.toString() : value
    )
  );
  expect(actual).toEqual(expected);
});
