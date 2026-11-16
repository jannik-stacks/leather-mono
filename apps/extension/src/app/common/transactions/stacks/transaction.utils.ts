import { Address, Codec, type StacksTransaction as KitTransaction } from '@jannik-stacks/kit';
import { hexToBytes } from '@noble/hashes/utils';
import { BigNumber } from 'bignumber.js';

import {
  type StacksTransaction,
  type StacksTxStatus,
  isStacksMempoolTransaction,
} from '@leather.io/models';
import { formatClarityValue, getStacksContractName } from '@leather.io/stacks';
import {
  createMoney,
  isDefined,
  removeTrailingNullCharacters,
  truncateMiddle,
} from '@leather.io/utils';

import { safeCall } from '@shared/utils';

import { stacksValue } from '@app/common/stacks-utils';

export function statusFromTx(tx: StacksTransaction): StacksTxStatus {
  const { status } = tx;
  if (status === 'pending') return 'pending';
  if (status === 'success') return 'success';
  return 'failed';
}

export function stacksTransactionToHex(transaction: KitTransaction) {
  return `0x${Codec.Transaction.encode(transaction)}`;
}

export function getTxCaption(transaction: StacksTransaction) {
  switch (transaction.type) {
    case 'smart_contract':
      return truncateMiddle(transaction.smart_contract.contract_id.split('.')[0], 4);
    case 'contract_call':
      return transaction.contract_call.contract_id.split('.')[1];
    case 'token_transfer':
    case 'coinbase':
    case 'poison_microblock':
      return truncateMiddle(transaction.tx_id, 4);
    default:
      return null;
  }
}

export function getTxValue(tx: StacksTransaction, isOriginator: boolean): string | null {
  if (tx.type === 'token_transfer') {
    return `${isOriginator ? '-' : ''}${stacksValue({
      value: tx.token_transfer.amount,
      withTicker: false,
    })}`;
  }
  return null;
}

export function getTxTitle(tx: StacksTransaction) {
  switch (tx.type) {
    case 'token_transfer':
      return 'Stacks';
    case 'contract_call':
      return tx.contract_call.function_name;
    case 'smart_contract':
      return getStacksContractName(tx.smart_contract.contract_id);
    case 'coinbase':
      return isStacksMempoolTransaction(tx) ? 'Coinbase' : `Coinbase ${tx.block.height}`;
    case 'poison_microblock':
      return 'Poison Microblock';
    case 'tenure_change':
      return 'Tenure Change';
    default:
      return 'Transaction';
  }
}

export function getTxSenderAddress(tx: KitTransaction): string | undefined {
  return tx.signer?.value;
}

export function isNonSequentialMultisigTransaction(tx: KitTransaction) {
  const hashMode =
    tx.signer?.hashMode ?? (tx.signaturesRequired === undefined ? 'p2pkh' : 'p2sh-non-sequential');
  return hashMode === 'p2sh-non-sequential' || hashMode === 'p2wsh-non-sequential';
}

export function isPendingTx(tx: StacksTransaction) {
  return tx.status === 'pending';
}

export const StacksTransactionActionType = {
  Cancel: 'cancel',
  IncreaseFee: 'increase-fee',
} as const;
export type StacksTransactionActionType =
  (typeof StacksTransactionActionType)[keyof typeof StacksTransactionActionType];

export function getRecipientFromStacksTransaction(transaction: KitTransaction) {
  if (transaction.type === 'transfer') {
    return transaction.recipient;
  }

  const sip10Payload = getSip10TransferPayload(transaction);
  if (sip10Payload) {
    const sip10RecipientArg = sip10Payload.args?.[2];
    if (!sip10RecipientArg) return null;
    const [result] = safeCall(() => formatClarityValue(sip10RecipientArg));
    return result;
  }

  return null;
}

export function getTokenTransferAmount(payload: Extract<KitTransaction, { type: 'transfer' }>) {
  return createMoney(Number(payload.amount), 'STX');
}

export function getTokenTransferMemoDisplayText(
  payload: Extract<KitTransaction, { type: 'transfer' }>
) {
  const memo = payload.memo ?? '';
  return removeTrailingNullCharacters(memo);
}

export function getStacksTransactionFee(tx: KitTransaction) {
  const fee = tx.fee ?? 0n;
  return createMoney(Number(fee), 'STX');
}

export function getNonceFromStacksTransaction(tx: KitTransaction) {
  const nonce = tx.nonce ?? 0n;
  return Number(nonce);
}

export function getSip10TransferAmount(
  payload: Extract<KitTransaction, { type: 'call' }>,
  symbol: string,
  decimals?: number
) {
  const amountArg = payload.args?.[0];
  const amount = new BigNumber(
    Number(amountArg && 'value' in amountArg ? amountArg.value : undefined)
  );
  return createMoney(amount, symbol.toUpperCase(), decimals);
}

export function getSip10TransferPayload(tx: KitTransaction) {
  if (tx.type !== 'call' || tx.functionName !== 'transfer') return undefined;
  if (tx.args.length !== 3 && tx.args.length !== 4) return undefined;
  return tx;
}

export function getSip10MemoDisplayText(payload: Extract<KitTransaction, { type: 'call' }>) {
  if (!isDefined(payload.args[3])) return null;
  const isSome = payload.args[3].type === 'some';
  const memo = payload.args[3];
  return isSome && memo.type === 'some' && memo.value.type === 'buffer'
    ? new TextDecoder().decode(hexToBytes(memo.value.value))
    : null;
}

export function getContractAddressFromContractCallPayload(
  payload: Extract<KitTransaction, { type: 'call' }>
) {
  return payload.contract;
}

export function safeAddressToString(address: string) {
  try {
    Address.parse(address);
    return address;
  } catch {
    return null;
  }
}
