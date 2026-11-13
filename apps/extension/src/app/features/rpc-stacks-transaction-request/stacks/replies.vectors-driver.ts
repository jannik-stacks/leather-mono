import { STACKS_TESTNET } from '@stacks/network';
import { type StacksTransactionWire, deserializeTransaction } from '@stacks/transactions';
import { act, renderHook } from '@testing-library/react';
import { vi } from 'vitest';
import { z } from 'zod';

import { createRequestEncoder, stxSignTransaction } from '@leather.io/rpc';
import { signStacksTransaction } from '@leather.io/stacks';
import type * as LeatherUtils from '@leather.io/utils';
import { createMoney } from '@leather.io/utils';

import type * as SharedUtils from '@shared/utils';

import { initialSearchParams } from '@app/common/initial-search-params';
import {
  useRpcSignStacksMessage,
  useRpcStacksMessagePayload,
} from '@app/pages/rpc-sign-stacks-message/use-rpc-sign-stacks-message';
import { RpcStxSignTransaction } from '@app/pages/rpc-stx-sign-transaction/rpc-stx-sign-transaction';

import { useSignAndBroadcastStacksTransaction } from './use-sign-and-broadcast-stacks-transaction';

const bridge = vi.hoisted(() => ({
  messages: vi.fn(),
  transport: vi.fn(),
  navigate: vi.fn(),
  status: vi.fn(),
}));
vi.mock('@app/common/hooks/use-default-request-search-params', () => ({
  useDefaultRequestParams() {
    return { tabId: 7, frameId: 2, origin: 'https://app.example' };
  },
}));
vi.mock('@app/store/common/wallet-type.selectors', () => ({
  useActiveWalletType() {
    return 'software';
  },
}));
vi.mock('@app/features/ledger/flow/ledger-flow.context', () => ({
  useLedgerFlow() {
    return { sign: vi.fn() };
  },
}));
vi.mock('@app/store/accounts/blockchain/stacks/stacks-account.hooks', () => ({
  useCurrentStacksAccount() {
    return {
      type: 'software',
      stxPrivateKey: '111111111111111111111111111111111111111111111111111111111111111101',
    };
  },
  useCurrentStacksAccountAddress() {
    return 'ST000000000000000000002AMW42H';
  },
}));
vi.mock('@app/common/hooks/use-convert-to-fiat-amount', () => ({
  useConvertCryptoCurrencyToFiatAmount() {
    return () => '0';
  },
}));
vi.mock('@app/features/fee-editor/fee-editor.context', () => ({
  useFeeEditorContext() {
    return {
      availableBalance: createMoney(100000000, 'STX'),
      isLoadingFees: false,
      isSponsored: false,
      selectedFee: { txFee: createMoney(321, 'STX') },
    };
  },
}));
vi.mock('@app/features/nonce-editor/nonce-editor.context', () => ({
  useNonceEditorContext() {
    return { nonce: 0 };
  },
}));
vi.mock('react-router', () => ({
  useNavigate() {
    return bridge.navigate;
  },
}));
vi.mock('@shared/messaging/send-message-to-originating-frame', () => ({
  sendMessageToOriginatingFrame: bridge.messages,
}));
vi.mock('@shared/utils', async importOriginal => ({
  ...(await importOriginal<typeof SharedUtils>()),
  closeWindow: vi.fn(),
}));
vi.mock('@leather.io/utils', async importOriginal => ({
  ...(await importOriginal<typeof LeatherUtils>()),
  delay() {
    return Promise.resolve();
  },
}));
vi.mock('@shared/logger', () => ({ logger: { error: vi.fn(), info: vi.fn() } }));
vi.mock('@shared/utils/analytics', () => ({
  analytics: { track: vi.fn(), untypedTrack: vi.fn() },
}));
vi.mock('@app/query/stacks/stacks-client', () => ({ hiroFetchWrapper: bridge.transport }));
vi.mock('@app/components/loaders/stacks-nonce-loader', () => ({
  useAnalyticsOnlyStacksNonceTracker() {
    return { trackIfNonceError: vi.fn() };
  },
}));
vi.mock('@app/store/networks/networks.hooks', () => ({
  useCurrentStacksNetworkState() {
    return STACKS_TESTNET;
  },
}));
vi.mock('@app/store/transactions/transaction.hooks', () => ({
  useSignStacksTransaction() {
    return (tx: StacksTransactionWire) =>
      Promise.resolve(
        signStacksTransaction(
          tx,
          '111111111111111111111111111111111111111111111111111111111111111101'
        )
      );
  },
}));
vi.mock('./stacks-rpc-transaction-request.context', () => ({
  useStacksRpcTransactionRequestContext() {
    return {
      tabId: 7,
      frameId: 2,
      requestId: 'vector-request',
      onSetTransactionStatus: bridge.status,
    };
  },
}));

export async function approve(hex: string, status: number, body: string) {
  bridge.messages.mockClear();
  bridge.transport.mockClear();
  bridge.navigate.mockClear();
  bridge.status.mockClear();
  bridge.transport.mockImplementation(() => Promise.resolve(new Response(body, { status })));
  const hook = renderHook(() => useSignAndBroadcastStacksTransaction('stx_transferStx'));
  try {
    await hook.result.current(deserializeTransaction(hex));
    return {
      messages: bridge.messages.mock.calls,
      requests: bridge.transport.mock.calls,
      navigations: bridge.navigate.mock.calls,
      statuses: bridge.status.mock.calls,
    };
  } finally {
    hook.unmount();
  }
}

export async function signReply(hex: string, legacy: boolean) {
  bridge.messages.mockClear();
  const request = stxSignTransaction.request.parse({
    jsonrpc: '2.0',
    id: 'vector-request',
    method: 'stx_signTransaction',
    params: legacy ? { txHex: hex } : { transaction: hex },
  });
  initialSearchParams.set(
    'rpcRequest',
    createRequestEncoder(stxSignTransaction.request).encode(request)
  );
  const hook = renderHook(() => RpcStxSignTransaction());
  try {
    const rendered = z
      .object({
        props: z.object({
          actions: z.object({
            props: z.object({
              onApprove: z.custom<() => unknown>(value => typeof value === 'function'),
            }),
          }),
        }),
      })
      .parse(hook.result.current);
    await rendered.props.actions.props.onApprove();
    return bridge.messages.mock.calls;
  } finally {
    hook.unmount();
    initialSearchParams.delete('rpcRequest');
  }
}

export async function messageReply(message: string, domain?: string) {
  bridge.messages.mockClear();
  initialSearchParams.set('requestId', 'vector-request');
  initialSearchParams.set('network', 'mainnet');
  initialSearchParams.set('message', message);
  initialSearchParams.set('messageType', domain ? 'structured' : 'utf8');
  if (domain) initialSearchParams.set('domain', domain);
  const hook = renderHook(() => ({
    sign: useRpcSignStacksMessage(),
    payload: useRpcStacksMessagePayload(),
  }));
  try {
    const payload = hook.result.current.payload;
    if (!payload) throw new Error('Missing signable message payload');
    await act(async () => {
      await hook.result.current.sign.signMessage(payload);
    });
    return bridge.messages.mock.calls;
  } finally {
    hook.unmount();
    for (const key of ['requestId', 'network', 'message', 'messageType', 'domain'])
      initialSearchParams.delete(key);
  }
}
