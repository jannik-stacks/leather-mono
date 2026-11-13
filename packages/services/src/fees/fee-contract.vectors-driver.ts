import { deserializeTransaction } from '@stacks/transactions';

import type { StacksFeeConfig } from '../infrastructure/app-config/app-config.service';
import { createHiroFeeEstimateResponse } from '../test/fees-stacks-transactions';
import {
  createStacksTransactionFeeQuote,
  getStacksMinimumFeeAmount,
  getStacksTxFeeBoundedEstimates,
  getStacksTxFeeDefaultAmounts,
  getStacksTxPayloadTypeFees,
} from './stacks-transaction-fees.utils';

export function fees(hex: string, config: StacksFeeConfig, size: number, estimates: number[]) {
  const tx = deserializeTransaction(hex);
  return {
    type: getStacksTxPayloadTypeFees(tx, config),
    defaults: getStacksTxFeeDefaultAmounts(tx, config, size),
    minimum: getStacksMinimumFeeAmount(size, config),
    bounded: getStacksTxFeeBoundedEstimates(
      createHiroFeeEstimateResponse({ estimations: estimates.map(fee => ({ fee })) }),
      size,
      tx,
      config
    ),
    quote: createStacksTransactionFeeQuote(1500, size),
  };
}
