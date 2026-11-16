import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { z } from 'zod';

import { persistAndRestore } from './cache-persistence.vectors-driver';

const recorded = z
  .object({ written: z.string(), loaded: z.unknown() })
  .parse(JSON.parse(readFileSync(__dirname + '/vectors/cache-persistence.json', 'utf8')));

test('loads fixed persisted transaction, Clarity, bigint, Money and PoX byte values', async () => {
  const tx =
    '80800000000400fc7250a211deddc70ee5a2738de5f07817351cef00200000000000010000000000000141000095bbc94fe2da3984b423a94e28e5a8c5c1be262b6949c9b9f9a24264ad930f9a793a154c3932c5079f346ffde11f0d769fbaf6f7fa625aa7c52e24cb42420a0d03020000000000051a00000000000000000000000000000000000000000020000000000001f09f8c9f000000000000000000000000000000000000000000000000000000000000';
  expect(
    await persistAndRestore(recorded.written, tx, '01ffffffffffffffffffffffffffffffff')
  ).toEqual(recorded);
});
