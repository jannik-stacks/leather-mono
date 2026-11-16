import { BaseStxMessageApproverLayout } from '@/features/approver/layouts/base-stx-message-approver.layout';
import { useAccounts } from '@/store/accounts/accounts.read';
import { type App } from '@/store/apps/utils';
import { useStacksSigners } from '@/store/keychains/stacks/stacks-keychains.read';
import { assertStacksSigner } from '@/store/keychains/stacks/utils';

import {
  RpcErrorCode,
  type RpcRequest,
  type RpcResponse,
  createRpcErrorResponse,
  createRpcSuccessResponse,
  type stxSignMessage,
} from '@leather.io/rpc';
import {
  type SignatureData,
  decodeStructuredMessage,
  invalidStructuredMessageError,
} from '@leather.io/stacks';

interface StxSignMessageApproverProps {
  app: App;
  request: RpcRequest<typeof stxSignMessage>;
  sendResult(result: RpcResponse<typeof stxSignMessage>): void;
  closeApprover(): void;
  accountId: string;
}

export function StxSignMessageApprover({
  app,
  request,
  closeApprover,
  sendResult,
  accountId,
}: StxSignMessageApproverProps) {
  const { list: accounts } = useAccounts();
  const signer = useStacksSigners().fromAccountId(accountId)[0];
  assertStacksSigner(signer);

  function onInvalidMessage() {
    sendResult(
      createRpcErrorResponse('stx_signMessage', {
        id: request.id,
        error: { code: RpcErrorCode.INVALID_PARAMS, message: invalidStructuredMessageError },
      })
    );
  }

  async function onApprove() {
    assertStacksSigner(signer);

    function submit(signatureData: SignatureData) {
      const response = createRpcSuccessResponse('stx_signMessage', {
        id: request.id,
        result: signatureData,
      });
      sendResult(response);
    }

    if (request.params.messageType === 'utf8') {
      const signatureData = await signer.signMessage(request.params.message);
      submit(signatureData);
    } else if (request.params.messageType === 'structured') {
      const payload = decodeStructuredMessage(request.params.message, request.params.domain);
      if (!payload) return onInvalidMessage();
      const signatureData = await signer.signStructuredMessage(payload.message, payload.domain);
      submit(signatureData);
    }
  }

  return (
    <BaseStxMessageApproverLayout
      accountId={accountId}
      accounts={accounts}
      messageToSign={request.params}
      onApprove={onApprove}
      onCloseApprover={closeApprover}
      onInvalidMessage={onInvalidMessage}
      origin={app.origin}
    />
  );
}
