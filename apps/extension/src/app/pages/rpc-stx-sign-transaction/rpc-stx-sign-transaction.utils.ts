import { Codec, type StacksTransaction } from '@jannik-stacks/kit';

import { type RpcParams, createRequestEncoder, stxSignTransaction } from '@leather.io/rpc';

import { initialSearchParams } from '@app/common/initial-search-params';

function getStacksTransactionHexFromRequest(requestParams: RpcParams<typeof stxSignTransaction>) {
  if ('txHex' in requestParams) return requestParams.txHex;
  return requestParams.transaction;
}

function getDecodedRpcStxSignTransactionRequest() {
  const { decode } = createRequestEncoder(stxSignTransaction.request);
  const rpcRequest = initialSearchParams.get('rpcRequest');
  if (!rpcRequest) throw new Error('Missing rpcRequest');
  return decode(rpcRequest);
}

export function getUnsignedStacksTransactionFromRpcRequest() {
  const decodedRpcRequest = getDecodedRpcStxSignTransactionRequest();
  return Codec.Transaction.decode(getStacksTransactionHexFromRequest(decodedRpcRequest.params));
}

export function checkUnsignedStacksTransactionHashMode(tx: StacksTransaction) {
  const hashMode = tx.signer?.hashMode ?? 'p2pkh';
  return (
    hashMode === 'p2sh' ||
    hashMode === 'p2wsh' ||
    hashMode === 'p2sh-non-sequential' ||
    hashMode === 'p2wsh-non-sequential'
  );
}
