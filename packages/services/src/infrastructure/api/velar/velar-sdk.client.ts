import {
  Cl,
  type ClarityValue,
  Codec,
  type PostCondition,
  type Transaction,
} from '@jannik-stacks/kit';
import {
  PostConditionMode,
  type ClarityValue as VendorClarityValue,
  type PostCondition as VendorPostCondition,
  postConditionToHex,
  serializeCV,
} from '@stacks/transactions';
import { VelarSDK, getTokensMeta } from '@velarprotocol/velar-sdk';
import { AmountOutResponse, SwapResponse, Token } from '@velarprotocol/velar-sdk/dist/types/Swap';
import { inject, injectable } from 'inversify';

import { generateRandomStacksAddress } from '@leather.io/stacks';

import { Types } from '../../../inversify.types';
import { HttpCacheService } from '../../cache/http-cache.service';

export type VelarSdkToken = Token;
type VelarSdkAmountOutResponse = AmountOutResponse;
type VelarSdkSwapResponse = Omit<
  SwapResponse,
  'functionArgs' | 'postConditions' | 'postConditionMode'
> & {
  functionArgs: ClarityValue[];
  postConditions: PostCondition[];
  postConditionMode: Transaction['postConditionMode'];
};

@injectable()
export class VelarSdkClient {
  private readonly velarSdk: VelarSDK;
  private readonly randomStacksAddress = generateRandomStacksAddress();

  constructor(@inject(Types.CacheService) private readonly cacheService: HttpCacheService) {
    this.velarSdk = new VelarSDK();
  }

  public async getTokens(): Promise<VelarSdkToken[]> {
    return await this.cacheService.fetchWithCache(['velar-sdk-get-tokens'], () => getTokensMeta());
  }

  public async getTokenPairs(baseSymbol: string): Promise<string[]> {
    return await this.cacheService.fetchWithCache(['velar-sdk-get-token-pairs', baseSymbol], () =>
      this.velarSdk.getPairs(baseSymbol)
    );
  }

  public async getComputedAmount(
    inToken: string,
    outToken: string,
    amount: number
  ): Promise<VelarSdkAmountOutResponse> {
    const swapInstance = await this.velarSdk.getSwapInstance({
      account: this.randomStacksAddress,
      inToken,
      outToken,
    });
    return await swapInstance.getComputedAmount({ amount });
  }

  public async getSwap(
    account: string,
    inToken: string,
    outToken: string,
    amount: number,
    slippage: number
  ): Promise<VelarSdkSwapResponse> {
    const swapInstance = await this.velarSdk.getSwapInstance({
      account,
      inToken,
      outToken,
    });
    const tx = await swapInstance.swap({ amount, slippage });
    return {
      ...tx,
      postConditionMode: (
        {
          [PostConditionMode.Allow]: 'allow',
          [PostConditionMode.Deny]: 'deny',
          [PostConditionMode.Originator]: 'originator',
        } satisfies Record<PostConditionMode, NonNullable<Transaction['postConditionMode']>>
      )[tx.postConditionMode],
      functionArgs: tx.functionArgs.map((arg: VendorClarityValue) =>
        Cl.deserialize(serializeCV(arg))
      ),
      postConditions: tx.postConditions.map((pc: VendorPostCondition) =>
        Codec.Raw.PostCondition.decode(postConditionToHex(pc))
      ),
    };
  }
}
