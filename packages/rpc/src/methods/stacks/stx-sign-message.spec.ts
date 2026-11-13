import { readFileSync as readStacksVectorFileSync } from 'node:fs';

import * as browserRequestContractVectorDriver from './browser-request-contract.vectors-driver';
import { stxSignMessage } from './stx-sign-message';

describe('`stx_signMessage` schema', () => {
  test('that it defaults to utf8', () => {
    const result = stxSignMessage.params.safeParse({
      message: 'hello world',
    });
    expect(result.success).toBe(true);
  });

  test('that it accepts utf8 as messageType', () => {
    const result = stxSignMessage.params.safeParse({
      message: 'hello world',
      messageType: 'utf8',
    });
    expect(result.success).toBe(true);
  });

  test('that it accepts structuctured as messageType', () => {
    const result = stxSignMessage.params.safeParse({
      message: 'hello world',
      domain: 'deadbeef',
      messageType: 'structured',
    });
    expect(result.success).toBe(true);
  });
});

describe('Stacks migration vectors: browser-request-contract', () => {
  const expected: unknown = JSON.parse(
    readStacksVectorFileSync(__dirname + '/vectors/browser-request-contract.json', 'utf8')
  );

  test('pins browser request defaults, validation and transaction results', () => {
    const results = {
      messages: [
        { message: 'hello' },
        { messageType: 'structured', message: '01', domain: '02', network: 'custom' },
        { messageType: 'structured', message: '01' },
      ].map(input => browserRequestContractVectorDriver.request('message', input)),
      transfers: [
        {
          recipient: 'ST000000000000000000002AMW42H',
          amount: '1000',
          nonce: 0,
          fee: 0,
          sponsored: true,
        },
        { recipient: 'bad', amount: 1.5 },
        { recipient: 'ST000000000000000000002AMW42H', amount: 100, memo: '🌟'.repeat(9) },
      ].map(input => browserRequestContractVectorDriver.request('transfer', input)),
      calls: browserRequestContractVectorDriver.request('call', {
        contract: 'ST000000000000000000002AMW42H.token',
        functionName: 'transfer',
        functionArgs: ['01'],
        postConditionMode: 'originator',
        postConditions: [],
        sponsored: true,
      }),
      deploy: browserRequestContractVectorDriver.request('deploy', {
        name: 'hello',
        clarityCode: '(define-public (hello) (ok u1))',
      }),
      account: browserRequestContractVectorDriver.request('add', {
        publicKeys: [
          '031b84c5567b126440995d3ed5aaba0565d71e1834604819ff9c17f5e9d5dd078f',
          '024d4b6cd1361032ca9bd2aeb9d900aa4d45d9ead80ac9423374c451a7254d0766',
        ],
        threshold: 2,
      }),
      results: [{ txid: 'abc', transaction: 'deadbeef' }, { txid: 'abc' }, {}].map(
        browserRequestContractVectorDriver.result
      ),
    };
    const actual: unknown = JSON.parse(
      JSON.stringify(results, (_, value: unknown) =>
        typeof value === 'bigint' ? value.toString() : value
      )
    );
    expect(actual).toEqual(expected);
  });
});
