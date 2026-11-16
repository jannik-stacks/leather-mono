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
  type stxSignStructuredMessage,
} from '@leather.io/rpc';
import { decodeStructuredMessage, invalidStructuredMessageError } from '@leather.io/stacks';

interface StxSignStructuredMessageApproverProps {
  app: App;
  request: RpcRequest<typeof stxSignStructuredMessage>;
  sendResult(result: RpcResponse<typeof stxSignStructuredMessage>): void;
  closeApprover(): void;
  accountId: string;
}

export function StxSignStructuredMessageApprover({
  app,
  request,
  closeApprover,
  sendResult,
  accountId,
}: StxSignStructuredMessageApproverProps) {
  const { list: accounts } = useAccounts();
  const signer = useStacksSigners().fromAccountId(accountId)[0];
  assertStacksSigner(signer);

  function onInvalidMessage() {
    sendResult(
      createRpcErrorResponse('stx_signStructuredMessage', {
        id: request.id,
        error: { code: RpcErrorCode.INVALID_PARAMS, message: invalidStructuredMessageError },
      })
    );
  }

  async function onApprove() {
    assertStacksSigner(signer);

    const payload = decodeStructuredMessage(request.params.message, request.params.domain);
    if (!payload) return onInvalidMessage();
    const signatureData = await signer.signStructuredMessage(payload.message, payload.domain);
    const response = createRpcSuccessResponse('stx_signStructuredMessage', {
      id: request.id,
      result: signatureData,
    });
    sendResult(response);
  }

  return (
    <BaseStxMessageApproverLayout
      accountId={accountId}
      accounts={accounts}
      messageToSign={{ ...request.params, messageType: 'structured' }}
      onApprove={onApprove}
      onCloseApprover={closeApprover}
      onInvalidMessage={onInvalidMessage}
      origin={app.origin}
    />
  );
}
