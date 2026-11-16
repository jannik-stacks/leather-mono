import { Cl, type ClarityValue } from '@jannik-stacks/kit';

import { clarityValueToJson, formatClarityValue } from '../clarity-format';
import { createSip9FnArgs, createSip10FnArgs, decodeClarityArgument } from './get-contract-fn-args';

function observe(value: ClarityValue) {
  const json: unknown = clarityValueToJson(value);
  return { hex: Cl.serialize(value), json, repr: formatClarityValue(value) };
}
export function sip10(input: Parameters<typeof createSip10FnArgs>[0]) {
  return createSip10FnArgs(input).map(observe);
}
export function sip9(input: Parameters<typeof createSip9FnArgs>[0]) {
  return createSip9FnArgs(input).map(observe);
}
export function decode(hex: string) {
  try {
    return observe(decodeClarityArgument(hex));
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    return { error: error.message };
  }
}
