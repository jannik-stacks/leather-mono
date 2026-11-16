import { Cl, type ClarityValue, Codec, type StacksNetwork } from '@jannik-stacks/kit';

import { type Money } from '@leather.io/models';
import { createRequestEncoder, stxTransferSip9Nft } from '@leather.io/rpc';
import { getAddressFromAssetIdentifier } from '@leather.io/services';
import {
  type StacksUnsignedContractCallOptions,
  TransactionTypes,
  getStacksAssetStringParts,
} from '@leather.io/stacks';
import { createMoney } from '@leather.io/utils';

import { makeNftPostCondition } from '@shared/utils/post-conditions';

import { initialSearchParams } from '@app/common/initial-search-params';
import { type Nonce } from '@app/features/nonce-editor/nonce-editor.context';

export function getDecodedRpcStxTransferSip9NftRequest() {
  const { decode } = createRequestEncoder(stxTransferSip9Nft.request);
  const rpcRequest = initialSearchParams.get('rpcRequest');
  if (!rpcRequest) throw new Error('Missing rpcRequest');
  return decode(rpcRequest);
}

function getTransactionOptionsFromRpcRequest(address: string) {
  const decodedRpcRequest = getDecodedRpcStxTransferSip9NftRequest();

  const { contractAddress, contractAssetName, contractName } = getStacksAssetStringParts(
    decodedRpcRequest.params.asset
  );

  const fnArgs: ClarityValue[] = [
    Cl.deserialize(decodedRpcRequest.params.assetId),
    Cl.address(decodedRpcRequest.params.address ?? address),
    Cl.address(decodedRpcRequest.params.recipient),
  ];
  const postConditionOptions = {
    assetId: decodedRpcRequest.params.assetId,
    contractAddress,
    contractAssetName,
    contractName,
    stxAddress: decodedRpcRequest.params.address ?? address,
  };

  return {
    contractAddress: getAddressFromAssetIdentifier(decodedRpcRequest.params.asset),
    contractName,
    functionArgs: fnArgs.map(arg => Cl.serialize(arg)),
    fee: decodedRpcRequest.params.fee
      ? createMoney(decodedRpcRequest.params.fee, 'STX')
      : undefined,
    nonce: decodedRpcRequest.params.nonce,
    sponsored: decodedRpcRequest.params.sponsored,
    postConditions: [Codec.Raw.PostCondition.encode(makeNftPostCondition(postConditionOptions))],
  };
}

interface GetUnsignedStacksContractCallOptionsForFeeEstimationArgs {
  address: string;
  publicKey: string;
  network: StacksNetwork;
}
export function getUnsignedStacksContractCallOptionsForFeeEstimation({
  address,
  publicKey,
  network,
}: GetUnsignedStacksContractCallOptionsForFeeEstimationArgs): StacksUnsignedContractCallOptions {
  const requestOptions = getTransactionOptionsFromRpcRequest(address);

  return {
    txType: TransactionTypes.ContractCall,
    ...requestOptions,
    functionName: 'transfer',
    fee: requestOptions.fee ?? createMoney(0, 'STX'),
    nonce: requestOptions.nonce ?? 0,
    publicKey,
    network,
  };
}

interface GetUnsignedStacksContractCallOptionsArgs {
  address: string;
  fee: Money;
  network: StacksNetwork;
  nonce: Nonce;
  publicKey: string;
}
export function getUnsignedStacksContractCallOptions({
  address,
  fee,
  network,
  nonce,
  publicKey,
}: GetUnsignedStacksContractCallOptionsArgs): StacksUnsignedContractCallOptions {
  const requestOptions = getTransactionOptionsFromRpcRequest(address);

  return {
    txType: TransactionTypes.ContractCall,
    ...requestOptions,
    functionName: 'transfer',
    publicKey,
    network,
    fee,
    nonce,
  };
}
