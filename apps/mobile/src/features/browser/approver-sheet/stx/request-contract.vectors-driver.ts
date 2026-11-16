import { vi } from 'vitest';

import { getStxRequestParams } from './utils';

vi.mock('@/features/approver/utils', async () => {
  const { createMoneyFromDecimal } = await import('@leather.io/utils');
  return {
    getDefaultFee() {
      return createMoneyFromDecimal(0.003, 'STX');
    },
  };
});
vi.mock('@/store/apps/utils', () => ({ assertAppIsConnected: vi.fn() }));
vi.mock('@/store/keychains/stacks/stacks-keychains.read', () => ({
  stacksSignerFromAddress: vi.fn(),
}));
vi.mock('@/store/keychains/stacks/utils', () => ({ assertStacksSigner: vi.fn() }));
vi.mock('@/store/utils', () => ({ makeStacksAccountIdentiferFromDescriptor: vi.fn() }));

export function request(params: Parameters<typeof getStxRequestParams>[0], nonce: number) {
  return getStxRequestParams(params, nonce);
}
