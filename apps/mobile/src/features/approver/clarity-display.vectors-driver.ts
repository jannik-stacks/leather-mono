import { Fragment, type ReactNode, createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { Cl, Codec } from '@jannik-stacks/kit';
import { vi } from 'vitest';

import { ClarityValueListDisplayer } from './clarity-value.section';
import {
  formatPostConditionMessage,
  formatPoxPostConditionMessage,
} from './components/post-conditions/post-conditions.utils';

vi.mock('@lingui/core/macro', () => ({
  t(strings: TemplateStringsArray, ...values: unknown[]) {
    return String.raw(strings, ...values);
  },
}));

vi.mock('@leather.io/ui/native', () => ({
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
