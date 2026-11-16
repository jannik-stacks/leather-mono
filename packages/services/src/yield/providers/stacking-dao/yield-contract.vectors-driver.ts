import { deserializeCV, serializeCV } from '@stacks/transactions';
import { vi } from 'vitest';

import type { FungibleAssetService } from '../../../assets/fungible-asset.service';
import type { HiroStacksApiClient } from '../../../infrastructure/api/hiro/hiro-stacks-api.client';
import type { LeatherApiClient } from '../../../infrastructure/api/leather/leather-api.client';
import type { MarketDataService } from '../../../market/market-data.service';
import { createMock } from '../../../test/create-mock';
import { StackingDaoLstService } from './stacking-dao-lst.service';

export async function reward(address: string, response: string) {
  const calls: unknown[] = [];
  const service = new StackingDaoLstService(
    createMock<LeatherApiClient>({}),
    createMock<HiroStacksApiClient>({
      callReadOnlyFunction(args) {
        calls.push({ ...args, functionArgs: args.functionArgs.map(serializeCV) });
        return Promise.resolve(deserializeCV(response));
      },
    }),
    createMock<FungibleAssetService>({
      getAsset: vi.fn().mockResolvedValue({ symbol: 'sBTC', decimals: 8 }),
    }),
    createMock<MarketDataService>({})
  );
  try {
    const result = await service.getSbtcReward(address);
    return { result, calls };
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    return { error: error.message, calls };
  }
}
