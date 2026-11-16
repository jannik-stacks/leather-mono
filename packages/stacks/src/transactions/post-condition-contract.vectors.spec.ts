import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

import * as driver from './post-condition-contract.vectors-driver';

const expected: unknown = JSON.parse(
  readFileSync(__dirname + '/vectors/post-condition-contract.json', 'utf8')
);

test('pins every post-condition family, principal form and condition code', () => {
  const address = 'ST000000000000000000002AMW42H';
  const asset = 'ST000000000000000000002AMW42H.token::coin';
  const fungible: ('eq' | 'gt' | 'gte' | 'lt' | 'lte')[] = ['eq', 'gt', 'gte', 'lt', 'lte'];
  const results = {
    stx: fungible.map(condition =>
      driver.condition({
        type: 'stx-postcondition',
        address,
        amount: '9007199254740993',
        condition,
      })
    ),
    ft: fungible.map(condition =>
      driver.condition({
        type: 'ft-postcondition',
        address: address + '.vault',
        asset,
        amount: '100',
        condition,
      })
    ),
    nft: (['sent', 'not-sent', 'maybe-sent'] satisfies ('sent' | 'not-sent' | 'maybe-sent')[]).map(
      condition =>
        driver.nft({
          type: 'nft-postcondition',
          address,
          asset,
          assetId: '010000000000000000000000000000002a',
          condition,
        })
    ),
    staking: fungible.map(condition =>
      driver.condition({ type: 'staking-postcondition', address, amount: '40000000', condition })
    ),
    pox: [
      driver.condition({ type: 'pox-postcondition', address: 'origin', condition: 'may-perform' }),
      driver.condition({ type: 'pox-postcondition', address, condition: 'will-perform' }),
      driver.condition({ type: 'pox-postcondition', address, condition: 'will-not-perform' }),
    ],
    malformed: ['', 'abcd1234', 'ff', '000216'].map(driver.malformed),
  };
  const actual: unknown = JSON.parse(
    JSON.stringify(results, (_, value: unknown) =>
      typeof value === 'bigint' ? value.toString() : value
    )
  );
  expect(actual).toEqual(expected);
});
