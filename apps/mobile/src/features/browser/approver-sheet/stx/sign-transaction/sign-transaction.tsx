import { useState } from 'react';

import { BaseStxTxApproverLayout } from '@/features/approver/layouts/base-stx-tx-approver.layout';
import { getTxOptions } from '@/features/approver/utils';
import { useAccounts } from '@/store/accounts/accounts.read';
import { type App } from '@/store/apps/utils';
import { useStacksSigners } from '@/store/keychains/stacks/stacks-keychains.read';
import { assertStacksSigner } from '@/store/keychains/stacks/utils';
import { useNetworkPreferenceStacksNetwork } from '@/store/settings/settings';
import { Codec } from '@jannik-stacks/kit';
import { sha512_256 } from '@noble/hashes/sha512';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';

import {
  type RpcRequest,
  type RpcResponse,
  createRpcSuccessResponse,
  type stxSignTransaction,
} from '@leather.io/rpc';

import { getTxHexFromRequest } from './utils';

interface SignTransactionApproverProps {
  app: App;
  request: RpcRequest<typeof stxSignTransaction>;
  sendResult(result: RpcResponse<typeof stxSignTransaction>): void;
  closeApprover(): void;
  accountId: string;
}

export function SignTransactionApprover({
  app,
  request,
  closeApprover,
  sendResult,
  accountId,
}: SignTransactionApproverProps) {
  const network = useNetworkPreferenceStacksNetwork();
  const requestTxHex = getTxHexFromRequest(request);

  const { list: accounts } = useAccounts();
  const [txHex, setTxHex] = useState(requestTxHex);
  const signer = useStacksSigners().fromAccountId(accountId)[0];
  assertStacksSigner(signer);

  const txOptions = getTxOptions(signer, network);

  const tx = Codec.Transaction.decode(txHex);

  async function onApprove() {
    assertStacksSigner(signer);
    const signedTx = await signer?.sign(tx);

    const response = createRpcSuccessResponse('stx_signTransaction', {
      id: request.id,
      result: {
        txHex: Codec.Transaction.encode(signedTx),
        transaction: Codec.Transaction.encode(signedTx),
      },
    });
    sendResult(response);

    return bytesToHex(sha512_256(hexToBytes(Codec.Transaction.encode(signedTx))));
  }

  return (
    <BaseStxTxApproverLayout
      accountId={accountId}
      accounts={accounts}
      onApprove={onApprove}
      onBack={closeApprover}
      onCloseApprover={closeApprover}
      origin={app.origin}
      setTxHex={setTxHex}
      txHex={txHex}
      txOptions={txOptions}
    />
  );
}
