import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

import { resolveNonce } from './nonce-resolution.vectors-driver';

const expected: unknown = JSON.parse(
  readFileSync(__dirname + '/vectors/nonce-resolution.json', 'utf8')
);

test('pins nonce API selection, fallback, precision, explicit values and rejection', async () => {
  const actual = {
    extended: await resolveNonce({ possible_next_nonce: '9007199254740993' }, { nonce: 7 }, 200),
    fallback: await resolveNonce({}, { nonce: 7 }, 200),
    zero: await resolveNonce({ possible_next_nonce: 8 }, { nonce: 7 }, 200, 0),
    explicit: await resolveNonce({}, {}, 500, 3),
    rejected: await resolveNonce({}, { error: 'offline fixture' }, 500),
  };
  expect(actual).toEqual(expected);
});
