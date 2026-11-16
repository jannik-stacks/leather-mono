import {
  Address,
  type ConditionFields,
  type Transaction,
  addressVersionFor,
  publicKeyToAddress,
  publicKeysToAddress,
} from '@jannik-stacks/kit';
import { ripemd160 } from '@noble/hashes/ripemd160';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex } from '@noble/hashes/utils';
import BigNumber from 'bignumber.js';

import { assertUnreachable } from '@leather.io/utils';

import { cleanHex } from '../stacks.utils';
import { decodeClarityArgument } from './get-contract-fn-args';
import { getPostConditions } from './post-condition.utils';
import {
  type StacksUnsignedTransactionOptions,
  TransactionTypes,
  isTransactionTypeSupported,
} from './transaction.types';

export function initNonce(nonce: number | string) {
  return new BigNumber(nonce, 10);
}
export async function generateStacksUnsignedTransaction(
  options: StacksUnsignedTransactionOptions
): Promise<Transaction> {
  const { txType } = options;
  if (!isTransactionTypeSupported(txType))
    throw new Error(`Invalid Transaction Type: ${String(txType)}`);
  const network = options.network ?? 'mainnet';
  const auth: ConditionFields =
    'publicKey' in options
      ? {
          signer: {
            value: publicKeyToAddress(options.publicKey, {
              network,
              encoding: options.publicKey.length === 130 ? 'uncompressed' : 'compressed',
            }),
            encoding: options.publicKey.length === 130 ? 'uncompressed' : 'compressed',
          },
        }
      : {
          signer: {
            value: publicKeysToAddress(
              { publicKeys: options.publicKeys, threshold: options.numSignatures },
              { network }
            ),
            hashMode: options.useNonSequentialMultiSig ? 'p2sh-non-sequential' : 'p2sh',
          },
          signaturesRequired: options.numSignatures,
          signatures: [],
        };
  const common = {
    ...auth,
    network,
    fee: BigInt(options.fee.amount.toString()),
    nonce: BigInt(initNonce(options.nonce).toString()),
    ...(options.sponsored
      ? {
          sponsor: {
            signer: {
              value: Address.stringify({
                version: addressVersionFor(network, 'single'),
                hash160: bytesToHex(ripemd160(sha256(new Uint8Array(33)))),
              }),
            },
          },
        }
      : {}),
    postConditionMode: options.postConditionMode,
    postConditions: getPostConditions(options.postConditions),
  };
  switch (txType) {
    case TransactionTypes.StxTokenTransfer:
      return Promise.resolve<Transaction>({
        ...common,
        type: 'transfer',
        recipient: options.recipient,
        amount: BigInt(options.amount.amount.toString()),
        memo: options.memo,
      });
    case TransactionTypes.ContractCall:
      return Promise.resolve<Transaction>({
        ...common,
        type: 'call',
        contract: `${options.contractAddress}.${options.contractName}`,
        functionName: options.functionName,
        args: options.functionArgs.map(arg => decodeClarityArgument(cleanHex(arg))),
      });
    case TransactionTypes.ContractDeploy:
      return Promise.resolve<Transaction>({
        ...common,
        type: 'deploy',
        name: options.contractName,
        code: options.codeBody,
        ...(options.clarityVersion === undefined || options.clarityVersion === 6
          ? {}
          : { clarityVersion: options.clarityVersion }),
      });
    default:
      return assertUnreachable(txType);
  }
}
