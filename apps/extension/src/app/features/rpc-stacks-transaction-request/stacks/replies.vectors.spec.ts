import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { z } from 'zod';

import { approve, messageReply, signReply } from './replies.vectors-driver';

const transactions = z
  .object({
    stx: z.object({ unsigned: z.string() }),
    sponsored: z.object({ unsigned: z.string() }),
  })
  .parse(
    JSON.parse(
      readFileSync(
        __dirname +
          '/../../../../../../../packages/stacks/src/transactions/vectors/transaction-contract.json',
        'utf8'
      )
    )
  );
const expected: unknown = JSON.parse(readFileSync(__dirname + '/vectors/replies.json', 'utf8'));

test('pins broadcast and sponsored dapp reply bytes through the real SDK transport', async () => {
  const body = '"0000000000000000000000000000000000000000000000000000000000000000"';
  const actual = {
    signed: await signReply(transactions.stx.unsigned, false),
    signedPrefixedLegacy: await signReply('0x' + transactions.stx.unsigned, true),
    plainMessage: await messageReply('Hello, 🌟'),
    structuredMessage: await messageReply(
      '010000000000000000000000000000002a',
      '0c0000000308636861696e2d69640100000000000000000000000000000001046e616d650d0000001c6c6561746865722e696f2f6d756c74697369672d70726f706f73616c0776657273696f6e0d0000000131'
    ),
    broadcast: await approve(transactions.stx.unsigned, 200, body),
    sponsoredRejected: await approve(
      transactions.sponsored.unsigned,
      400,
      '{"error":"transaction rejected","reason":"BadSponsorSignature"}'
    ),
    sponsoredAccepted: await approve(transactions.sponsored.unsigned, 200, body),
  };
  expect(actual).toEqual(expected);
});
