import { isMainnet, isTestnet } from '@jannik-stacks/kit';
import { describe, expect, test } from 'vitest';

import {
  ChainId,
  type NetworkConfiguration,
  defaultNetworksKeyedById,
  networkConfigurationSchema,
} from '@leather.io/models';

import { getStacksNetworkFromName, getStacksNetworkFromNetworkConfig } from './settings.read';

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
    expect(isMainnet(network)).toEqual(true);
  });

  test('that it returns a testnet network for the testnet configuration', () => {
    const network = getStacksNetworkFromNetworkConfig(defaultNetworksKeyedById.testnet);
    expect(network.chainId).toEqual(ChainId.Testnet);
    expect(isTestnet(network)).toEqual(true);
  });

  test('that it preserves an unknown custom chain id and falls back to testnet behavior instead of throwing', () => {
    expect(() => getStacksNetworkFromNetworkConfig(customChainIdNetwork)).not.toThrow();
    const network = getStacksNetworkFromNetworkConfig(customChainIdNetwork);
    expect(network.chainId).toEqual(256);
    expect(isTestnet(network)).toEqual(true);
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
    const storedNetwork = JSON.stringify({
      ...customChainIdNetwork,
      chain: {
        ...customChainIdNetwork.chain,
        stacks: { ...customChainIdNetwork.chain.stacks, ...chain },
      },
    });
    const network = getStacksNetworkFromNetworkConfig(
      networkConfigurationSchema.parse(JSON.parse(storedNetwork))
    );
    expect(network.client.baseUrl).toEqual(customChainIdNetwork.chain.stacks.url);
    return {
      chainId: network.chainId,
      transactionVersion: network.version === 'mainnet' ? 0 : 128,
    };
  });
  expect(observed).toEqual([
    { chainId: 1, transactionVersion: 0 },
    { chainId: 2147483648, transactionVersion: 128 },
    { chainId: 456, transactionVersion: 0 },
    { chainId: 789, transactionVersion: 128 },
  ]);
});

test('keeps the named testnet on testnet4 and rejects unsupported RPC networks', () => {
  expect(getStacksNetworkFromName('mainnet').client.baseUrl).toEqual(
    defaultNetworksKeyedById.mainnet.chain.stacks.url
  );
  expect(getStacksNetworkFromName('testnet').client.baseUrl).toEqual(
    defaultNetworksKeyedById.testnet4.chain.stacks.url
  );
  expect(() => getStacksNetworkFromName('devnet')).toThrow(
    'This network is currently not supported'
  );
  expect(() => getStacksNetworkFromName('mocknet')).toThrow(
    'This network is currently not supported'
  );
});
