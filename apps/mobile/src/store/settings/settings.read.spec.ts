import { ChainId, TransactionVersion } from '@stacks/network';
import { describe, expect, test } from 'vitest';

import { type NetworkConfiguration, defaultNetworksKeyedById } from '@leather.io/models';

import { getStacksNetworkFromNetworkConfig } from './settings.read';

const customChainIdNetwork: NetworkConfiguration = {
  id: 'private',
  name: 'Private',
  chain: {
    stacks: {
      blockchain: 'stacks',
      url: 'https://api.private-1.hiro.so',
      chainId: 256,
    },
    bitcoin: {
      blockchain: 'bitcoin',
      bitcoinUrl: 'https://mempool.bitcoin.private-1.hiro.so/api',
      bitcoinNetwork: 'regtest',
      mode: 'regtest',
    },
  },
};

describe(getStacksNetworkFromNetworkConfig.name, () => {
  test('that it returns a mainnet network for the mainnet configuration', () => {
    const network = getStacksNetworkFromNetworkConfig(defaultNetworksKeyedById.mainnet);
    expect(network.chainId).toEqual(ChainId.Mainnet);
    expect(network.transactionVersion).toEqual(TransactionVersion.Mainnet);
  });

  test('that it returns a testnet network for the testnet configuration', () => {
    const network = getStacksNetworkFromNetworkConfig(defaultNetworksKeyedById.testnet);
    expect(network.chainId).toEqual(ChainId.Testnet);
    expect(network.transactionVersion).toEqual(TransactionVersion.Testnet);
  });

  test('that it preserves an unknown custom chain id and falls back to testnet behavior instead of throwing', () => {
    expect(() => getStacksNetworkFromNetworkConfig(customChainIdNetwork)).not.toThrow();
    const network = getStacksNetworkFromNetworkConfig(customChainIdNetwork);
    expect(network.chainId).toEqual(256);
    expect(network.transactionVersion).toEqual(TransactionVersion.Testnet);
    expect(network.client.baseUrl).toEqual('https://api.private-1.hiro.so');
  });
});

test('loads persisted numeric chain IDs and subnets without changing the parent transaction version', () => {
  const observed = [
    { chainId: 1 },
    { chainId: 2147483648 },
    { chainId: 1, subnetChainId: 456 },
    { chainId: 2147483648, subnetChainId: 789 },
  ].map(chain => {
    const network = getStacksNetworkFromNetworkConfig({
      ...customChainIdNetwork,
      chain: {
        ...customChainIdNetwork.chain,
        stacks: { ...customChainIdNetwork.chain.stacks, ...chain },
      },
    });
    return { chainId: network.chainId, transactionVersion: network.transactionVersion };
  });
  expect(observed).toEqual([
    { chainId: 1, transactionVersion: 0 },
    { chainId: 2147483648, transactionVersion: 128 },
    { chainId: 456, transactionVersion: 0 },
    { chainId: 789, transactionVersion: 128 },
  ]);
});
