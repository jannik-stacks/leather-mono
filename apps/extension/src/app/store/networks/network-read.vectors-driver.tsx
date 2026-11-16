import type { ReactNode } from 'react';
import { Provider } from 'react-redux';

import { renderHook } from '@testing-library/react';
import { z } from 'zod';

import { store } from '@app/store/store';

import { useCurrentStacksNetworkState } from './networks.hooks';
import { type PersistedNetworkConfiguration, networksSlice } from './networks.slice';

export function readStoredNetwork(record: PersistedNetworkConfiguration) {
  store.dispatch(networksSlice.actions.addNetwork(record));
  store.dispatch(networksSlice.actions.changeNetwork(record.id));
  function Wrapper({ children }: { children: ReactNode }) {
    return <Provider store={store}>{children}</Provider>;
  }
  const hook = renderHook(() => useCurrentStacksNetworkState(), { wrapper: Wrapper });
  try {
    const network = hook.result.current;
    return {
      chainId: network.chainId,
      transactionVersion: network.transactionVersion,
      baseUrl: network.client.baseUrl,
      bnsLookupUrl: z.object({ bnsLookupUrl: z.string() }).parse(network).bnsLookupUrl,
    };
  } finally {
    hook.unmount();
    store.dispatch(networksSlice.actions.changeNetwork('mainnet'));
    store.dispatch(networksSlice.actions.removeNetwork(record.id));
  }
}
