import { Fragment, type ReactNode, createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { Cl, Codec } from '@jannik-stacks/kit';
import { t } from '@lingui/core/macro';
import { vi } from 'vitest';

import { ClarityValueListDisplayer } from './clarity-value.section';
import {
  formatPostConditionMessage,
  formatPoxPostConditionMessage,
} from './components/post-conditions/post-conditions.utils';
import { BaseStxMessageApproverLayout } from './layouts/base-stx-message-approver.layout';

vi.mock('@lingui/core/macro', () => ({
  t(strings: TemplateStringsArray, ...values: unknown[]) {
    return String.raw(strings, ...values);
  },
}));

vi.mock('@leather.io/ui/native', () => ({
  Approver: Object.assign(
    function Approver({ children }: { children: ReactNode }) {
      return createElement(Fragment, null, children);
    },
    {
      Container({ children }: { children: ReactNode }) {
        return createElement(Fragment, null, children);
      },
      Section({ children }: { children: ReactNode }) {
        return createElement(Fragment, null, children);
      },
      Footer({ children }: { children: ReactNode }) {
        return createElement(Fragment, null, children);
      },
      Header() {
        return null;
      },
    }
  ),
  Button({ children }: { children: ReactNode }) {
    return createElement('button', null, children);
  },
  Box({ children }: { children: ReactNode }) {
    return createElement(Fragment, null, children);
  },
  Text({ children }: { children: ReactNode }) {
    return createElement(Fragment, null, children);
  },
  useTheme() {
    return { spacing: { '3': 3 } };
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
  ApproverButtons() {
    return createElement('button', null, t`Approve`);
  },
}));

export function structuredMessageMarkup(domain: string) {
  return renderToStaticMarkup(
    createElement(BaseStxMessageApproverLayout, {
      accounts: [],
      accountId: null,
      origin: 'https://app.example',
      messageToSign: { messageType: 'structured', message: '03', domain },
      onApprove: vi.fn(),
      onCloseApprover: vi.fn(),
      onInvalidMessage: vi.fn(),
    })
  );
}

export function display(hex: string) {
  const container = document.createElement('div');
  container.innerHTML = renderToStaticMarkup(
    createElement(ClarityValueListDisplayer, { val: Cl.deserialize(hex) })
  );
  return container.textContent;
}

export function postConditionText(
  hex: string,
  stacksAddress: string,
  isContractPrincipal: boolean,
  context: 'transfer' | 'stake'
) {
  const postCondition = Codec.Raw.PostCondition.decode(hex);
  if (postCondition.type === 'pox-postcondition') {
    return formatPoxPostConditionMessage({ stacksAddress, isContractPrincipal, postCondition });
  }
  return formatPostConditionMessage({
    stacksAddress,
    isContractPrincipal,
    postCondition,
    context,
  });
}
