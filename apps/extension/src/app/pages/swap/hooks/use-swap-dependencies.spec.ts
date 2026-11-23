import type * as ReactModule from 'react';

import { STACKS_TESTNET } from '@stacks/network';
import { deserializeTransaction, makeUnsignedSTXTokenTransfer } from '@stacks/transactions';
import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import z from 'zod';

import { SwapSigningCancelledError } from '@leather.io/state/swap';

import { hiroFetchWrapper } from '@app/query/stacks/stacks-client';

import { useSwapDependencies } from './use-swap-dependencies';

const mocks = vi.hoisted(() => ({
  signBitcoinTx: vi.fn(),
  signStacksTx: vi.fn(),
}));

vi.mock('react', async importOriginal => {
  const actual = await importOriginal<typeof ReactModule>();
  return {
    ...actual,
    useMemo<T>(factory: () => T) {
      return factory();
    },
  };
});

vi.mock('@leather.io/state/swap', () => ({
  SwapSigningCancelledError: class SwapSigningCancelledError extends Error {},
  broadcastBitcoinTransaction: vi.fn(),
}));

vi.mock('@leather.io/services', () => ({
  getBitcoinCoinSelectionService: vi.fn(),
  getBitcoinTransactionFeesService: vi.fn(),
  getMarketDataService: vi.fn(),
  getMempoolApiClient: vi.fn(),
  getStacksTransactionFeesService: vi.fn(),
  getSwapService: vi.fn(),
}));

vi.mock('@app/common/hooks/account/use-refresh-all-account-data', () => ({
  useRefreshAllAccountData: () => vi.fn(),
}));

vi.mock('@app/query/stacks/nonce/account-nonces.hooks', () => ({
  useNextNonce: () => ({ data: undefined }),
}));

vi.mock('@app/query/stacks/stacks-client', () => ({
  hiroFetchWrapper: vi.fn(),
}));

vi.mock('@app/services/accounts/use-account-addresses', () => ({
  useAccountAddresses: () => ({}),
}));

vi.mock('@app/store/accounts/account', () => ({
  useCurrentAccountId: () => ({ fingerprint: 'abcd1234', accountIndex: 0 }),
}));

vi.mock('@app/store/accounts/blockchain/bitcoin/bitcoin.hooks', () => ({
  useSignBitcoinTx: () => mocks.signBitcoinTx,
}));

vi.mock('@app/store/accounts/blockchain/bitcoin/native-segwit-account.hooks', () => ({
  useCurrentAccountNativeSegwitIndexZeroPayerNullable: () => ({
    address: 'tb1qpayer',
    keyOrigin: 'abcd1234/84h/1h/0h/0/0',
    publicKey: new Uint8Array(33),
    payment: {},
  }),
}));

vi.mock('@app/store/accounts/blockchain/stacks/stacks-account.hooks', () => ({
  useCurrentStacksAccount: () => ({ address: 'ST000000000000000000002AMW42H', stxPublicKey: '02' }),
  useCurrentStacksAccountAddress: () => 'ST000000000000000000002AMW42H',
}));

vi.mock('@app/store/networks/networks.hooks', () => ({
  useCurrentStacksNetworkState: () => ({}),
}));

vi.mock('@app/store/networks/networks.selectors', () => ({
  useCurrentNetwork: () => ({ chain: { bitcoin: { bitcoinNetwork: 'testnet4' } } }),
}));

vi.mock('@app/store/transactions/transaction.hooks', () => ({
  useSignStacksTransaction: () => mocks.signStacksTx,
}));

const psbt = new Uint8Array([1, 2, 3]);
const publicKey = '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798';

function useBitcoinSwapDependencies() {
  const { bitcoin } = useSwapDependencies();
  if (!bitcoin) throw new Error('Expected bitcoin swap dependencies');
  return bitcoin;
}

describe(useSwapDependencies.name, () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('bitcoin signer', () => {
    test('resolves with the signed transaction', async () => {
      const signedTx = { hex: 'signed' };
      mocks.signBitcoinTx.mockResolvedValue(signedTx);

      await expect(useBitcoinSwapDependencies().signBitcoinPsbt(psbt)).resolves.toBe(signedTx);
      expect(mocks.signBitcoinTx).toHaveBeenCalledWith(psbt);
    });

    test('rejects with a swap signing cancellation when Ledger signing is dismissed', async () => {
      mocks.signBitcoinTx.mockResolvedValue(null);

      await expect(useBitcoinSwapDependencies().signBitcoinPsbt(psbt)).rejects.toBeInstanceOf(
        SwapSigningCancelledError
      );
    });
  });

  describe('stacks signer', () => {
    test('rejects with a swap signing cancellation when Ledger signing is dismissed', async () => {
      mocks.signStacksTx.mockResolvedValue(null);
      const unsignedTx = await makeUnsignedSTXTokenTransfer({
        recipient: 'ST000000000000000000002AMW42H',
        amount: 1n,
        fee: 0,
        nonce: 0,
        publicKey,
        network: 'testnet',
      });

      await expect(
        useSwapDependencies().stacks.stacksSigner.sign(unsignedTx)
      ).rejects.toBeInstanceOf(SwapSigningCancelledError);
    });
  });

  test('treats a user cancelled signing as a swap signing cancellation', () => {
    const dependencies = useSwapDependencies();

    expect(
      dependencies.isSigningCancelledError?.(new Error('User cancelled the signing operation'))
    ).toBe(true);
  });
});

describe('Stacks migration vectors: swap broadcast', () => {
  test('pins swap broadcast request bytes, success, rejection and missing txid', async () => {
    const vector = z
      .object({
        hex: z.string(),
        apiUrl: z.string(),
        cases: z.array(
          z.object({
            id: z.string(),
            status: z.number(),
            body: z.string(),
            transportError: z.string().optional(),
            expected: z.unknown(),
          })
        ),
      })
      .parse(JSON.parse(readFileSync(__dirname + '/vectors/swap-broadcast.json', 'utf8')));
    const { broadcast } = useSwapDependencies().stacks;
    const outputs = [];
    for (const response of vector.cases) {
      const calls: unknown[] = [];
      vi.mocked(hiroFetchWrapper).mockImplementation((url, init) => {
        calls.push({
          url: url instanceof Request ? url.url : url.toString(),
          method: init?.method,
          contentType: new Headers(init?.headers).get('Content-Type'),
          body: init?.body,
        });
        if (response.transportError) return Promise.reject(new Error(response.transportError));
        return Promise.resolve(new Response(response.body, { status: response.status }));
      });
      try {
        const result = await broadcast({
          tx: deserializeTransaction(vector.hex),
          stacksNetwork: { ...STACKS_TESTNET, client: { baseUrl: vector.apiUrl } },
        });
        outputs.push({ result, calls });
      } catch (error) {
        if (!(error instanceof Error)) throw error;
        outputs.push({ error: error.message, calls });
      }
    }
    expect(outputs).toEqual(vector.cases.map(response => response.expected));
  });
});
