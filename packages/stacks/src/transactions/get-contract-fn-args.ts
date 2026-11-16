import { Cl, type ClarityValue } from '@jannik-stacks/kit';

interface GetSip10FnArgs {
  amount: number | string;
  senderStacksAddress: string;
  recipientStacksAddress: string;
  memo?: string;
}

export function createSip10FnArgs({
  amount,
  senderStacksAddress,
  recipientStacksAddress,
  memo,
}: GetSip10FnArgs) {
  const fnArgs: ClarityValue[] = [
    Cl.uint(amount),
    Cl.address(senderStacksAddress),
    Cl.address(recipientStacksAddress),
    memo && memo !== '' ? Cl.some(Cl.buffer(new TextEncoder().encode(memo))) : Cl.none(),
  ];
  return fnArgs;
}

interface GetSip9FnArgs {
  assetId: string;
  senderStacksAddress: string;
  recipientStacksAddress: string;
}
export function createSip9FnArgs({
  assetId,
  senderStacksAddress,
  recipientStacksAddress,
}: GetSip9FnArgs) {
  const fnArgs: ClarityValue[] = [
    Cl.deserialize(assetId),
    Cl.address(senderStacksAddress),
    Cl.address(recipientStacksAddress),
  ];
  return fnArgs;
}

export function decodeClarityArgument(hex: string): ClarityValue {
  if (!/^(?:[0-9a-f]{2})*$/i.test(hex)) throw new Error('Invalid byte sequence');
  const typeByte = hex === '' ? undefined : Number.parseInt(hex.slice(0, 2), 16);
  if (typeByte === undefined || typeByte > 14)
    throw new Error(`Cannot recognize Clarity Type: ${typeByte}`);
  if ((typeByte === 0 || typeByte === 1) && hex.length === 2)
    throw new Error('Cannot convert 0x to a BigInt');
  try {
    return Cl.deserialize(hex);
  } catch (error) {
    if (
      error instanceof Error &&
      (hex.length < 4 ||
        error.message.includes('out of bounds') ||
        error.message.includes('Unexpected end'))
    )
      throw new Error('Cannot recognize Clarity Type: undefined');
    throw error;
  }
}
