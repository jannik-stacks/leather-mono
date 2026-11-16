import {
  type StacksApiMempoolTransaction,
  type StacksApiTransaction,
  type StacksApiTransactionResponse,
} from './stacks-api.model';

export type StacksTx = StacksApiMempoolTransaction | StacksApiTransaction;
export type StacksTxStatus = 'failed' | 'pending' | 'success';

export type StacksTransaction = StacksApiTransactionResponse;
export type StacksMempoolTransaction = Extract<StacksTransaction, { receipt_time: number }>;
export type StacksConfirmedTransaction = Exclude<StacksTransaction, StacksMempoolTransaction>;
export type StacksMempoolTransactionStatus = StacksMempoolTransaction['status'];
export type StacksConfirmedTransactionStatus = StacksConfirmedTransaction['status'];

export function isStacksMempoolTransaction(tx: StacksTransaction) {
  return 'receipt_time' in tx;
}

export interface StxTransfer {
  amount: string;
  sender?: string;
  recipient?: string;
}

export interface FtTransfer {
  asset_identifier: string;
  amount: string;
  sender?: string;
  recipient?: string;
}
