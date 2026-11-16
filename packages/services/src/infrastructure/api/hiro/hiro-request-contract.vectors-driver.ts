import { Cl } from '@jannik-stacks/kit';
import axios, { type AxiosInstance } from 'axios';
import { vi } from 'vitest';

import { defaultNetworksKeyedById } from '@leather.io/models';
import { clarityValueToJson } from '@leather.io/stacks';

import { createMock } from '../../../test/create-mock';
import { type HttpCacheService } from '../../cache/http-cache.service';
import { type RateLimiterService } from '../../rate-limiter/rate-limiter.service';
import { HiroStacksApiClient } from './hiro-stacks-api.client';

export async function read(
  input: {
    contractAddress: string;
    contractName: string;
    functionName: string;
    senderAddress: string;
    args: string[];
  },
  response: unknown,
  payload: string,
  size: number | null
) {
  const post = vi.fn().mockResolvedValue({ data: response });
  const get = vi.fn().mockResolvedValue({ data: 2 });
  const spy = vi.spyOn(axios, 'create').mockReturnValue(createMock<AxiosInstance>({ post, get }));
  const cacheKeys: unknown[] = [];
  const cache = createMock<HttpCacheService>({
    fetchWithCache(key, fn) {
      cacheKeys.push(key);
      return fn();
    },
  });
  const limiter = createMock<RateLimiterService>({
    add(_type, fn) {
      return fn();
    },
  });
  const client = new HiroStacksApiClient(
    cache,
    {
      getSettings() {
        return {
          network: defaultNetworksKeyedById.mainnet,
          quoteCurrency: 'USD',
          assetVisibility: {},
        };
      },
    },
    limiter
  );
  try {
    const value = await client.callReadOnlyFunction(
      { ...input, functionArgs: input.args.map(Cl.deserialize) },
      {}
    );
    await client.getTransactionFeeEstimate(payload, size, { skipCache: true });
    const transferRate = await client.getTransferFeeRate();
    const json: unknown = clarityValueToJson(value);
    return {
      hex: Cl.serialize(value),
      json,
      transferRate,
      post: post.mock.calls,
      get: get.mock.calls,
      cacheKeys,
    };
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    return { error: error.message, post: post.mock.calls, cacheKeys };
  } finally {
    spy.mockRestore();
  }
}
