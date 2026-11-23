import { deserializeCV, serializeCV } from '@stacks/transactions';
import { expect, vi } from 'vitest';
import z from 'zod';

import type { AccountAddresses } from '@leather.io/models';
import { createMoney } from '@leather.io/utils';

import type { FungibleAssetService } from '../../../assets/fungible-asset.service';
import type { HiroStacksApiClient } from '../../../infrastructure/api/hiro/hiro-stacks-api.client';
import type { LeatherApiClient } from '../../../infrastructure/api/leather/leather-api.client';
import type { SettingsService } from '../../../infrastructure/settings/settings.service';
import type { MarketDataService } from '../../../market/market-data.service';
import { createTestUserSettings } from '../../../test/balances-settings';
import { createMock } from '../../../test/create-mock';
import { createTestSip10Asset } from '../../../test/swap-fixtures';
import { GraniteV1BorrowService } from '../granite/granite-v1-borrow.service';
import { GraniteV1EarnService } from '../granite/granite-v1-earn.service';
import { ZestBorrowService } from '../zest/zest-borrow.service';
import { StackingDaoLstService } from './stacking-dao-lst.service';

export const yieldConsumerVectorSchema = z.object({
  id: z.string(),
  input: z.object({
    kind: z.string(),
    address: z.string().optional(),
    responses: z.record(z.string(), z.string()),
    lst: z.enum(['ststx', 'ststxbtc']),
    nfts: z.array(z.object({ assetIdentifier: z.string(), hex: z.string() })),
    burnHeight: z.number().optional(),
    priceMicroUsd: z.string(),
    borrowApy: z.number(),
    earnApy: z.number(),
    zTokenPrincipal: z.string(),
  }),
  expected: z.unknown(),
});

export async function yieldConsumerVector(
  input: z.infer<typeof yieldConsumerVectorSchema>['input']
) {
  const calls: unknown[] = [];
  const signal = new AbortController().signal;
  const hiro = createMock<HiroStacksApiClient>({
    callReadOnlyFunction(args, options) {
      expect(options?.signal).toBe(signal);
      calls.push({ ...args, functionArgs: args.functionArgs.map(serializeCV) });
      const response = input.responses[args.functionName];
      if (response === undefined) throw new Error('Missing fixture response: ' + args.functionName);
      return Promise.resolve(deserializeCV(response));
    },
    getApiStatus: vi.fn().mockResolvedValue({
      chain_tip:
        input.burnHeight === undefined ? undefined : { burn_block_height: input.burnHeight },
    }),
  });
  const assets = createMock<FungibleAssetService>({
    getAsset: vi.fn().mockResolvedValue(createTestSip10Asset()),
  });
  const market = createMock<MarketDataService>({
    getMarketData(asset) {
      return Promise.resolve({
        pair: { base: asset.symbol, quote: 'USD' },
        price: createMoney(BigInt(input.priceMicroUsd), 'USD', 6),
      });
    },
  });
  const leather = createMock<LeatherApiClient>({
    fetchGraniteMarket: vi
      .fn()
      .mockResolvedValue({ borrowApy: input.borrowApy, earnApy: input.earnApy }),
    fetchZestReserve: vi.fn().mockResolvedValue({
      borrowRate: input.borrowApy,
      supplyRate: input.earnApy,
      zTokenPrincipal: input.zTokenPrincipal,
    }),
  });
  const settings = createMock<SettingsService>({
    getSettings() {
      return createTestUserSettings();
    },
  });
  const account: AccountAddresses = {
    id: { fingerprint: '000f25e8', accountIndex: 0 },
    stacks: input.address === undefined ? undefined : { stxAddress: input.address },
  };
  async function run() {
    if (input.kind === 'graniteBorrow') {
      return new GraniteV1BorrowService(
        hiro,
        assets,
        market,
        leather,
        settings
      ).getAccountPositions(account, signal);
    }
    if (input.kind === 'graniteEarn') {
      return new GraniteV1EarnService(hiro, assets, market, leather).getAccountPositions(
        account,
        signal
      );
    }
    if (input.kind === 'zest') {
      return new ZestBorrowService(hiro, assets, market, leather, settings).getAccountPositions(
        account,
        signal
      );
    }
    const dao = new StackingDaoLstService(leather, hiro, assets, market);
    if (input.kind === 'reward') {
      if (input.address === undefined) throw new Error('Missing reward vector address');
      return dao.getSbtcReward(input.address, signal);
    }
    return dao.getLstWithdrawals(
      input.lst,
      input.nfts.map(nft => ({
        asset_identifier: nft.assetIdentifier,
        value: { hex: nft.hex, repr: '' },
      })),
      signal
    );
  }
  try {
    const result = await run();
    return { result: result === undefined ? { undefined: true } : result, calls };
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    return { error: error.message, calls };
  }
}
