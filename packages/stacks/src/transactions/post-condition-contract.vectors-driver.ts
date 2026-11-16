import { Cl, Codec, type PostCondition } from '@jannik-stacks/kit';

import { getPostCondition, getPostConditionFromString } from './post-condition.utils';

export function condition(input: PostCondition) {
  const hex = Codec.Raw.PostCondition.encode(input);
  return {
    hex,
    fromObject: Codec.Raw.PostCondition.encode(getPostCondition(input)),
    fromHex: Codec.Raw.PostCondition.encode(getPostConditionFromString(hex)),
    fromWire: Codec.Raw.PostCondition.encode(getPostCondition(input)),
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

export function nft(
  input: Omit<Extract<PostCondition, { type: 'nft-postcondition' }>, 'assetId'> & {
    assetId: string;
  }
) {
  return condition({ ...input, assetId: Cl.deserialize(input.assetId) });
}
