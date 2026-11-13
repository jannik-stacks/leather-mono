import { StackingClient } from '@stacks/stacking';
import { hashKey } from '@tanstack/react-query';
import { z } from 'zod';

import {
  createGetAccountExtendedBalancesQueryOptions,
  createGetCoreInfoQueryOptions,
  createGetPoxInfoQueryOptions,
  createGetSecondsUntilNextCycleQueryOptions,
  createGetStatusQueryOptions,
} from './create-stacking-client-query-options';

export async function queryOutputs(
  network: 'mainnet' | 'testnet',
  responses: Record<string, unknown>,
  readOnlyHex: string
) {
  const requests: { url: string; body: string | null }[] = [];
  const client = new StackingClient({
    address: 'ST000000000000000000002AMW42H',
    network,
    client: {
      baseUrl: 'https://stacks.example',
      fetch(input, init) {
        const url = new URL(input);
        requests.push({
          url: url.toString(),
          body: z
            .string()
            .nullable()
            .parse(init?.body ?? null),
        });
        if (url.pathname.endsWith('/get-stacker-info')) {
          return Promise.resolve(Response.json({ okay: true, result: readOnlyHex }));
        }
        const response = responses[url.pathname];
        if (response === undefined) throw new Error('Unexpected fixture request: ' + url.pathname);
        return Promise.resolve(Response.json(response));
      },
    },
  });
  const options = [
    createGetStatusQueryOptions({ client }),
    createGetCoreInfoQueryOptions({ client }),
    createGetSecondsUntilNextCycleQueryOptions({ client }),
    createGetPoxInfoQueryOptions({ client }),
    createGetAccountExtendedBalancesQueryOptions({ client }),
  ];
  const results = [];
  for (const option of options) {
    try {
      results.push({ cacheKey: hashKey(option.queryKey), value: await option.queryFn() });
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      results.push({ cacheKey: hashKey(option.queryKey), error: error.message });
    }
  }
  return { results, contract: await client.getStackingContract(), requests };
}
