import { Codec, type PostCondition } from '@jannik-stacks/kit';
import BigNumber from 'bignumber.js';
import { readFileSync as readStacksVectorFileSync } from 'node:fs';
import { assert, describe, expect, it } from 'vitest';

import { createMoney } from '@leather.io/utils';

import { formatAssetString } from '../stacks.utils';
import { generateStacksUnsignedTransaction, initNonce } from './generate-unsigned-transaction';
import * as transactionContractVectorDriver from './transaction-contract.vectors-driver';
import {
  type StacksUnsignedContractCallOptions,
  type StacksUnsignedContractDeployOptions,
  type StacksUnsignedTokenTransferOptions,
  TransactionTypes,
} from './transaction.types';

const testPublicKey = '0250863ad64a87ae8a2fe83c1af1a8403cb53f53e486d8511dad8a04887e5b2352';

describe('initNonce', () => {
  it('should initialize nonce as BigNumber', () => {
    const nonce = '123';
    const result = initNonce(nonce);
    expect(result).toBeInstanceOf(BigNumber);
    expect(result.toString()).toBe('123');
  });
});

describe('generateStacksUnsignedTransaction', () => {
  it('should generate unsigned contract call', async () => {
    const options: StacksUnsignedContractCallOptions = {
      txType: TransactionTypes.ContractCall,
      contractAddress: 'ST1EXHZSN8MJSJ9DSG994G1V8CNKYXGMK7Z4SA6DH',
      contractName: 'hello-world',
      functionName: 'print',
      fee: createMoney(new BigNumber(1000), 'STX'),
      functionArgs: [],
      nonce: '1',
      postConditions: [],
      publicKey: testPublicKey,
    };

    const result = await generateStacksUnsignedTransaction(options);
    expect(result).toBeDefined();
    expect(result).toMatchObject({ type: 'call', fee: 1000n, nonce: 1n });
    expect(result.type).toEqual('call');
    expect(result.fee).toBe(BigInt('1000'));
    expect(result.nonce).toBe(BigInt('1'));
  });

  it('should keep the post condition mode and encode post conditions of a contract call', async () => {
    const postCondition: Extract<PostCondition, { type: 'ft-postcondition' }> = {
      type: 'ft-postcondition',
      address: 'ST1EXHZSN8MJSJ9DSG994G1V8CNKYXGMK7Z4SA6DH',
      condition: 'gte',
      amount: BigInt('100'),
      asset: formatAssetString({
        contractAddress: 'ST34RKEJKQES7MXQFBT29KSJZD73QK3YNT5N56C6X',
        contractName: 'test-asset-contract',
        assetName: 'test-asset-name',
      }),
    };
    const options: StacksUnsignedContractCallOptions = {
      txType: TransactionTypes.ContractCall,
      contractAddress: 'ST1EXHZSN8MJSJ9DSG994G1V8CNKYXGMK7Z4SA6DH',
      contractName: 'hello-world',
      functionName: 'print',
      fee: createMoney(new BigNumber(0), 'STX'),
      functionArgs: [],
      nonce: 0,
      postConditionMode: 'allow',
      postConditions: [postCondition],
      publicKey: testPublicKey,
    };

    const result = await generateStacksUnsignedTransaction(options);
    expect(result.postConditionMode).toEqual('allow');
    const postConditionValue = (result.postConditions ?? [])[0];
    expect('amount' in postConditionValue && postConditionValue.amount).toEqual(100n);
  });

  it('should generate unsigned contract deploy', async () => {
    const options: StacksUnsignedContractDeployOptions = {
      txType: TransactionTypes.ContractDeploy,
      codeBody: 'code',
      contractName: 'hello-world',
      fee: createMoney(new BigNumber(1000), 'STX'),
      nonce: '1',
      publicKey: testPublicKey,
    };

    const result = await generateStacksUnsignedTransaction(options);
    expect(result).toBeDefined();
    expect(result.type).toEqual('deploy');
    expect(result.fee).toBe(BigInt('1000'));
    expect(result.nonce).toBe(BigInt('1'));
  });

  it('should generate a versioned contract deploy when a released clarity version is specified', async () => {
    const options: StacksUnsignedContractDeployOptions = {
      txType: TransactionTypes.ContractDeploy,
      clarityVersion: 2,
      codeBody: 'code',
      contractName: 'hello-world',
      fee: createMoney(new BigNumber(1000), 'STX'),
      nonce: '1',
      publicKey: testPublicKey,
    };

    const result = await generateStacksUnsignedTransaction(options);
    if (result.type !== 'deploy') throw new Error('Expected versioned smart contract payload');
    expect(result.clarityVersion).toEqual(2);
    expect(result.name).toEqual('hello-world');
    expect(result.code).toEqual('code');
  });

  it('should omit the clarity version when Clarity 6 is specified', async () => {
    const options: StacksUnsignedContractDeployOptions = {
      txType: TransactionTypes.ContractDeploy,
      clarityVersion: 6,
      codeBody: 'code',
      contractName: 'hello-world',
      fee: createMoney(new BigNumber(1000), 'STX'),
      nonce: '1',
      publicKey: testPublicKey,
    };

    const result = await generateStacksUnsignedTransaction(options);
    const roundTripped = Codec.Transaction.decode(Codec.Transaction.encode(result));
    if (roundTripped.type !== 'deploy') throw new Error('Expected smart contract payload');
    expect('clarityVersion' in roundTripped).toEqual(false);
    expect(roundTripped.name).toEqual('hello-world');
    expect(roundTripped.code).toEqual('code');
  });

  it('should generate unsigned STX token transfer', async () => {
    const options: StacksUnsignedTokenTransferOptions = {
      txType: TransactionTypes.StxTokenTransfer,
      fee: createMoney(new BigNumber(1000), 'STX'),
      nonce: '1',
      recipient: 'ST1EXHZSN8MJSJ9DSG994G1V8CNKYXGMK7Z4SA6DH',
      amount: createMoney(new BigNumber(100), 'STX'),
      publicKey: testPublicKey,
    };

    const result = await generateStacksUnsignedTransaction(options);
    expect(result).toBeDefined();
    expect(result.type).toEqual('transfer');
    expect(result.fee).toBe(BigInt('1000'));
    expect(result.nonce).toBe(BigInt('1'));
    assert(result.type === 'transfer');
    expect(result.recipient).toBe('ST1EXHZSN8MJSJ9DSG994G1V8CNKYXGMK7Z4SA6DH');
    expect(result.amount).toBe(BigInt('100'));
  });

  it('should generate a sponsored STX token transfer with sponsored auth', async () => {
    const options: StacksUnsignedTokenTransferOptions = {
      txType: TransactionTypes.StxTokenTransfer,
      fee: createMoney(new BigNumber(0), 'STX'),
      nonce: '1',
      recipient: 'ST1EXHZSN8MJSJ9DSG994G1V8CNKYXGMK7Z4SA6DH',
      amount: createMoney(new BigNumber(100), 'STX'),
      publicKey: testPublicKey,
      sponsored: true,
    };

    const result = await generateStacksUnsignedTransaction(options);
    expect(result.sponsor === undefined ? 'standard' : 'sponsored').toEqual('sponsored');
    expect(result.fee).toBe(BigInt('0'));
  });

  it('should generate a sponsored contract call with sponsored auth', async () => {
    const options: StacksUnsignedContractCallOptions = {
      txType: TransactionTypes.ContractCall,
      contractAddress: 'ST1EXHZSN8MJSJ9DSG994G1V8CNKYXGMK7Z4SA6DH',
      contractName: 'hello-world',
      functionName: 'print',
      fee: createMoney(new BigNumber(0), 'STX'),
      functionArgs: [],
      nonce: '1',
      postConditions: [],
      publicKey: testPublicKey,
      sponsored: true,
    };

    const result = await generateStacksUnsignedTransaction(options);
    expect(result.sponsor === undefined ? 'standard' : 'sponsored').toEqual('sponsored');
    expect(result.fee).toBe(BigInt('0'));
  });
});

