import { type FlatPayload, type StacksTransaction, publicKeyToAddress } from '@jannik-stacks/kit';

import { type HiroTransactionFeeEstimateResponse } from '../infrastructure/api/hiro/hiro-stacks-api.types';

const testPublicKey = '0250863ad64a87ae8a2fe83c1af1a8403cb53f53e486d8511dad8a04887e5b2352';
const testRecipient = 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG';
function createStacksTransactionWithPayload(payload: FlatPayload): StacksTransaction {
  return {
    ...payload,
    network: 'testnet',
    fee: 0n,
    nonce: 0n,
    signer: { value: publicKeyToAddress(testPublicKey, { network: 'testnet' }) },
  };
}
export function createTokenTransferTx() {
  return createStacksTransactionWithPayload({
    type: 'transfer',
    recipient: testRecipient,
    amount: 1n,
  });
}
export function createContractCallTx() {
  return createStacksTransactionWithPayload({
    type: 'call',
    contract: `${testRecipient}.test-contract`,
    functionName: 'test-function',
    args: [],
  });
}
export function createSmartContractTx() {
  return createStacksTransactionWithPayload({
    type: 'deploy',
    name: 'test-contract',
    code: '(define-data-var counter uint u0)',
  });
}
export function createVersionedSmartContractTx() {
  return createStacksTransactionWithPayload({
    type: 'deploy',
    name: 'test-contract',
    code: '(define-data-var counter uint u0)',
    clarityVersion: 2,
  });
}
export function createCoinbaseTx() {
  return createStacksTransactionWithPayload({ type: 'coinbase', coinbaseBytes: '00'.repeat(32) });
}

export function createHiroFeeEstimateResponse(
  overrides: Partial<HiroTransactionFeeEstimateResponse> = {}
): HiroTransactionFeeEstimateResponse {
  return {
    estimated_cost_scalar: 0,
    estimated_cost: {
      read_count: 0,
      read_length: 0,
      runtime: 0,
      write_count: 0,
      write_length: 0,
    },
    estimations: [],
    ...overrides,
  };
}
