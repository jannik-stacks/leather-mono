import { hexToBytes } from '@stacks/common';
import { deserializeTransaction } from '@stacks/transactions';
import { readFileSync as readStacksVectorFileSync } from 'node:fs';

import * as nonceContractVectorDriver from './nonce-contract.vectors-driver';
import { substituteStxNonce } from './substitute-stx-nonce';

// A real proposed stx:mainnet 2-of-3 multisig STX transfer (StandardAuth,
// P2SHNonSequential), placeholder nonce 0.
const realPayload =
  '00000000010405bf753763204843631823bc99674208cdc5a8734600000000000000000000000000000308000000000002030200000000000516f4b1aa40ed3e9c9990f099736006887e66cae1cc00000000003d090000000000000000000000000000000000000000000000000000000000000000000000';

// Nonce field sits at offset 27 (7 + 20-byte P2SH signer hash), 8 bytes long.
const nonceStart = 27;
const nonceEnd = 35;

describe(substituteStxNonce.name, () => {
  test('matches deserialize/setNonce/reserialize for a real P2SHNonSequential tx', () => {
    const nonce = 42;
    const tx = deserializeTransaction(realPayload);
    tx.setNonce(nonce);
    expect(substituteStxNonce({ rawPayload: realPayload, nonce })).toEqual(tx.serialize());
  });

  test('is a no-op when substituting the existing nonce', () => {
    expect(substituteStxNonce({ rawPayload: realPayload, nonce: 0 })).toEqual(realPayload);
  });

  test('overwrites only the 8-byte nonce field at the computed offset', () => {
    const before = hexToBytes(realPayload);
    const after = hexToBytes(substituteStxNonce({ rawPayload: realPayload, nonce: 123456 }));

    for (let i = 0; i < before.length; i++) {
      if (i >= nonceStart && i < nonceEnd) continue;
      expect(after[i]).toEqual(before[i]);
    }
    // 123456 === 0x0001e240, big-endian over 8 bytes.
    expect([...after.slice(nonceStart, nonceEnd)]).toEqual([0, 0, 0, 0, 0, 1, 0xe2, 0x40]);
  });

  test('rejects an unexpected hash mode', () => {
    const tampered = `${realPayload.slice(0, 12)}00${realPayload.slice(14)}`;
    expect(() => substituteStxNonce({ rawPayload: tampered, nonce: 1 })).toThrow('hash mode');
  });

  test('rejects sponsored auth', () => {
    const tampered = `${realPayload.slice(0, 10)}05${realPayload.slice(12)}`;
    expect(() => substituteStxNonce({ rawPayload: tampered, nonce: 1 })).toThrow('auth type');
  });
});

describe('Stacks migration vectors: nonce-contract', () => {
  const expected: unknown = JSON.parse(
    readStacksVectorFileSync(__dirname + '/vectors/nonce-contract.json', 'utf8')
  );

  test('pins nonce substitution and malformed multisig rejection', () => {
    const hex =
      '00000000010405bf753763204843631823bc99674208cdc5a8734600000000000000000000000000000308000000000002030200000000000516f4b1aa40ed3e9c9990f099736006887e66cae1cc00000000003d090000000000000000000000000000000000000000000000000000000000000000000000';
    const results = {
      nonces: [0, 42, 123456, 9007199254740991].map(nonce =>
        nonceContractVectorDriver.nonce(hex, nonce)
      ),
      badAuth: nonceContractVectorDriver.nonce('00000000010505' + hex.slice(14), 1),
      badHash: nonceContractVectorDriver.nonce('00000000010400' + hex.slice(14), 1),
      short: nonceContractVectorDriver.nonce('00000000010405', 1),
      unsigned: nonceContractVectorDriver.signature(hex),
    };
    const actual: unknown = JSON.parse(
      JSON.stringify(results, (_, value: unknown) =>
        typeof value === 'bigint' ? value.toString() : value
      )
    );
    expect(actual).toEqual(expected);
  });
});
