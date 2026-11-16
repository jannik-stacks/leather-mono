import { Codec } from '@jannik-stacks/kit';

import { getVerifiedSip10TransferDetails } from './sip-10-contract-call.utils';

export interface StxTransferPayloadDetails {
  type: 'stxTransfer';
  recipient: string;
  amount: bigint;
  memo: string;
  fee: bigint;
}

export interface StxSip10TransferPayloadDetails {
  type: 'sip10Transfer';
  contractId: string;
  assetName: string;
  amount: bigint;
  sender: string;
  recipient: string;
  memo?: string;
  fee: bigint;
}

export interface StxContractCallPayloadDetails {
  type: 'contractCall';
  contractAddress: string;
  contractName: string;
  functionName: string;
  fee: bigint;
}

export interface StxContractDeployPayloadDetails {
  type: 'contractDeploy';
  contractName: string;
  fee: bigint;
}

export type StxTransactionPayloadDetails =
  | StxTransferPayloadDetails
  | StxSip10TransferPayloadDetails
  | StxContractCallPayloadDetails
  | StxContractDeployPayloadDetails;

export function decodeStxTransactionPayload(rawTx: string): StxTransactionPayloadDetails | null {
  const tx = Codec.Transaction.decode(rawTx);
  const fee = tx.fee ?? 0n;
  switch (tx.type) {
    case 'transfer':
      return {
        type: 'stxTransfer',
        recipient: tx.recipient,
        amount: tx.amount,
        memo: tx.memo ?? '',
        fee,
      };
    case 'call': {
      const sip10Transfer = getVerifiedSip10TransferDetails(tx);
      if (sip10Transfer) return { type: 'sip10Transfer', ...sip10Transfer, fee };
      return {
        type: 'contractCall',
        contractAddress: tx.contract.split('.')[0],
        contractName: tx.contract.split('.')[1],
        functionName: tx.functionName,
        fee,
      };
    }
    case 'deploy':
      return {
        type: 'contractDeploy',
        contractName: tx.name,
        fee,
      };
    default:
      return null;
  }
}
