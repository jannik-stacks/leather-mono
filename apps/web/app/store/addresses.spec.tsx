// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';

import { Provider, createStore } from 'jotai';
import { type WalletAddressEntry } from '~/utils/wallet-addresses';

import { ChainId } from '@leather.io/models';

import type * as StoredWallet from '../utils/wallet';
import { useDetectLeatherProvider, useLeatherConnect } from './addresses';
import type * as StoredStacksNetwork from './stacks-network';

interface WalletMockState {
  selectedWalletId: string | null;
}

const { walletMock } = vi.hoisted(() => {
  const state: WalletMockState = { selectedWalletId: null };
  return {
    walletMock: {
      state,
      leatherProviderId: 'LeatherProvider',
      getConnectedWalletId: vi.fn(() => state.selectedWalletId),
      markLeatherAsSelectedWallet: vi.fn(() => {
        state.selectedWalletId = 'LeatherProvider';
      }),
      connectWallet: vi.fn(),
      disconnectWallet: vi.fn(),
      revokeWalletPermissions: vi.fn(),
    },
  };
});

vi.mock('~/utils/wallet', () => walletMock);

vi.mock('~/utils/utils', () => ({
  isAnyWalletInstalled: () => true,
  whenExtensionState: () => () => undefined,
}));

vi.mock('~/utils/analytics/analytics', () => ({
  analytics: { untypedTrack: vi.fn(), track: vi.fn() },
}));

vi.mock('~/utils/leather-sdk', () => ({
  leather: {},
}));

vi.mock('~/utils/wallet-addresses', () => ({
  normalizeWalletAddresses() {
    throw new Error('Address normalization is outside the provider-storage vector');
  },
}));

vi.mock('~/features/toasts/use-toast', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }),
}));

const { stacksNetworkState } = vi.hoisted(() => ({
  stacksNetworkState: { chainId: 0 },
}));

vi.mock('./stacks-network', () => ({
  useStacksNetwork: () => ({ network: stacksNetworkState }),
}));

function Probe() {
  useDetectLeatherProvider();
  const { isLeatherWallet } = useLeatherConnect();
  return <span>{isLeatherWallet ? 'leather' : 'not-leather'}</span>;
}

let connectFn: (() => Promise<unknown>) | undefined;

function ConnectProbe() {
  const { connect } = useLeatherConnect();
  connectFn = connect;
  return null;
}

let setAddressesFn: ((entries: WalletAddressEntry[]) => void) | undefined;

function BtcAccountProbe() {
  const { btcAccount, setAddresses } = useLeatherConnect();
  setAddressesFn = setAddresses;
  return <span>{JSON.stringify(btcAccount.bitcoin ?? null)}</span>;
}

beforeAll(() => {
  Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', true);
});

test('loads every stored Stacks network name with literal chain, version and API settings', async () => {
  const { useStacksNetwork } =
    await vi.importActual<typeof StoredStacksNetwork>('./stacks-network');
  function NetworkProbe() {
    const state = useStacksNetwork();
    return (
      <span>
        {JSON.stringify({
          name: state.networkName,
          chainId: state.network.chainId,
          transactionVersion: state.network.transactionVersion,
          baseUrl: state.network.client.baseUrl,
          mode: state.networkInstance,
          preference: state.networkPreference?.id,
        })}
      </span>
    );
  }
  const observed = [];
  for (const name of ['mainnet', 'testnet', 'mocknet', 'devnet']) {
    localStorage.setItem('network', JSON.stringify(name));
    const container = document.createElement('div');
    const root = createRoot(container);
    act(() =>
      root.render(
        <Provider store={createStore()}>
          <NetworkProbe />
        </Provider>
      )
    );
    observed.push(container.textContent);
    act(() => root.unmount());
  }
  expect(observed).toEqual([
    '{"name":"mainnet","chainId":1,"transactionVersion":0,"baseUrl":"https://api.mainnet.hiro.so","mode":"mainnet","preference":"mainnet"}',
    '{"name":"testnet","chainId":2147483648,"transactionVersion":128,"baseUrl":"https://api.testnet.hiro.so","mode":"testnet","preference":"testnet"}',
    '{"name":"mocknet","chainId":2147483648,"transactionVersion":128,"baseUrl":"http://localhost:3999","mode":"devnet","preference":"testnet"}',
    '{"name":"devnet","chainId":2147483648,"transactionVersion":128,"baseUrl":"http://localhost:3999","mode":"devnet","preference":"devnet"}',
  ]);
});

test('loads and clears the actual SDK selected-provider storage key', async () => {
  vi.stubEnv('MODE', 'development');
  try {
    const actual = await vi.importActual<typeof StoredWallet>('~/utils/wallet');
    localStorage.setItem('STX_PROVIDER', 'VendorProvider');
    expect(actual.getConnectedWalletId()).toEqual('VendorProvider');
    actual.markLeatherAsSelectedWallet();
    expect(localStorage.getItem('STX_PROVIDER')).toEqual('LeatherProvider');
    expect(actual.getConnectedWalletId()).toEqual('LeatherProvider');
    actual.disconnectWallet();
    expect(localStorage.getItem('STX_PROVIDER')).toBeNull();
    expect(actual.getConnectedWalletId()).toBeNull();
  } finally {
    vi.unstubAllEnvs();
  }
});

describe('useLeatherConnect isLeatherWallet reactivity', () => {
  test('legacy sessions without a stored provider id become leather-gated after mount', () => {
    localStorage.setItem(
      'addresses',
      JSON.stringify([
        { symbol: 'STX', address: 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7', kind: 'single-sig' },
      ])
    );

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(<Probe />);
    });

    expect(walletMock.markLeatherAsSelectedWallet).toHaveBeenCalled();
    expect(container.textContent).toBe('leather');

    act(() => {
      root.unmount();
    });
    container.remove();
  });
});

describe('btcAccount for wallets without descriptors', () => {
  test('falls back to a fixedAddress account from the payment address', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => {
      root.render(<BtcAccountProbe />);
    });
    act(() => {
      setAddressesFn?.([
        { symbol: 'STX', address: 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7' },
        { symbol: 'BTC', address: '3P14159f73E4gFr7JterCCQh9QjiTjiZrG', type: 'p2sh' },
      ]);
    });

    expect(container.textContent).toBe(
      JSON.stringify({
        type: 'fixedAddress',
        address: '3P14159f73E4gFr7JterCCQh9QjiTjiZrG',
        paymentType: 'p2sh',
      })
    );

    act(() => {
      root.unmount();
    });
    container.remove();
  });
});

describe('completeZealyConnectTask gating', () => {
  const stxAddress = 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7';
  const fetchMock = vi.fn();

  async function connectWith(walletId: string) {
    walletMock.state.selectedWalletId = walletId;
    walletMock.connectWallet.mockResolvedValue({
      status: 'connected',
      addresses: [{ symbol: 'STX', address: stxAddress, kind: 'single-sig' }],
    });

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => {
      root.render(<ConnectProbe />);
    });
    await act(async () => {
      await connectFn?.();
    });
    act(() => {
      root.unmount();
    });
    container.remove();
  }

  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({});
    vi.stubGlobal('fetch', fetchMock);
    stacksNetworkState.chainId = ChainId.Mainnet;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('does not post to the quests api for non-leather wallets', async () => {
    await connectWith('XverseProviders.BitcoinProvider');

    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('posts the connected address for leather', async () => {
    await connectWith('LeatherProvider');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.leather.io/v1/quests/connect-earn/complete',
      expect.objectContaining({ body: JSON.stringify({ address: stxAddress }) })
    );
  });
});
