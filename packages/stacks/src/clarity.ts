import { type ClarityValue } from '@jannik-stacks/kit';

export function parseClarityUintResponse(response: ClarityValue): bigint {
  if (response.type === 'ok' && response.value.type === 'uint') {
    return BigInt(response.value.value);
  } else if (response.type === 'uint') {
    return BigInt(response.value);
  }
  throw new Error('Invalid Clarity response format');
}

export function isClarityTuple(cv: ClarityValue) {
  return cv.type === 'tuple';
}

export function isClarityResponseOk(cv: ClarityValue) {
  return cv.type === 'ok';
}

export function isClarityResponseError(cv: ClarityValue) {
  return cv.type === 'err';
}

export function isClarityUInt(cv: ClarityValue) {
  return cv.type === 'uint';
}

export function isClarityList(cv: ClarityValue) {
  return cv.type === 'list';
}

export function isClarityPrincipal(cv: ClarityValue) {
  return cv.type === 'address' || cv.type === 'contract';
}

export function isClarityOptionalNone(cv: ClarityValue) {
  return cv.type === 'none';
}

export function isClarityOptionalSome(cv: ClarityValue) {
  return cv.type === 'some';
}

export function getClarityPrincipal(
  cv: Extract<ClarityValue, { type: 'address' | 'contract' }>
): string {
  return cv.value;
}
