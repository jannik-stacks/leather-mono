import type {
  AbstractTransaction,
  AddressTransactionWithTransfers,
  ContractCallTransaction,
  SmartContractTransaction,
  TokenTransferTransaction,
  Transaction,
} from '@stacks/stacks-blockchain-api-types';
import { readFileSync as readStacksVectorFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import * as hiroMappingContractVectorDriver from './hiro-mapping-contract.vectors-driver';
import { filterVerboseUnusedTransactionWithTransfersData } from './hiro-stacks-api.utils';

function createMockAbstractTransaction(
  overrides: Partial<AbstractTransaction> = {}
): AbstractTransaction {
  return {
    tx_id: '0x0',
    nonce: 0,
    fee_rate: '0',
    sender_address: '',
    sponsored: false,
    post_condition_mode: 'deny',
    post_conditions: [],
    anchor_mode: 'any',
    block_hash: '',
    block_height: 0,
    block_time: 0,
    block_time_iso: '',
    burn_block_height: 0,
    burn_block_time: 0,
    burn_block_time_iso: '',
    parent_burn_block_time: 0,
    parent_burn_block_time_iso: '',
    canonical: true,
    tx_index: 0,
    tx_status: 'success',
    tx_result: { hex: '', repr: '' },
    event_count: 0,
    parent_block_hash: '',
    is_unanchored: false,
    microblock_hash: '',
    microblock_sequence: 0,
    microblock_canonical: true,
    execution_cost_read_count: 0,
    execution_cost_read_length: 0,
    execution_cost_runtime: 0,
    execution_cost_write_count: 0,
    execution_cost_write_length: 0,
    events: [],
    ...overrides,
  };
}

function createMockTokenTransferTransaction(
  overrides: Partial<AbstractTransaction> = {}
): TokenTransferTransaction {
  return {
    ...createMockAbstractTransaction(overrides),
    tx_type: 'token_transfer',
    token_transfer: { recipient_address: '', amount: '0', memo: '' },
  };
}

function createMockTransactionWithTransfers(tx: Transaction): AddressTransactionWithTransfers {
  return { tx, stx_sent: '0', stx_received: '0', stx_transfers: [] };
}

function assertTxType<T extends Transaction['tx_type']>(
  tx: Transaction,
  txType: T
): asserts tx is Extract<Transaction, { tx_type: T }> {
  if (tx.tx_type !== txType) throw new Error(`Expected ${txType}, received ${tx.tx_type}`);
}

describe('filterVerboseUnusedTransactionWithTransfersData', () => {
  it('should redact the source_code for smart_contract transactions', () => {
    const smartContractTx: SmartContractTransaction = {
      ...createMockAbstractTransaction(),
      tx_type: 'smart_contract',
      smart_contract: {
        contract_id: '',
        source_code: 'some_source_code',
      },
    };

    const { tx } = filterVerboseUnusedTransactionWithTransfersData(
      createMockTransactionWithTransfers(smartContractTx)
    );
    assertTxType(tx, 'smart_contract');
    expect(tx.smart_contract.source_code).toBe('redacted');
  });

  it('should redact function_args and tx_result for contract_call transactions', () => {
    const contractCallTx: ContractCallTransaction = {
      ...createMockAbstractTransaction({ tx_result: { hex: '0xresult', repr: 'result_repr' } }),
      tx_type: 'contract_call',
      contract_call: {
        contract_id: '',
        function_name: '',
        function_signature: '',
        function_args: [
          { hex: '0x123', repr: 'arg1', name: 'a', type: 'uint' },
          { hex: '0x456', repr: 'arg2', name: 'b', type: 'uint' },
        ],
      },
    };

    const { tx } = filterVerboseUnusedTransactionWithTransfersData(
      createMockTransactionWithTransfers(contractCallTx)
    );
    assertTxType(tx, 'contract_call');

    expect(tx.contract_call.function_args).toEqual([
      { hex: 'redacted', repr: 'redacted', name: 'a', type: 'uint' },
      { hex: 'redacted', repr: 'redacted', name: 'b', type: 'uint' },
    ]);
    expect(tx.tx_result).toEqual({ hex: 'redacted', repr: 'redacted' });
  });

  it('should handle contract_call transactions without function_args', () => {
    const contractCallTx: ContractCallTransaction = {
      ...createMockAbstractTransaction({ tx_result: { hex: '0xresult', repr: 'result_repr' } }),
      tx_type: 'contract_call',
      contract_call: {
        function_args: [],
        contract_id: '',
        function_name: '',
        function_signature: '',
      },
    };

    const result = filterVerboseUnusedTransactionWithTransfersData(
      createMockTransactionWithTransfers(contractCallTx)
    );

    expect(result.tx.tx_result).toEqual({ hex: 'redacted', repr: 'redacted' });
  });

  it('should not modify transactions that are not smart_contract or contract_call type', () => {
    const result = filterVerboseUnusedTransactionWithTransfersData(
      createMockTransactionWithTransfers(createMockTokenTransferTransaction())
    );

    expect(result.tx).toEqual(createMockTokenTransferTransaction());
  });
});

describe('Stacks migration vectors: hiro-mapping-contract', () => {
  const expected: unknown = JSON.parse(
    readStacksVectorFileSync(__dirname + '/vectors/hiro-mapping-contract.json', 'utf8')
  );

  test('pins Hiro metadata and large balance response mapping', () => {
    const results = {
      transaction: hiroMappingContractVectorDriver.transaction({
        tx: {
          tx_id: '0xabc',
          nonce: 42,
          fee_rate: '9007199254740993',
          sender_address: 'ST000000000000000000002AMW42H',
          sponsored: true,
          post_condition_mode: 'deny',
          post_conditions: [],
          anchor_mode: 'any',
          block_hash: '0xblock',
          block_height: 123,
          block_time: 1700000000,
          block_time_iso: '2023-11-14T22:13:20.000Z',
          burn_block_height: 100,
          burn_block_time: 1699999990,
          burn_block_time_iso: '2023-11-14T22:13:10.000Z',
          parent_burn_block_time: 1699999980,
          parent_burn_block_time_iso: '2023-11-14T22:13:00.000Z',
          canonical: true,
          tx_index: 0,
          tx_status: 'success',
          tx_result: { hex: '0x0703', repr: '(ok true)' },
          event_count: 0,
          parent_block_hash: '0xparent',
          is_unanchored: false,
          microblock_hash: '',
          microblock_sequence: 0,
          microblock_canonical: true,
          execution_cost_read_count: 1,
          execution_cost_read_length: 2,
          execution_cost_runtime: 3,
          execution_cost_write_count: 4,
          execution_cost_write_length: 5,
          events: [],
          tx_type: 'contract_call',
          contract_call: {
            contract_id: 'ST000000000000000000002AMW42H.token',
            function_name: 'transfer',
            function_signature: '(define-public (transfer (amount uint)))',
            function_args: [
              {
                hex: '0x0100000000000000000000000000000001',
                repr: 'u1',
                name: 'amount',
                type: 'uint',
              },
            ],
          },
        },
        stx_sent: '9007199254740993',
        stx_received: '0',
        stx_transfers: [],
      }),
      balances: [
        hiroMappingContractVectorDriver.balance('9007199254740993', '18446744073709551617'),
        hiroMappingContractVectorDriver.balance('not-a-number', ''),
      ],
      collection: [
        undefined,
        null,
        'bad',
        {},
        { name: 'fallback', total_items: '12' },
        { collection_name: 'Leather', location_url: 'https://example.test', total_items: 12 },
      ].map(hiroMappingContractVectorDriver.collection),
      attributes: hiroMappingContractVectorDriver.attributes([
        { trait_type: 'rank', value: '9007199254740993' },
        { trait_type: 'color', value: 'red' },
      ]),
    };
    const actual: unknown = JSON.parse(
      JSON.stringify(results, (_, value: unknown) =>
        typeof value === 'bigint' ? value.toString() : value
      )
    );
    expect(actual).toEqual(expected);
  });
});
