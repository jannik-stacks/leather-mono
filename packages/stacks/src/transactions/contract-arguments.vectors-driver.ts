import {
  type ClarityValue,
  cvToJSON,
  cvToString,
  deserializeCV,
  serializeCV,
} from '@stacks/transactions';

import { createSip9FnArgs, createSip10FnArgs } from './get-contract-fn-args';

function observe(value: ClarityValue) {
  const json: unknown = cvToJSON(value);
  return { hex: serializeCV(value), json, repr: cvToString(value) };
}
export function sip10(input: Parameters<typeof createSip10FnArgs>[0]) {
  return createSip10FnArgs(input).map(observe);
}
export function sip9(input: Parameters<typeof createSip9FnArgs>[0]) {
  return createSip9FnArgs(input).map(observe);
}
export function decode(hex: string) {
  try {
    return observe(deserializeCV(hex));
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    return { error: error.message };
  }
}
