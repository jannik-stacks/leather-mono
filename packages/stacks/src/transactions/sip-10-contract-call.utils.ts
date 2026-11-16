import { type ClarityAbiLike, type ClarityValue, type StacksTransaction } from '@jannik-stacks/kit';
import { hexToBytes } from '@noble/hashes/utils';

import { cleanHex } from '../stacks.utils';

export function isSip10TransferContactCall(tx: StacksTransaction) {
  return (
    tx.type === 'call' &&
    tx.functionName === 'transfer' &&
    (tx.args.length === 3 || tx.args.length === 4) &&
    tx.args[0]?.type === 'uint' &&
    tx.args[1]?.type === 'address' &&
    tx.args[2]?.type === 'address'
  );
}

export interface Sip10TransferDetails {
  contractId: string;
  assetName: string;
  amount: bigint;
  sender: string;
  recipient: string;
  memo?: string;
}

function getMemoString(arg: ClarityValue | undefined): string | undefined {
  if (!arg || arg.type !== 'some') return undefined;
  if (arg.value.type !== 'buffer') return undefined;
  return new TextDecoder().decode(hexToBytes(cleanHex(arg.value.value)));
}

export function getVerifiedSip10TransferDetails(
  tx: StacksTransaction
): Sip10TransferDetails | null {
  if (!isSip10TransferContactCall(tx) || tx.type !== 'call') return null;
  if (tx.postConditionMode !== undefined && tx.postConditionMode !== 'deny') return null;
  if (tx.postConditions?.length !== 1) return null;
  const pc = tx.postConditions[0];
  if (
    pc.type !== 'ft-postcondition' ||
    pc.condition !== 'eq' ||
    pc.address.includes('.') ||
    pc.address === 'origin'
  )
    return null;
  const [amountArg, senderArg, recipientArg, memoArg] = tx.args;
  if (
    amountArg?.type !== 'uint' ||
    senderArg?.type !== 'address' ||
    recipientArg?.type !== 'address'
  )
    return null;
  if (pc.amount !== amountArg.value || pc.address !== senderArg.value) return null;
  const [contractId, assetName] = pc.asset.split('::');
  if (contractId !== tx.contract) return null;
  return {
    contractId,
    assetName,
    amount: amountArg.value,
    sender: senderArg.value,
    recipient: recipientArg.value,
    memo: getMemoString(memoArg),
  };
}

export function isSip10Transfer({
  functionName,
  contractInterfaceData,
}: {
  functionName: string;
  contractInterfaceData: ClarityAbiLike;
}) {
  if (functionName !== 'transfer') return false;
  const functionInterface = contractInterfaceData?.functions.find(f => f.name === functionName);
  if (
    functionInterface?.args[0]?.name === 'amount' &&
    functionInterface?.args[1]?.name === 'sender' &&
    functionInterface?.args[2]?.name === 'recipient' &&
    functionInterface?.args[3]?.name === 'memo'
  ) {
    return true;
  }
  return false;
}

export function getSip10TransferAmount({
  functionName,
  functionArgs,
  contractInterfaceData,
}: {
  functionName: string;
  functionArgs: ClarityValue[];
  contractInterfaceData: ClarityAbiLike;
}) {
  if (
    isSip10Transfer({ functionName, contractInterfaceData }) &&
    functionArgs[0]?.type === 'uint'
  ) {
    return Number(functionArgs[0].value);
  }
  return null;
}

export function getSip10TransferRecipient({
  functionName,
  functionArgs,
  contractInterfaceData,
}: {
  functionName: string;
  functionArgs: ClarityValue[];
  contractInterfaceData: ClarityAbiLike;
}) {
  if (
    isSip10Transfer({ functionName, contractInterfaceData }) &&
    functionArgs[2]?.type === 'address'
  ) {
    return functionArgs[2].value;
  }
  return null;
}
