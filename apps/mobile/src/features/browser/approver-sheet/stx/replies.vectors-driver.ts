import { Fragment, type ReactNode, createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { STACKS_TESTNET } from '@jannik-stacks/kit';
import { vi } from 'vitest';

import { stxSignMessage, stxSignStructuredMessage, stxSignTransaction } from '@leather.io/rpc';
import {
  initalizeStacksSigner,
  signMessage,
  signStacksTransaction,
  signStructuredDataMessage,
} from '@leather.io/stacks';

import { StxSignMessageApprover } from './sign-message/sign-message';
import { StxSignStructuredMessageApprover } from './sign-structured-message/sign-structured-message';
import { SignTransactionApprover } from './sign-transaction/sign-transaction';

const approval = vi.hoisted(() => {
  const handlers: (() => Promise<unknown>)[] = [];
  return { handlers };
});
vi.mock('@/features/approver/layouts/base-stx-tx-approver.layout', () => ({
  BaseStxTxApproverLayout({ onApprove }: { onApprove(): Promise<unknown> }) {
    approval.handlers.push(onApprove);
    return null;
  },
}));
vi.mock('@/features/approver/components/approver-account-card', () => ({
  ApproverAccountCard() {
    return null;
  },
}));
vi.mock('@/components/divider', () => ({
  Divider() {
    return null;
  },
}));
vi.mock('@/features/approver/components/approver-buttons', () => ({
  ApproverButtons({ onApprove }: { onApprove(): Promise<unknown> }) {
    approval.handlers.push(onApprove);
    return null;
  },
}));
vi.mock('@/store/accounts/accounts.read', () => ({
  useAccounts() {
    return { list: [] };
  },
}));
vi.mock('@/store/keychains/stacks/stacks-keychains.read', () => ({
  useStacksSigners() {
    return {
      fromAccountId() {
        return [signer()];
      },
    };
  },
}));
vi.mock('@/store/settings/settings', () => ({
  useNetworkPreferenceStacksNetwork() {
    return STACKS_TESTNET;
  },
}));
vi.mock('@/utils/analytics', () => ({ analytics: { untypedTrack: vi.fn() } }));
vi.mock('@lingui/core/macro', () => ({
  t(strings: TemplateStringsArray, ...values: unknown[]) {
    return String.raw(strings, ...values);
  },
}));
vi.mock('@leather.io/ui/native', () => {
  function Children({ children }: { children: ReactNode }) {
    return createElement(Fragment, null, children);
  }
  return {
    Approver: Object.assign(Children, {
      Container: Children,
      Section: Children,
      Footer: Children,
      Header() {
        return null;
      },
    }),
    Cell: { Root: Children, Content: Children, Label: Children },
    Box: Children,
    Text: Children,
    useTheme() {
      return { spacing: { '3': 3 } };
    },
    Button({ onPress }: { onPress(): void }) {
      approval.handlers.push(() => Promise.resolve(onPress()));
      return null;
    },
    AnimalChameleonIcon() {
      return null;
    },
    AnimalEagleIcon() {
      return null;
    },
    AnimalRabbitIcon() {
      return null;
    },
    AnimalSnailIcon() {
      return null;
    },
  };
});

function signer() {
  const key = '111111111111111111111111111111111111111111111111111111111111111101';
  return initalizeStacksSigner({
    descriptor:
      "[73c5da0a/44'/5757'/0'/0/0]034f355bdcb7cc0af728ef3cceb9615d90684bb5b2ca5f859ab0f0b704075871aa",
    network: 'testnet',
    signFn(tx) {
      return Promise.resolve(signStacksTransaction(tx, key));
    },
    signMessageFn(message) {
      return Promise.resolve(signMessage(message, key));
    },
    signStructuredMessageFn(message, domain) {
      return Promise.resolve(signStructuredDataMessage(message, domain, key));
    },
  });
}

const app = {
  origin: 'https://app.example',
  screenshot: null,
  name: 'vector-app',
  status: 'connected',
  accountId: '73c5da0a/0',
} satisfies Parameters<typeof SignTransactionApprover>[0]['app'];

export async function transactionReply(hex: string, legacy: boolean) {
  approval.handlers.length = 0;
  const replies: unknown[] = [];
  renderToStaticMarkup(
    createElement(SignTransactionApprover, {
      app,
      request: stxSignTransaction.request.parse({
        jsonrpc: '2.0',
        id: 'vector-request',
        method: 'stx_signTransaction',
        params: legacy ? { txHex: hex } : { transaction: hex },
      }),
      sendResult(response) {
        replies.push(response);
      },
      closeApprover: vi.fn(),
      accountId: app.accountId,
    })
  );
  const approve = approval.handlers[0];
  if (!approve) throw new Error('Approval was not rendered');
  return { txid: await approve(), replies };
}

export async function messageReply(message: string, domain?: string) {
  approval.handlers.length = 0;
  const replies: unknown[] = [];
  renderToStaticMarkup(
    createElement(StxSignMessageApprover, {
      app,
      request: stxSignMessage.request.parse({
        jsonrpc: '2.0',
        id: 'vector-request',
        method: 'stx_signMessage',
        params: domain
          ? { messageType: 'structured', message, domain }
          : { messageType: 'utf8', message },
      }),
      sendResult(response) {
        replies.push(response);
      },
      closeApprover: vi.fn(),
      accountId: app.accountId,
    })
  );
  const approve = approval.handlers[0];
  if (!approve) throw new Error('Approval was not rendered');
  await approve();
  return replies;
}

export async function invalidStructuredMessageReply(domain: string) {
  const replies: unknown[] = [];
  approval.handlers.length = 0;
  renderToStaticMarkup(
    createElement(StxSignStructuredMessageApprover, {
      app,
      request: stxSignStructuredMessage.request.parse({
        jsonrpc: '2.0',
        id: 'vector-request',
        method: 'stx_signStructuredMessage',
        params: { message: '03', domain },
      }),
      sendResult(response) {
        replies.push(response);
      },
      closeApprover: vi.fn(),
      accountId: app.accountId,
    })
  );
  const approve = approval.handlers[0];
  if (!approve) throw new Error('Approval was not rendered');
  await approve();
  return replies;
}
