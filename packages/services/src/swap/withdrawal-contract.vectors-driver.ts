import { postConditionToHex, serializeCV } from '@stacks/transactions';

import { createMoney } from '@leather.io/utils';

import { getSbtcWithdrawalContractCallData } from './sbtc-bridge-swap-provider.utils';

export function withdrawal(
  stxAddress: string,
  withdrawalBtcAddress: string,
  amount: number,
  fee: number,
  network: 'mainnet' | 'testnet'
) {
  try {
    const result = getSbtcWithdrawalContractCallData({
      stxAddress,
      withdrawalBtcAddress,
      quoteAmount: createMoney(amount, 'sBTC'),
      withdrawalSweepTxFee: fee,
      network,
    });
    return {
      ...result,
      functionArgs: result.functionArgs.map(serializeCV),
      postConditions: result.postConditions.map(postConditionToHex),
    };
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    return { error: error.message };
  }
}
