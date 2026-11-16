import { STACKS_TESTNET } from '@stacks/network';
import {
  type ClarityVersion,
  type PostConditionMode,
  TransactionSigner,
  privateKeyToPublic,
  serializeCV,
} from '@stacks/transactions';
import BigNumber from 'bignumber.js';

import { createMoney } from '@leather.io/utils';

import { signStacksTransaction } from '../signer/signer';
import { decodeStxTransactionPayload } from './decode-stx-transaction';
import { generateStacksUnsignedTransaction } from './generate-unsigned-transaction';
import { createSip9FnArgs, createSip10FnArgs } from './get-contract-fn-args';
import {
  estimateStacksTransactionByteLength,
  getEstimatedUnsignedStacksTxByteLength,
  getSerializedUnsignedStacksTxPayload,
} from './serialization';
import { TransactionTypes } from './transaction.types';

interface TransactionInput {
  kind: 'stx' | 'sip10' | 'sip9' | 'call' | 'deploy';
  privateKeys: string[];
  recipient: string;
  amount: string;
  fee: string;
  nonce: string | number;
  memo?: string;
  network?: 'mainnet' | 'testnet' | number;
  threshold?: number;
  nonSequential?: boolean;
  sponsored?: boolean;
  clarityVersion?: ClarityVersion;
  mode?: PostConditionMode;
}
export async function transaction(input: TransactionInput) {
  const { privateKeys, threshold, nonSequential, network } = input;
  const publicKeys = privateKeys.map(privateKeyToPublic);
  const auth =
    threshold === undefined
      ? { publicKey: publicKeys[0] }
      : { publicKeys, numSignatures: threshold, useNonSequentialMultiSig: nonSequential };
  const selectedNetwork =
    typeof network === 'number' ? { ...STACKS_TESTNET, chainId: network } : network;
  const common = {
    ...auth,
    fee: createMoney(new BigNumber(input.fee), 'STX'),
    nonce: input.nonce,
    ...(selectedNetwork === undefined ? {} : { network: selectedNetwork }),
    sponsored: input.sponsored,
  };
  const senderStacksAddress = 'ST000000000000000000002AMW42H';
  const recipientStacksAddress = input.recipient;
  const transferArgs =
    input.kind === 'sip9'
      ? createSip9FnArgs({
          assetId: '0100000000000000010000000000000001',
          senderStacksAddress,
          recipientStacksAddress,
        })
      : createSip10FnArgs({
          amount: input.amount,
          senderStacksAddress,
          recipientStacksAddress,
          memo: input.memo,
        });
  async function buildTransaction() {
    if (input.kind === 'stx')
      return generateStacksUnsignedTransaction({
        ...common,
        txType: TransactionTypes.StxTokenTransfer,
        recipient: input.recipient,
        amount: createMoney(new BigNumber(input.amount), 'STX'),
        memo: input.memo,
      });
    if (input.kind === 'deploy')
      return generateStacksUnsignedTransaction({
        ...common,
        txType: TransactionTypes.ContractDeploy,
        contractName: 'vector',
        codeBody: '(define-public (hello) (ok u1))',
        clarityVersion: input.clarityVersion,
      });
    return generateStacksUnsignedTransaction({
      ...common,
      txType: TransactionTypes.ContractCall,
      contractAddress: senderStacksAddress,
      contractName: 'token',
      functionName: input.kind === 'call' ? 'hello' : 'transfer',
      functionArgs:
        input.kind === 'call'
          ? ['0a0100000000000000010000000000000000']
          : transferArgs.map(serializeCV),
      postConditionMode: input.mode,
      postConditions: [],
    });
  }
  const tx = await buildTransaction();
  const unsigned = tx.serialize();
  const unsignedId = tx.txid();
  const byteLength = getEstimatedUnsignedStacksTxByteLength(tx);
  const payload = getSerializedUnsignedStacksTxPayload(tx);
  const estimated = estimateStacksTransactionByteLength(tx, privateKeys.length);
  if (threshold === undefined) signStacksTransaction(tx, privateKeys[0]);
  else {
    const signer = new TransactionSigner(tx);
    privateKeys.slice(0, threshold).forEach(key => signer.signOrigin(key));
    privateKeys.slice(threshold).forEach(key => signer.appendOrigin(privateKeyToPublic(key)));
  }
  return {
    unsigned,
    unsignedId,
    byteLength,
    payload,
    estimated,
    signed: tx.serialize(),
    txid: tx.txid(),
    decoded: decodeStxTransactionPayload(tx.serialize()),
    fee: tx.auth.spendingCondition.fee,
    nonce: tx.auth.spendingCondition.nonce,
    mode: tx.postConditionMode,
    signedEstimate: estimateStacksTransactionByteLength(tx, privateKeys.length),
  };
}
