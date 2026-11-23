import { Codec } from '@jannik-stacks/kit';
import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { z } from 'zod';

import { stxSignTransaction } from '@leather.io/rpc';

import { checkUnsignedStacksTransactionHashMode } from '@app/pages/rpc-stx-sign-transaction/rpc-stx-sign-transaction.utils';

import { approve, messageReply, signReply } from './replies.vectors-driver';

const transactions = z
  .object({
    stx: z.object({ unsigned: z.string() }),
    sponsored: z.object({ unsigned: z.string() }),
    multisig: z.array(z.object({ unsigned: z.string() })),
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

const multisigVector = transactions.multisig[2];
if (!multisigVector) throw new Error('Missing non-sequential multisig vector');
const multisigTx = Codec.Transaction.decode(multisigVector.unsigned);

test('recognizes decoded non-sequential multisig transactions without an explicit hash mode', () => {
  expect(multisigTx.signer?.hashMode).toBeUndefined();
  expect(multisigTx.signaturesRequired).toBe(1);
  expect(checkUnsignedStacksTransactionHashMode(multisigTx)).toBe(true);
  expect(
    checkUnsignedStacksTransactionHashMode(Codec.Transaction.decode(transactions.stx.unsigned))
  ).toBe(false);
});

test.each([false, true])(
  'preserves multisig fee and nonce on RPC approval (legacy: %s)',
  async legacy => {
    const tx = { ...multisigTx, fee: 12345n };
    const replies = await signReply(Codec.Transaction.encode(tx), legacy);
    const response = z.object({ result: stxSignTransaction.result }).parse(replies[0]?.[1]);
    const signed = Codec.Transaction.decode(response.result.transaction);
    expect(response.result.txHex).toBe(response.result.transaction);
    expect(signed.signaturesRequired).toBe(tx.signaturesRequired);
    expect(signed.fee).toBe(12345n);
    expect(signed.nonce).toBe(9007199254740993n);
  }
);

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
