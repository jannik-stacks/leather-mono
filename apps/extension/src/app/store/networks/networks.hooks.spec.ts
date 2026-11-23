import { ChainId, STACKS_MAINNET, STACKS_TESTNET } from '@stacks/network';

import { getStacksNetworkFromChainId } from '@app/store/networks/networks.hooks';

import { readStoredNetwork } from './network-read.vectors-driver';

describe(getStacksNetworkFromChainId.name, () => {
  test('that it returns the mainnet network for the mainnet chain id', () => {
    expect(getStacksNetworkFromChainId(ChainId.Mainnet)).toEqual(STACKS_MAINNET);
  });

  test('that it returns the testnet network for the testnet chain id', () => {
    expect(getStacksNetworkFromChainId(ChainId.Testnet)).toEqual(STACKS_TESTNET);
  });

  test('that it returns the testnet network for an unknown custom chain id instead of throwing', () => {
    expect(() => getStacksNetworkFromChainId(256)).not.toThrow();
    expect(getStacksNetworkFromChainId(256)).toEqual(STACKS_TESTNET);
  });
});

test('loads persisted numeric parent and subnet chain IDs into signing network settings', () => {
  const records = [
    { chainId: 1 },
    { chainId: 2147483648 },
    { chainId: 1, subnetChainId: 456 },
    { chainId: 2147483648, subnetChainId: 789 },
  ];
  expect(
    records.map(chain =>
      readStoredNetwork({
        ...chain,
        id: 'stored-network',
        name: 'Stored network',
        url: 'https://stacks.example',
        bitcoinUrl: 'https://bitcoin.example',
        bitcoinNetwork: 'regtest',
        mode: 'testnet',
      })
    )
  ).toEqual([
    {
      chainId: 1,
      transactionVersion: 0,
      baseUrl: 'https://stacks.example',
      bnsLookupUrl: 'https://stacks.example',
    },
    {
      chainId: 2147483648,
      transactionVersion: 128,
      baseUrl: 'https://stacks.example',
      bnsLookupUrl: 'https://stacks.example',
    },
    {
      chainId: 456,
      transactionVersion: 0,
      baseUrl: 'https://stacks.example',
      bnsLookupUrl: 'https://stacks.example',
    },
    {
      chainId: 789,
      transactionVersion: 128,
      baseUrl: 'https://stacks.example',
      bnsLookupUrl: 'https://stacks.example',
    },
  ]);
});
