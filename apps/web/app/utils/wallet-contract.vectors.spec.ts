import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

import * as driver from './wallet-contract.vectors-driver';

const expected: unknown = JSON.parse(
  readFileSync(__dirname + '/vectors/wallet-contract.json', 'utf8')
);

test('pins wallet selection, rejection, disconnect and contract request behavior', async () => {
  const params = {
    contract: 'SP000000000000000000002Q6VF78.pox-5',
    functionName: 'stake',
    functionArgs: ['09'],
    postConditionMode: 'deny',
  } satisfies Parameters<typeof driver.call>[0];
  const results = {
    select: await driver.connect(true),
    leather: await driver.connect(false),
    canceled: await driver.connect(true, -31001),
    revoke: await driver.revoke('XverseProviders.BitcoinProvider', false),
    unsupported: await driver.revoke('XverseProviders.BitcoinProvider', true),
    leatherDisconnect: await driver.revoke('LeatherProvider', false),
    rejections: ['LeatherProvider', 'XverseProviders.BitcoinProvider'].map(id =>
      [4001, -32000, -31001, -32603].map(code => driver.rejection(id, code))
    ),
    call: await driver.call(params, true),
    noProvider: await driver.call(params, false),
    malformed: await driver.call({ ...params, contract: 'invalid' }, true),
  };
  const actual: unknown = JSON.parse(
    JSON.stringify(results, (_, value: unknown) =>
      typeof value === 'bigint' ? value.toString() : value
    )
  );
  expect(actual).toEqual(expected);
});

test('pins the actual SDK contract request sent to the selected wallet', async () => {
  const actual = await driver.nativeCall({
    contract: 'SP000000000000000000002Q6VF78.pox-5',
    functionName: 'stake',
    functionArgs: ['09'],
    postConditionMode: 'deny',
  });
  const expected: unknown = JSON.parse(
    readFileSync(__dirname + '/vectors/wallet-native-request.json', 'utf8')
  );
  expect(actual).toEqual(expected);
});
