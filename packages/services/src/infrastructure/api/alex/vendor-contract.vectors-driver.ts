import { vi } from 'vitest';

import { createMock } from '../../../test/create-mock';
import type { HttpCacheService } from '../../cache/http-cache.service';
import { AlexSdkClient } from './alex-sdk.client';

const calls = vi.hoisted(() => ({ route: vi.fn(), fee: vi.fn(), amount: vi.fn(), swap: vi.fn() }));
vi.mock('alex-sdk', () => ({
  AlexSDK: class {
    fetchSwappableCurrency() {
      return Promise.resolve([{ id: 'token-wstx' }, { id: 'token-alex' }]);
    }
    getRoute = calls.route;
    getFeeRate = calls.fee;
    getAmountTo = calls.amount;
    runSwap = calls.swap;
  },
}));

export async function swap(
  address: string,
  from: string,
  to: string,
  amount: bigint,
  minimum: bigint
) {
  vi.clearAllMocks();
  calls.route.mockResolvedValue([]);
  calls.fee.mockResolvedValue(300n);
  calls.amount.mockResolvedValue(12345678901234567890n);
  calls.swap.mockResolvedValue({
    contractAddress: 'ST000000000000000000002AMW42H',
    contractName: 'swap',
    functionName: 'swap',
    functionArgs: [],
    postConditions: [],
  });
  const client = new AlexSdkClient(createMock<HttpCacheService>({}));
  try {
    const route = await client.getRoute(from, to);
    const fee = await client.getFeeRate(from, to);
    const output = await client.getAmountTo(from, to, amount, route);
    const transaction = await client.getSwapTx(address, from, to, amount, minimum);
    return {
      route,
      fee,
      output,
      transaction,
      calls: {
        route: calls.route.mock.calls,
        fee: calls.fee.mock.calls,
        amount: calls.amount.mock.calls,
        swap: calls.swap.mock.calls,
      },
    };
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    return { error: error.message };
  }
}
