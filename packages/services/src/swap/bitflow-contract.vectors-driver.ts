import { postConditionToHex, serializeCV } from '@stacks/transactions';
import z from 'zod';

import {
  convertBffApiPostConditions,
  convertBffApiSimpleSwapToFunctionArgs,
} from './bitflow-bff-api-swap-provider.utils';

export const bitflowVectorSchema = z.object({
  id: z.string(),
  input: z.object({
    kind: z.string(),
    sender: z.string(),
    postConditions: z.array(
      z.object({
        amount: z.string(),
        sender_address: z.string(),
        condition_code: z.string(),
        token_contract: z.string(),
        token_decimals: z.number(),
        token_asset_name: z.string(),
        post_condition_type: z.string(),
      })
    ),
    swaps: z.array(
      z.object({
        pool_trait: z.string(),
        x_token_trait: z.string(),
        y_token_trait: z.string(),
        amount: z.string(),
        min_received: z.string(),
        x_for_y: z.boolean(),
        max_steps: z.number(),
      })
    ),
  }),
  expected: z.unknown(),
});

export function bitflowVector(input: z.infer<typeof bitflowVectorSchema>['input']) {
  try {
    if (input.kind === 'postConditions') {
      return {
        hex: convertBffApiPostConditions(input.postConditions, input.sender).map(
          postConditionToHex
        ),
      };
    }
    return { hex: convertBffApiSimpleSwapToFunctionArgs(input.swaps).map(serializeCV) };
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    return { error: error.message };
  }
}
