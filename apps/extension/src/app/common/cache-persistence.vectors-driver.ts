import { deserializeCV, deserializeTransaction, serializeCV } from '@stacks/transactions';
import { dehydrate } from '@tanstack/react-query';
import type * as Persistence from '@tanstack/react-query-persist-client';
import { BigNumber } from 'bignumber.js';
import { vi } from 'vitest';
import { z } from 'zod';

import { clarityValueSchema } from '@leather.io/rpc';

import { persistAndRenderApp, queryClient } from './persistence';

const bridge = vi.hoisted(() => {
  const options: Parameters<typeof Persistence.persistQueryClient>[0][] = [];
  const runs: ReturnType<typeof Persistence.persistQueryClient>[] = [];
  return { options, runs };
});
vi.mock('@tanstack/react-query-persist-client', async importOriginal => {
  const actual = await importOriginal<typeof Persistence>();
  return {
    ...actual,
    persistQueryClient(options: Parameters<typeof Persistence.persistQueryClient>[0]) {
      bridge.options.push(options);
      const result = actual.persistQueryClient(options);
      bridge.runs.push(result);
      return result;
    },
  };
});
vi.mock('@shared/environment', () => ({ IS_TEST_ENV: false }));
vi.mock('@shared/logger', () => ({ logger: { error: vi.fn() } }));
vi.mock('@shared/utils/analytics', () => ({
  analytics: { track: vi.fn(), untypedTrack: vi.fn() },
}));

const loadedSchema = z.object({
  rawTx: z.string(),
  cv: clarityValueSchema,
  balance: z.bigint(),
  amount: z.instanceof(BigNumber),
  poxAddress: z.instanceof(Uint8Array),
});

export async function persistAndRestore(existing: string, rawTx: string, cvHex: string) {
  vi.useFakeTimers();
  vi.setSystemTime(1700000000000);
  vi.stubGlobal('VERSION', 'stacks-vector');
  queryClient.clear();
  bridge.options.length = 0;
  bridge.runs.length = 0;
  try {
    persistAndRenderApp(() => Promise.resolve());
    const initial = bridge.runs[0];
    const options = bridge.options[0];
    if (!initial || !options) throw new Error('Missing production persister');
    await initial[1];
    initial[0]();
    queryClient.setQueryData(['stacks-vector-cache'], {
      rawTx,
      cv: deserializeCV(cvHex),
      balance: 9007199254740993n,
      amount: new BigNumber('9007199254740993.125'),
      poxAddress: Uint8Array.of(0, 7, 255),
    });
    const saved = options.persister.persistClient({
      buster: 'stacks-vector',
      timestamp: Date.now(),
      clientState: dehydrate(queryClient),
    });
    await vi.advanceTimersByTimeAsync(1100);
    await saved;
    const written = await chrome.storage.local.get('REACT_QUERY_OFFLINE_CACHE');
    queryClient.clear();
    await chrome.storage.local.set({ REACT_QUERY_OFFLINE_CACHE: existing });
    persistAndRenderApp(() => Promise.resolve());
    const restored = bridge.runs[1];
    if (!restored) throw new Error('Missing restore subscription');
    await restored[1];
    restored[0]();
    const loaded = loadedSchema.parse(queryClient.getQueryData(['stacks-vector-cache']));
    const transaction = deserializeTransaction(loaded.rawTx);
    return {
      written: z.string().parse(written.REACT_QUERY_OFFLINE_CACHE),
      loaded: {
        rawTx: transaction.serialize(),
        txid: transaction.txid(),
        clarity: serializeCV(loaded.cv),
        balance: loaded.balance.toString(),
        amount: loaded.amount.toString(),
        poxAddress: Buffer.from(loaded.poxAddress).toString('hex'),
      },
    };
  } finally {
    for (const run of bridge.runs) run[0]();
    queryClient.clear();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  }
}
