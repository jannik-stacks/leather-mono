import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { deserializeCV } from '@stacks/transactions';
import { vi } from 'vitest';

import { defaultNetworksKeyedById } from '@leather.io/models';

import { FunctionArgumentList } from '@app/features/rpc-stacks-transaction-request/stacks/contract-call/function-arguments/function-argument-list';

import { ClarityValueListDisplayer } from './clarity-value-list';

vi.mock('@app/store/networks/networks.hooks', () => ({
  useCurrentNetworkState() {
    return { ...defaultNetworksKeyedById.mainnet, isNakamotoTestnet: false };
  },
}));

export function display(hex: string, encoding: 'tryAscii' | 'hex') {
  const container = document.createElement('div');
  container.innerHTML = renderToStaticMarkup(
    createElement(ClarityValueListDisplayer, { val: deserializeCV(hex), encoding })
  );
  return container.textContent;
}

export function functionArgument(hex: string) {
  const container = document.createElement('div');
  container.innerHTML = renderToStaticMarkup(
    createElement(FunctionArgumentList, {
      fn: {
        name: 'vector',
        access: 'public',
        args: [{ name: 'argument', type: 'uint128' }],
        outputs: { type: 'bool' },
      },
      fnArgs: [hex],
    })
  );
  return container.textContent;
}
