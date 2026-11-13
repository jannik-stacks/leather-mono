import type * as StacksConnect from '@stacks/connect';
import { vi } from 'vitest';
import { z } from 'zod';

import {
  connectWallet,
  disconnectWallet,
  isUserRejectionError,
  revokeWalletPermissions,
  walletStxCallContract,
} from './wallet';

const mocks = vi.hoisted(() => ({
  selected: vi.fn(),
  provider: vi.fn(),
  request:
    vi.fn<
      (
        options: { enableLocalStorage: boolean },
        method: string,
        params: unknown
      ) => Promise<unknown>
    >(),
  select: vi.fn(),
  disconnect: vi.fn(),
}));
vi.mock('@stacks/connect', async importOriginal => ({
  ...(await importOriginal<typeof StacksConnect>()),
  getSelectedProviderId: mocks.selected,
  getSelectedProvider: mocks.provider,
  request: mocks.request,
  setSelectedProviderId: mocks.select,
  disconnect: mocks.disconnect,
}));
vi.mock('~/constants/environment', () => ({
  getLeatherMockMode() {
    return false;
  },
}));
vi.mock('~/utils/leather-sdk', () => ({ leather: {} }));

export async function connect(allowWalletSelect: boolean, rejectionCode?: number) {
  vi.clearAllMocks();
  mocks.selected.mockReturnValue(null);
  mocks.provider.mockReturnValue(undefined);
  if (rejectionCode === undefined)
    mocks.request.mockResolvedValue({
      addresses: [
        {
          address: 'ST000000000000000000002AMW42H',
          publicKey: '029dbc41eec542d022f8650466e8de5b4fd451c5a94f3847e372f080c4700b92ec',
          symbol: 'STX',
        },
      ],
    });
  else mocks.request.mockRejectedValue({ code: rejectionCode });
  const result = await connectWallet({ allowWalletSelect });
  return { result, requests: mocks.request.mock.calls, selections: mocks.select.mock.calls };
}
export async function revoke(id: string | null, fails: boolean) {
  vi.clearAllMocks();
  const request = vi.fn();
  if (fails) request.mockRejectedValue(new Error('unsupported'));
  else request.mockResolvedValue(undefined);
  mocks.selected.mockReturnValue(id);
  mocks.provider.mockReturnValue({ request });
  const revoked = await revokeWalletPermissions();
  disconnectWallet();
  return { revoked, requests: request.mock.calls, disconnected: mocks.disconnect.mock.calls };
}
export function rejection(id: string, code: number) {
  mocks.selected.mockReturnValue(id);
  return {
    direct: isUserRejectionError({ code }),
    nested: isUserRejectionError({ error: { code } }),
  };
}
export async function call(
  params: Parameters<typeof walletStxCallContract>[0],
  hasProvider: boolean
) {
  vi.clearAllMocks();
  mocks.provider.mockReturnValue(hasProvider ? { request: vi.fn() } : undefined);
  mocks.request.mockResolvedValue({ txid: 'abc', transaction: 'deadbeef' });
  try {
    const result = await walletStxCallContract(params);
    return {
      result,
      calls: mocks.request.mock.calls.map(([options, method, params]) => ({
        method,
        params,
        enableLocalStorage: options.enableLocalStorage,
      })),
    };
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    return { name: error.name, error: error.message };
  }
}

export async function nativeCall(params: Parameters<typeof walletStxCallContract>[0]) {
  vi.clearAllMocks();
  const provider = {
    request: vi.fn().mockResolvedValue({ result: { txId: 'abc', transaction: 'deadbeef' } }),
  };
  mocks.provider.mockReturnValue(provider);
  const sdk = await vi.importActual<typeof StacksConnect>('@stacks/connect');
  mocks.request.mockImplementation(async (options, method, input) => {
    if (method !== 'stx_callContract') throw new Error('Unexpected contract method');
    const parsed = z
      .object({
        contract: z.templateLiteral([z.string(), '.', z.string()]),
        functionName: z.string(),
        functionArgs: z.array(z.string()),
        postConditionMode: z.enum(['allow', 'deny', 'originator']),
      })
      .parse(input);
    return sdk.request({ ...options, provider }, method, parsed);
  });
  const result = await walletStxCallContract(params);
  return { result, requests: provider.request.mock.calls };
}
