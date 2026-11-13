import { STACKS_TESTNET } from '@stacks/network';
import { renderHook } from '@testing-library/react';
import { vi } from 'vitest';

import { useGenerateStxTokenTransferUnsignedTx } from './token-transfer.hooks';

const transport = vi.hoisted(() => vi.fn());
vi.mock('@app/store/networks/networks.hooks', () => ({
  useCurrentStacksNetworkState() {
    return {
      ...STACKS_TESTNET,
      client: { baseUrl: 'https://stacks.example', fetch: transport },
    };
  },
}));
vi.mock('@app/store/accounts/blockchain/stacks/stacks-account.hooks', () => ({
  useCurrentStacksAccount() {
    return {
      address: 'ST1WV0048ERKB55592H81MK6J4TTRP8TSGE8VSTHJ',
      stxPublicKey: '031b84c5567b126440995d3ed5aaba0565d71e1834604819ff9c17f5e9d5dd078f',
    };
  },
  useCurrentStacksAccountAddress() {
    return 'ST1WV0048ERKB55592H81MK6J4TTRP8TSGE8VSTHJ';
  },
}));
vi.mock('@app/query/stacks/nonce/account-nonces.hooks', () => ({
  useNextNonce() {
    return { data: undefined };
  },
}));
vi.mock('@app/store/policy/policy.selectors', () => ({
  useCurrentPolicy() {
    return undefined;
  },
}));
vi.mock('@shared/logger', () => ({ logger: { error: vi.fn() } }));

export async function resolveNonce(
  extendedResponse: unknown,
  accountResponse: unknown,
  accountStatus: number,
  nonce?: number
) {
  transport.mockClear();
  transport.mockImplementation((url: string) =>
    Promise.resolve(
      Response.json(url.includes('/nonces') ? extendedResponse : accountResponse, {
        status: url.includes('/nonces') ? 200 : accountStatus,
      })
    )
  );
  const hook = renderHook(() => useGenerateStxTokenTransferUnsignedTx());
  try {
    const transaction = await hook.result.current({
      amount: '1',
      fee: '0.000321',
      feeCurrency: 'STX',
      feeType: 'custom',
      memo: '',
      recipient: 'ST000000000000000000002AMW42H',
      recipientBnsName: '',
      nonce,
    });
    return {
      hex: transaction?.serialize(),
      nonce: transaction?.auth.spendingCondition.nonce.toString(),
      requests: transport.mock.calls,
    };
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    return { error: error.message, requests: transport.mock.calls };
  } finally {
    hook.unmount();
  }
}
