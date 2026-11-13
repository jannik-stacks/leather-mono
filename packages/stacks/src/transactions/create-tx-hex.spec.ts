import { hexToBytes } from '@stacks/common';
import { STACKS_TESTNET } from '@stacks/network';
import { AuthType, deserializeTransaction } from '@stacks/transactions';
import BigNumber from 'bignumber.js';
import { readFileSync as readStacksVectorFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { createMoney } from '@leather.io/utils';

import * as contractArgumentsVectorDriver from './contract-arguments.vectors-driver';
import { createTransferSip10TxHex } from './create-tx-hex';
import * as sip10TransferContractVectorDriver from './sip10-transfer-contract.vectors-driver';

const signer = {
  address: 'SP2BM6AQSMQ04CX8KDE62QBFVZTDZ2ZX80GZJSBZ4',
  publicKey: hexToBytes('8721c6a5237f5e8d361161a7855aa56885a3e19e2ea6ee268fb14eabc5e2ed9001'),
};

const transfer = {
  signer,
  assetId: 'SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token::sbtc-token',
  recipient: 'SP1TFTBQZANNVWABSFDRM0YWPJQDP27WZ8SR0NE3S',
  amount: 1000,
  nonce: 1,
};

describe(createTransferSip10TxHex.name, () => {
  it('builds a standard transaction by default', async () => {
    const txHex = await createTransferSip10TxHex({
      ...transfer,
      fee: createMoney(new BigNumber(3000), 'STX'),
    });

    const tx = deserializeTransaction(txHex);
    expect(tx.auth.authType).toEqual(AuthType.Standard);
    expect(tx.auth.spendingCondition.fee).toBe(BigInt('3000'));
  });

  it('builds a sponsored transaction with a zero origin fee when sponsored', async () => {
    const txHex = await createTransferSip10TxHex({
      ...transfer,
      fee: createMoney(new BigNumber(0), 'STX'),
      sponsored: true,
    });

    const tx = deserializeTransaction(txHex);
    expect(tx.auth.authType).toEqual(AuthType.Sponsored);
    expect(tx.auth.spendingCondition.fee).toBe(BigInt('0'));
  });
});

describe('Stacks migration vectors: contract-arguments', () => {
  const expected: unknown = JSON.parse(
    readStacksVectorFileSync(__dirname + '/vectors/contract-arguments.json', 'utf8')
  );

  test('pins Clarity bytes, JSON, nested values, integer bounds and malformed inputs', () => {
    const senderStacksAddress = 'ST000000000000000000002AMW42H';
    const recipientStacksAddress = 'SP000000000000000000002Q6VF78';
    const results = {
      sip10: [undefined, '', 'hello', '🌟'].map(memo =>
        contractArgumentsVectorDriver.sip10({
          amount: '340282366920938463463374607431768211455',
          senderStacksAddress,
          recipientStacksAddress,
          memo,
        })
      ),
      sip9: contractArgumentsVectorDriver.sip9({
        assetId: '0c0000000201610a010000000000000001000000000000000001620b000000020309',
        senderStacksAddress,
        recipientStacksAddress,
      }),
      decoded: [
        '00ffffffffffffffffffffffffffffffff',
        '0100000000000000010000000000000000',
        '0a07010000000000000000000000000000002a',
        '080d00000003626164',
        '0e00000004f09f8c9f',
        '020000000300ff01',
        '09',
        '03',
        '04',
        'ff',
        '01',
        '0c000000010161',
        'not-hex',
      ].map(contractArgumentsVectorDriver.decode),
    };
    const actual: unknown = JSON.parse(
      JSON.stringify(results, (_, value: unknown) =>
        typeof value === 'bigint' ? value.toString() : value
      )
    );
    expect(actual).toEqual(expected);
  });
});

describe('Stacks migration vectors: sip10-transfer-contract', () => {
  const expected: unknown = JSON.parse(
    readStacksVectorFileSync(__dirname + '/vectors/sip10-transfer-contract.json', 'utf8')
  );

  test('pins the SIP-10 production builder and rejects unbounded transfers', async () => {
    const base = {
      publicKey: '029dbc41eec542d022f8650466e8de5b4fd451c5a94f3847e372f080c4700b92ec',
      address: 'ST000000000000000000002AMW42H',
      assetId: 'ST000000000000000000002AMW42H.token::coin',
      recipient: 'SP000000000000000000002Q6VF78',
      amount: 123456789,
      nonce: 42,
      fee: 321,
    };
    const results = [
      await sip10TransferContractVectorDriver.transfer(base),
      await sip10TransferContractVectorDriver.transfer({ ...base, memo: '🌟' }),
      await sip10TransferContractVectorDriver.transfer({ ...base, sponsored: true, fee: 0 }),
      await sip10TransferContractVectorDriver.transfer({ ...base, network: STACKS_TESTNET }),
    ];
    const actual: unknown = JSON.parse(
      JSON.stringify(results, (_, value: unknown) =>
        typeof value === 'bigint' ? value.toString() : value
      )
    );
    expect(actual).toEqual(expected);
  });
});
