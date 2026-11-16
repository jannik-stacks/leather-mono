import {
  type NetworkName,
  type PostCondition,
  type StacksNetwork,
  type Transaction,
} from '@jannik-stacks/kit';

import { type Money } from '@leather.io/models';

export const TransactionTypes = {
  ContractCall: 'contract_call',
  ContractDeploy: 'smart_contract',
  StxTokenTransfer: 'token_transfer',
} as const;
export type TransactionTypes = (typeof TransactionTypes)[keyof typeof TransactionTypes];
export function isTransactionTypeSupported(txType: TransactionTypes) {
  return (
    txType === TransactionTypes.ContractCall ||
    txType === TransactionTypes.ContractDeploy ||
    txType === TransactionTypes.StxTokenTransfer
  );
}
interface UnsignedOptions {
  fee: Money;
  nonce: number | string;
  network?: NetworkName | StacksNetwork;
  sponsored?: boolean;
  postConditions?: (PostCondition | string)[];
  postConditionMode?: Transaction['postConditionMode'];
}
interface SingleSig {
  publicKey: string;
}
interface MultiSig {
  publicKeys: string[];
  numSignatures: number;
  useNonSequentialMultiSig?: boolean;
}
interface ContractCallOptions extends UnsignedOptions {
  txType: typeof TransactionTypes.ContractCall;
  contractAddress: string;
  contractName: string;
  functionName: string;
  functionArgs: string[];
}
interface DeployOptions extends UnsignedOptions {
  txType: typeof TransactionTypes.ContractDeploy;
  contractName: string;
  codeBody: string;
  clarityVersion?: number;
}
interface TransferOptions extends UnsignedOptions {
  txType: typeof TransactionTypes.StxTokenTransfer;
  recipient: string;
  amount: Money;
  memo?: string;
}
export type StacksUnsignedSingleSigContractCallOptions = ContractCallOptions & SingleSig;
export type StacksUnsignedMultiSigContractCallOptions = ContractCallOptions & MultiSig;
export type StacksUnsignedContractCallOptions =
  | StacksUnsignedSingleSigContractCallOptions
  | StacksUnsignedMultiSigContractCallOptions;
export type StacksUnsignedSingleSigContractDeployOptions = DeployOptions & SingleSig;
export type StacksUnsignedMultiSigContractDeployOptions = DeployOptions & MultiSig;
export type StacksUnsignedContractDeployOptions =
  | StacksUnsignedSingleSigContractDeployOptions
  | StacksUnsignedMultiSigContractDeployOptions;
export type StacksUnsignedTokenTransferOptions = TransferOptions & SingleSig;
export type StacksUnsignedMultiSigTokenTransferOptions = TransferOptions & MultiSig;
export type StacksUnsignedStxTokenTransferOptions =
  | StacksUnsignedTokenTransferOptions
  | StacksUnsignedMultiSigTokenTransferOptions;
export type StacksUnsignedSingleSigTransactionOptions =
  | StacksUnsignedSingleSigContractCallOptions
  | StacksUnsignedSingleSigContractDeployOptions
  | StacksUnsignedTokenTransferOptions;
export type StacksUnsignedMultiSigTransactionOptions =
  | StacksUnsignedMultiSigContractCallOptions
  | StacksUnsignedMultiSigContractDeployOptions
  | StacksUnsignedMultiSigTokenTransferOptions;
export type StacksUnsignedTransactionOptions =
  | StacksUnsignedSingleSigTransactionOptions
  | StacksUnsignedMultiSigTransactionOptions;
