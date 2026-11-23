import { readFileSync as readStacksVectorFileSync } from 'node:fs';

import { filterKeychainsByStacksAccount } from './keychain.utils';
import * as stacksStateContractVectorDriver from './stacks-state-contract.vectors-driver';

const stacksStandardKeychains = [
  { descriptor: `[24682ead/44'/5757'/0'/0/0]025b2c58`, chain: 'stacks' },
  { descriptor: `[24682ead/44'/5757'/0'/0/1]03a1b2c3`, chain: 'stacks' },
  { descriptor: `[24682ead/44'/5757'/0'/0/2]03d4e5f6`, chain: 'stacks' },
];

const ledgerLiveKeychains = [
  { descriptor: `[24682ead/44'/5757'/0'/0/0]025b2c58`, chain: 'stacks' },
  { descriptor: `[24682ead/44'/5757'/1'/0/0]03a1b2c3`, chain: 'stacks' },
  { descriptor: `[24682ead/44'/5757'/2'/0/0]03d4e5f6`, chain: 'stacks' },
];

describe(filterKeychainsByStacksAccount.name, () => {
  test('that it matches stacks standard keychains by address index', () => {
    const matches = stacksStandardKeychains.filter(filterKeychainsByStacksAccount(1));
    expect(matches).toHaveLength(1);
    expect(matches[0].descriptor).toEqual(`[24682ead/44'/5757'/0'/0/1]03a1b2c3`);
  });

  test('that it matches ledger live keychains by hardened account level', () => {
    const matches = ledgerLiveKeychains.filter(filterKeychainsByStacksAccount(2));
    expect(matches).toHaveLength(1);
    expect(matches[0].descriptor).toEqual(`[24682ead/44'/5757'/2'/0/0]03d4e5f6`);
  });

  test('that account zero matches under both schemes', () => {
    expect(stacksStandardKeychains.filter(filterKeychainsByStacksAccount(0))).toHaveLength(1);
    expect(ledgerLiveKeychains.filter(filterKeychainsByStacksAccount(0))).toHaveLength(1);
  });
});

describe('Stacks migration vectors: stacks-state-contract', () => {
  const expected: unknown = JSON.parse(
    readStacksVectorFileSync(__dirname + '/vectors/stacks-state-contract.json', 'utf8')
  );

  test('pins persisted Leather and Ledger descriptor account selection', () => {
    const descriptors = [
      "[24682ead/44'/5757'/0'/0/0]025b2c58cbf22ad02e1a53041189ace847192834e0664cab4ed1a39676e8a8ddf8",
      "[24682ead/44'/5757'/0'/0/2]025b2c58cbf22ad02e1a53041189ace847192834e0664cab4ed1a39676e8a8ddf8",
      "[24682ead/44'/5757'/2'/0/0]025b2c58cbf22ad02e1a53041189ace847192834e0664cab4ed1a39676e8a8ddf8",
    ];
    const results = [0, 1, 2].map(index =>
      stacksStateContractVectorDriver.select(descriptors, '24682ead', index)
    );
    const actual: unknown = JSON.parse(
      JSON.stringify(results, (_, value: unknown) =>
        typeof value === 'bigint' ? value.toString() : value
      )
    );
    expect(actual).toEqual(expected);
  });
});
