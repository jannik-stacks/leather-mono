import { Cl, Pc, type Transaction } from '@jannik-stacks/kit';

import { getVerifiedSip10TransferDetails } from './sip-10-contract-call.utils';

const sender = 'ST1EXHZSN8MJSJ9DSG994G1V8CNKYXGMK7Z4SA6DH';
const recipient = 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG';
const contractAddress = 'ST1F7QA2MDF17S807EPA36TSS8AMEFY4KA9TVGWXT';
const contractName = 'sbtc-token';
const contractId = `${contractAddress}.${contractName}`;
const assetName = 'sbtc-token';
const amount = 2_500_000;

type ContractCallOptions = Extract<Transaction, { type: 'call' }>;

function makeTransferTx(overrides: Partial<ContractCallOptions> = {}) {
  return {
    type: 'call',
    contract: contractId,
    functionName: 'transfer',
    args: [Cl.uint(amount), Cl.principal(sender), Cl.principal(recipient), Cl.none()],
    fee: 300n,
    nonce: 0n,
    network: 'testnet',
    postConditionMode: 'deny',
    postConditions: [Pc.principal(sender).willSendEq(amount).ft(`${contractId}::${assetName}`)],
    ...overrides,
  } satisfies Transaction;
}

describe(getVerifiedSip10TransferDetails.name, () => {
  test('extracts details from a compliant transfer', () => {
    const tx = makeTransferTx();

    expect(getVerifiedSip10TransferDetails(tx)).toEqual({
      contractId,
      assetName,
      amount: 2_500_000n,
      sender,
      recipient,
      memo: undefined,
    });
  });

  test('decodes an attached utf8 memo', () => {
    const tx = makeTransferTx({
      args: [
        Cl.uint(amount),
        Cl.principal(sender),
        Cl.principal(recipient),
        Cl.some(Cl.buffer(new TextEncoder().encode('invoice 42'))),
      ],
    });

    expect(getVerifiedSip10TransferDetails(tx)?.memo).toEqual('invoice 42');
  });

  test('rejects a transfer without post conditions', () => {
    const tx = makeTransferTx({ postConditions: [] });

    expect(getVerifiedSip10TransferDetails(tx)).toBeNull();
  });

  test('rejects a transfer in allow mode', () => {
    const tx = makeTransferTx({ postConditionMode: 'allow' });

    expect(getVerifiedSip10TransferDetails(tx)).toBeNull();
  });

  test('rejects a post condition that is not an exact-amount condition', () => {
    const tx = makeTransferTx({
      postConditions: [Pc.principal(sender).willSendGte(amount).ft(`${contractId}::${assetName}`)],
    });

    expect(getVerifiedSip10TransferDetails(tx)).toBeNull();
  });

  test('rejects a single post condition that does not guard a fungible token', () => {
    const tx = makeTransferTx({
      postConditions: [Pc.principal(sender).willSendEq(amount).ustx()],
    });

    expect(getVerifiedSip10TransferDetails(tx)).toBeNull();
  });

  test('rejects a post condition amount that differs from the transfer amount', () => {
    const tx = makeTransferTx({
      postConditions: [Pc.principal(sender).willSendEq(999).ft(`${contractId}::${assetName}`)],
    });

    expect(getVerifiedSip10TransferDetails(tx)).toBeNull();
  });

  test('rejects a post condition guarding a different contract', () => {
    const tx = makeTransferTx({
      postConditions: [
        Pc.principal(sender)
          .willSendEq(amount)
          .ft(`${`${contractAddress}.other-token`}::${assetName}`),
      ],
    });

    expect(getVerifiedSip10TransferDetails(tx)).toBeNull();
  });

  test('rejects a post condition guarding a principal other than the sender', () => {
    const tx = makeTransferTx({
      postConditions: [
        Pc.principal(recipient).willSendEq(amount).ft(`${contractId}::${assetName}`),
      ],
    });

    expect(getVerifiedSip10TransferDetails(tx)).toBeNull();
  });

  test('rejects a transfer carrying more than one post condition', () => {
    const tx = makeTransferTx({
      postConditions: [
        Pc.principal(sender).willSendEq(amount).ft(`${contractId}::${assetName}`),
        Pc.principal(sender).willSendEq(1).ustx(),
      ],
    });

    expect(getVerifiedSip10TransferDetails(tx)).toBeNull();
  });

  test('rejects a call that does not match the sip10 transfer shape', () => {
    const tx = makeTransferTx({
      args: [Cl.bool(true), Cl.principal(sender), Cl.principal(recipient)],
    });

    expect(getVerifiedSip10TransferDetails(tx)).toBeNull();
  });
});