describe('Stacks migration vectors: transaction-contract', () => {
  const expected: unknown = JSON.parse(
    readStacksVectorFileSync(__dirname + '/vectors/transaction-contract.json', 'utf8')
  );

  test('pins unsigned and signed transactions, identifiers, sizing, nonces and Clarity defaults', async () => {
    const base = {
      privateKeys: ['111111111111111111111111111111111111111111111111111111111111111101'],
      recipient: 'ST000000000000000000002AMW42H',
      amount: '9007199254740993',
      fee: '321',
      nonce: '9007199254740993',
      network: 'testnet',
    } satisfies Omit<Parameters<typeof transactionContractVectorDriver.transaction>[0], 'kind'>;
    const results = {
      stx: await transactionContractVectorDriver.transaction({ ...base, kind: 'stx', memo: '🌟' }),
      mainnet: await transactionContractVectorDriver.transaction({
        ...base,
        kind: 'stx',
        network: 'mainnet',
        nonce: 0,
      }),
      custom: await transactionContractVectorDriver.transaction({
        ...base,
        kind: 'stx',
        network: 256,
        nonce: 42,
      }),
      sponsored: await transactionContractVectorDriver.transaction({
        ...base,
        kind: 'stx',
        fee: '0',
        sponsored: true,
      }),
      sip10: await transactionContractVectorDriver.transaction({
        ...base,
        kind: 'sip10',
        memo: 'hello',
        mode: 'deny',
      }),
      sip9: await transactionContractVectorDriver.transaction({
        ...base,
        kind: 'sip9',
        mode: 'allow',
      }),
      call: await transactionContractVectorDriver.transaction({
        ...base,
        kind: 'call',
        mode: 'originator',
      }),
      defaultDeploy: await transactionContractVectorDriver.transaction({ ...base, kind: 'deploy' }),
      clarity2: await transactionContractVectorDriver.transaction({
        ...base,
        kind: 'deploy',
        clarityVersion: 2,
      }),
      clarity6: await transactionContractVectorDriver.transaction({
        ...base,
        kind: 'deploy',
        clarityVersion: 6,
      }),
      multisig: await Promise.all(
        [false, true].flatMap(nonSequential =>
          [1, 2].map(threshold =>
            transactionContractVectorDriver.transaction({
              ...base,
              kind: 'stx',
              privateKeys: [
                ...base.privateKeys,
                '222222222222222222222222222222222222222222222222222222222222222201',
              ],
              threshold,
              nonSequential,
            })
          )
        )
      ),
    };
    const actual: unknown = JSON.parse(
      JSON.stringify(results, (_, value: unknown) =>
        typeof value === 'bigint' ? value.toString() : value
      )
    );
    expect(actual).toEqual(expected);
  });
});

test('pins mainnet deployment bytes when network and Clarity version are omitted', async () => {
  const input = {
    kind: 'deploy',
    privateKeys: ['111111111111111111111111111111111111111111111111111111111111111101'],
    recipient: 'ST000000000000000000002AMW42H',
    amount: '1',
    fee: '321',
    nonce: 0,
  } satisfies Parameters<typeof transactionContractVectorDriver.transaction>[0];
  const results = {
    omitted: await transactionContractVectorDriver.transaction(input),
    explicitMainnet: await transactionContractVectorDriver.transaction({
      ...input,
      network: 'mainnet',
    }),
  };
  const actual: unknown = JSON.parse(
    JSON.stringify(results, (_, value: unknown) =>
      typeof value === 'bigint' ? value.toString() : value
    )
  );
  const expected: unknown = JSON.parse(
    readStacksVectorFileSync(__dirname + '/vectors/mainnet-deploy.json', 'utf8')
  );
  expect(actual).toEqual(expected);
});
