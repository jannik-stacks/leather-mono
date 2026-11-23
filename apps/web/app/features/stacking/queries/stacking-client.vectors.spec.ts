import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

import { queryOutputs } from './stacking-client.vectors-driver';

const expected: unknown = JSON.parse(
  readFileSync(__dirname + '/vectors/stacking-client.json', 'utf8')
);

test('pins StackingClient API results, request bytes and persisted cache keys', async () => {
  const responses = {
    '/v2/pox': {
      contract_id: 'ST000000000000000000002AMW42H.pox-4',
      reward_cycle_length: 2100,
      first_burnchain_block_height: 100,
      current_burnchain_block_height: 250,
      contract_versions: [
        {
          contract_id: 'ST000000000000000000002AMW42H.pox-4',
          activation_burnchain_block_height: 100,
        },
      ],
    },
    '/v2/info': { burn_block_height: 250, stacks_tip_height: 42 },
    '/extended/v1/info/network_block_times': {
      mainnet: { target_block_time: 600 },
      testnet: { target_block_time: 120 },
    },
    '/v2/accounts/ST000000000000000000002AMW42H': {
      balance: '9007199254740993',
      locked: '100',
      unlock_height: 999,
    },
    '/extended/v1/address/ST000000000000000000002AMW42H/balances': {
      stx: {
        balance: '9007199254740993',
        total_sent: '2',
        total_received: '9007199254740995',
        locked: '100',
      },
      fungible_tokens: {},
      non_fungible_tokens: {},
    },
  };
  const results = {
    mainnet: await queryOutputs('mainnet', responses, '09'),
    testnet: await queryOutputs('testnet', responses, '09'),
    stacked: await queryOutputs(
      'testnet',
      responses,
      '0a0c000000031266697273742d7265776172642d6379636c6501000000000000000000000000000000640b6c6f636b2d706572696f64010000000000000000000000000000000608706f782d616464720c0000000209686173686279746573020000001407070707070707070707070707070707070707070776657273696f6e020000000100'
    ),
    malformed: await queryOutputs('testnet', responses, '03'),
  };
  const actual: unknown = JSON.parse(
    JSON.stringify(results, (_, value: unknown) => {
      if (value instanceof Uint8Array) return Buffer.from(value).toString('hex');
      return typeof value === 'bigint' ? value.toString() : value;
    })
  );
  expect(actual).toEqual(expected);
});
