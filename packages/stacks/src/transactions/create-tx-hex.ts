import { Cl, Codec, Pc } from '@jannik-stacks/kit';
import { bytesToHex } from '@noble/hashes/utils';

import { type Money } from '@leather.io/models';

import { type StacksSigner } from '../signer/signer';
import { formatContractIdString, getStacksAssetStringParts } from '../stacks.utils';
import { generateStacksUnsignedTransaction } from './generate-unsigned-transaction';
import { createSip10FnArgs } from './get-contract-fn-args';
import { TransactionTypes } from './transaction.types';

interface CreateTransferSip10TxHex {
  signer: Pick<StacksSigner, 'address' | 'publicKey'>;
  assetId: string;
  recipient: string;
  amount: number;
  nonce: number;
  fee: Money;
  memo?: string;
  sponsored?: boolean;
}

export async function createTransferSip10TxHex({
  signer,
  assetId,
  recipient,
  amount,
  nonce,
  fee,
  memo,
  sponsored,
}: CreateTransferSip10TxHex) {
  const { contractAddress, contractAssetName, contractName } = getStacksAssetStringParts(assetId);

  const currentStacksAddress = signer.address;

  const fnArgs = createSip10FnArgs({
    amount,
    senderStacksAddress: currentStacksAddress,
    recipientStacksAddress: recipient,
    memo,
  });

  const tx = await generateStacksUnsignedTransaction({
    txType: TransactionTypes.ContractCall,
    publicKey: bytesToHex(signer.publicKey),
    contractAddress,
    contractName,
    functionArgs: fnArgs.map(arg => Cl.serialize(arg)),
    functionName: 'transfer',
    nonce,
    fee,
    sponsored,
    postConditions: [
      Pc.principal(currentStacksAddress)
        .willSendEq(amount)
        .ft(`${formatContractIdString({ contractAddress, contractName })}::${contractAssetName}`),
    ],
  });

  const txHex = Codec.Transaction.encode(tx);
  return txHex;
}
