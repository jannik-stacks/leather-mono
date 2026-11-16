// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';

import { beforeEach, describe, expect, test, vi } from 'vitest';

import { RpcErrorCode } from '@leather.io/rpc';

import type { UnsignedMessage } from '@shared/signature/signature-types';

import { RpcStacksMessageSigning } from '@app/pages/rpc-sign-stacks-message/rpc-sign-stacks-message';

import { useSignStacksMessage } from './use-sign-stacks-message';

Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', true);

const h = vi.hoisted(() => ({
  sign: vi.fn(),
  sendMessage: vi.fn(),
  closeWindow: vi.fn(),
  searchParams: new URLSearchParams({
    requestId: 'invalid-request',
    messageType: 'structured',
    message: '03',
    domain: '03',
  }),
}));

vi.mock('@app/common/initial-search-params', () => ({ initialSearchParams: h.searchParams }));
vi.mock('@app/common/hooks/use-default-request-search-params', () => ({
  useDefaultRequestParams() {
    return { frameId: 2, tabId: 7, origin: 'https://app.example' };
  },
}));
vi.mock('@shared/messaging/send-message-to-originating-frame', () => ({
  sendMessageToOriginatingFrame: h.sendMessage,
}));
vi.mock('@shared/utils', () => ({ closeWindow: h.closeWindow }));
vi.mock('@app/features/container/headers/popup.header', () => ({
  PopupHeader() {
    return null;
  },
}));
vi.mock('@app/features/stacks-message-signer/stacks-message-signing', () => ({
  StacksMessageSigning() {
    return createElement('button', null, 'Approve');
  },
}));
vi.mock('@app/components/generic-error/generic-error', () => ({
  GenericError({ title, body, onClose }: { title: string; body: string; onClose(): void }) {
    return createElement(
      'div',
      null,
      title,
      body,
      createElement('button', { onClick: onClose }, 'Close')
    );
  },
}));

vi.mock('@shared/utils/analytics', () => ({ analytics: { track: vi.fn() } }));

vi.mock('@app/common/use-wallet-type', () => ({
  useWalletType: () => ({
    whenWallet:
      ({ ledger }: { ledger(message: UnsignedMessage): Promise<void> }) =>
      (message: UnsignedMessage) =>
        ledger(message),
  }),
}));

vi.mock('@app/features/ledger/flow/ledger-flow.context', () => ({
  useLedgerFlow: () => ({ sign: h.sign }),
}));

vi.mock('@app/features/stacks-message-signer/stacks-message-signing.utils', () => ({
  improveUxWithShortDelayAsStacksSigningIsSoFast: vi.fn(),
  useMessageSignerStacksSoftwareWallet: () => vi.fn(),
}));

const unsignedMessage: UnsignedMessage = { messageType: 'utf8', message: 'hello' };

function renderSignStacksMessage() {
  const onSignMessageCompleted = vi.fn();
  const onSignMessageCancelled = vi.fn();
  let signMessage: ReturnType<typeof useSignStacksMessage>['signMessage'] | undefined;
  function TestComponent() {
    signMessage = useSignStacksMessage({
      onSignMessageCompleted,
      onSignMessageCancelled,
    }).signMessage;
    return null;
  }
  act(() => {
    createRoot(document.createElement('div')).render(createElement(TestComponent));
  });
  return {
    onSignMessageCompleted,
    onSignMessageCancelled,
    signMessage(message: UnsignedMessage) {
      if (!signMessage) throw new Error('Hook did not render');
      return signMessage(message);
    },
  };
}

describe(useSignStacksMessage.name, () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('completes with the Ledger signature', async () => {
    const signature = { signature: 'sig', publicKey: 'pub' };
    h.sign.mockResolvedValue({ status: 'signed', value: signature });
    const rendered = renderSignStacksMessage();

    await rendered.signMessage(unsignedMessage);

    expect(h.sign).toHaveBeenCalledWith({ kind: 'sign-stacks-message', message: unsignedMessage });
    expect(rendered.onSignMessageCompleted).toHaveBeenCalledWith(signature);
  });

  test('cancels the request when Ledger signing is cancelled', async () => {
    h.sign.mockResolvedValue({ status: 'cancelled' });
    const rendered = renderSignStacksMessage();

    await rendered.signMessage(unsignedMessage);

    expect(rendered.onSignMessageCancelled).toHaveBeenCalled();
  });

  test('cancels the request when Ledger signing fails', async () => {
    h.sign.mockResolvedValue({ status: 'failed', error: 'No account' });
    const rendered = renderSignStacksMessage();

    await rendered.signMessage(unsignedMessage);

    expect(rendered.onSignMessageCancelled).toHaveBeenCalled();
    expect(rendered.onSignMessageCompleted).not.toHaveBeenCalled();
  });

  test('keeps the request open for a retry when Ledger signing is dismissed', async () => {
    h.sign.mockResolvedValue({ status: 'dismissed' });
    const rendered = renderSignStacksMessage();

    await rendered.signMessage(unsignedMessage);

    expect(rendered.onSignMessageCancelled).not.toHaveBeenCalled();
    expect(rendered.onSignMessageCompleted).not.toHaveBeenCalled();
  });
});

describe('invalid structured message requests', () => {
  test.each(['03', '0c00000000', 'garbage'])(
    'shows a validation error and returns INVALID_PARAMS for domain %s',
    domain => {
      vi.clearAllMocks();
      h.searchParams.set('domain', domain);
      const container = document.createElement('div');
      const root = createRoot(container);
      act(() => root.render(createElement(RpcStacksMessageSigning)));
      expect(container.textContent).toContain('Invalid structured message');
      expect(container.textContent).not.toContain('Approve');
      const close = container.querySelector('button');
      if (!close) throw new Error('Missing error close button');
      act(() => close.click());
      expect(h.sendMessage).toHaveBeenCalledWith(
        { frameId: 2, tabId: 7 },
        expect.objectContaining({
          id: 'invalid-request',
          error: { code: RpcErrorCode.INVALID_PARAMS, message: 'Invalid structured message' },
        })
      );
      expect(h.sign).not.toHaveBeenCalled();
      expect(h.closeWindow).toHaveBeenCalledOnce();
      act(() => root.unmount());
    }
  );
});
