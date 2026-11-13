import React from 'react';

import { readFileSync } from 'node:fs';
import { expect, test, vi } from 'vitest';

import { messageReply, transactionReply } from './replies.vectors-driver';

const expected: unknown = JSON.parse(readFileSync(__dirname + '/vectors/replies.json', 'utf8'));

test('pins signed transaction and both stx_signMessage RPC reply formats', async () => {
  const hex =
    '80800000000400fc7250a211deddc70ee5a2738de5f07817351cef0020000000000001000000000000014100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000003020000000000051a00000000000000000000000000000000000000000020000000000001f09f8c9f000000000000000000000000000000000000000000000000000000000000';
  const actual = {
    transaction: await transactionReply(hex, false),
    prefixedLegacy: await transactionReply('0x' + hex, true),
    plain: await messageReply('Hello, 🌟'),
    structured: await messageReply(
      '010000000000000000000000000000002a',
      '0c0000000308636861696e2d69640100000000000000000000000000000001046e616d650d0000001c6c6561746865722e696f2f6d756c74697369672d70726f706f73616c0776657273696f6e0d0000000131'
    ),
  };
  expect(actual).toEqual(expected);
});

vi.stubGlobal('React', React);
