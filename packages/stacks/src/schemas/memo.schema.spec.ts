import { readFileSync as readStacksVectorFileSync } from 'node:fs';

import * as memoContractVectorDriver from './memo-contract.vectors-driver';
import { stacksMemoSchema } from './memo.schema';

describe('stacksMemoSchema', () => {
  it('should pass for valid memo strings (<= 34 bytes)', () => {
    expect(() => stacksMemoSchema.parse('short memo')).not.toThrow();
    expect(() => stacksMemoSchema.parse('a'.repeat(34))).not.toThrow();
  });

  it('should fail for memo strings > 34 bytes', () => {
    expect(() => stacksMemoSchema.parse('a'.repeat(35))).toThrow('Invalid memo string');
    expect(() =>
      stacksMemoSchema.parse('This memo is definitely longer than thirty-four bytes!')
    ).toThrow('Invalid memo string');
  });
});

describe('Stacks migration vectors: memo-contract', () => {
  const expected: unknown = JSON.parse(
    readStacksVectorFileSync(__dirname + '/vectors/memo-contract.json', 'utf8')
  );

  test('pins memo byte limits for ASCII and Unicode', () => {
    const results = [
      '',
      'a'.repeat(34),
      'a'.repeat(35),
      '🌟'.repeat(8) + 'ab',
      '🌟'.repeat(8) + 'abc',
      'é'.repeat(17),
      'é'.repeat(18),
    ].map(memoContractVectorDriver.memo);
    const actual: unknown = JSON.parse(
      JSON.stringify(results, (_, value: unknown) =>
        typeof value === 'bigint' ? value.toString() : value
      )
    );
    expect(actual).toEqual(expected);
  });
});
