import { type ClarityAbiLike, type ClarityValue, type StacksTransaction } from '@jannik-stacks/kit';

export function isSip9TransferContactCall(tx: StacksTransaction) {
  return (
    tx.type === 'call' &&
    tx.functionName === 'transfer' &&
    tx.args.length === 3 &&
    tx.args[0]?.type === 'uint' &&
    tx.args[1]?.type === 'address' &&
    tx.args[2]?.type === 'address'
  );
}

export function isSip9Transfer({
  functionName,
  contractInterfaceData,
}: {
  functionName: string;
  contractInterfaceData: ClarityAbiLike;
}) {
  if (functionName !== 'transfer') return false;
  const functionInterface = contractInterfaceData?.functions.find(f => f.name === functionName);
  if (
    functionInterface?.args[0]?.name === 'id' &&
    functionInterface?.args[1]?.name === 'from' &&
    functionInterface?.args[2]?.name === 'to'
  ) {
    return true;
  }
  return false;
}

export function getSip9TransferRecipient({
  functionName,
  functionArgs,
  contractInterfaceData,
}: {
  functionName: string;
  functionArgs: ClarityValue[];
  contractInterfaceData: ClarityAbiLike;
}) {
  if (
    isSip9Transfer({ functionName, contractInterfaceData }) &&
    functionArgs[2]?.type === 'address'
  ) {
    return functionArgs[2].value;
  }
  return null;
}
