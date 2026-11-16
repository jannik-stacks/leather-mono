import { Codec, type PostCondition } from '@jannik-stacks/kit';

import { isString } from '@leather.io/utils';

export function getPostConditionFromString(postCondition: string): PostCondition {
  try {
    return Codec.Raw.PostCondition.decode(postCondition);
  } catch {
    throw new Error('Not a serialized post condition');
  }
}
export function getPostCondition(postCondition: string | PostCondition): PostCondition {
  return isString(postCondition) ? getPostConditionFromString(postCondition) : postCondition;
}
export function getPostConditions(postConditions?: (string | PostCondition)[]) {
  return postConditions?.map(getPostCondition);
}
