import {
  type NonFungiblePostCondition,
  type PostCondition,
  deserializeCV,
  postConditionToHex,
  postConditionToWire,
  serializePostConditionWire,
} from '@stacks/transactions';

import { ensurePostConditionWireFormat, getPostConditionFromString } from './post-condition.utils';

export function condition(input: PostCondition) {
  const hex = postConditionToHex(input);
  return {
    hex,
    fromObject: serializePostConditionWire(ensurePostConditionWireFormat(input)),
    fromHex: serializePostConditionWire(getPostConditionFromString(hex)),
    fromWire: serializePostConditionWire(ensurePostConditionWireFormat(postConditionToWire(input))),
  };
}
export function malformed(hex: string) {
  try {
    return getPostConditionFromString(hex);
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    return { error: error.message };
  }
}

export function nft(input: Omit<NonFungiblePostCondition, 'assetId'> & { assetId: string }) {
  return condition({ ...input, assetId: deserializeCV(input.assetId) });
}
