import { useMemo } from 'react';

import { Cl, Codec } from '@jannik-stacks/kit';

import {
  RpcErrorCode,
  createRpcErrorResponse,
  createRpcSuccessResponse,
  stxSignTransaction,
} from '@leather.io/rpc';
import { StxAvatarIcon } from '@leather.io/ui';
import { createMoney } from '@leather.io/utils';

import { sendMessageToOriginatingFrame } from '@shared/messaging/send-message-to-originating-frame';
import { RpcErrorMessage } from '@shared/rpc/methods/validation.utils';
import { closeWindow } from '@shared/utils';

import { useConvertCryptoCurrencyToFiatAmount } from '@app/common/hooks/use-convert-to-fiat-amount';
import { AccountStacksAddress } from '@app/components/account/account-stacks-address';
import { TransactionRecipientsLayout } from '@app/components/rpc-transaction-request/transaction-recipients.layout';
import { FeeEditor } from '@app/features/fee-editor/fee-editor';
import { useFeeEditorContext } from '@app/features/fee-editor/fee-editor.context';
import { NonceEditor } from '@app/features/nonce-editor/nonce-editor';
import { useNonceEditorContext } from '@app/features/nonce-editor/nonce-editor.context';
import { RpcTransactionRequestLayout } from '@app/features/rpc-stacks-transaction-request/rpc-transaction-request.layout';
import { SigningAccountCard } from '@app/features/rpc-stacks-transaction-request/signing-account-card/signing-account-card';
import { ContractCallDetailsLayout } from '@app/features/rpc-stacks-transaction-request/stacks/contract-call/contract-call-details.layout';
import { ContractDeployDetailsLayout } from '@app/features/rpc-stacks-transaction-request/stacks/contract-deploy/contract-deploy-details.layout';
import { PostConditionsDetailsLayout } from '@app/features/rpc-stacks-transaction-request/stacks/post-conditions/post-conditions-details.layout';
import { useStacksRpcTransactionRequestContext } from '@app/features/rpc-stacks-transaction-request/stacks/stacks-rpc-transaction-request.context';
import { useStacksRpcTransactionRequestApproval } from '@app/features/rpc-stacks-transaction-request/stacks/use-stacks-rpc-transaction-request-approval';
import { TransactionActionsWithSpend } from '@app/features/rpc-stacks-transaction-request/transaction-actions/transaction-actions-with-spend';
import { useSignStacksTransaction } from '@app/store/transactions/transaction.hooks';

import {
  checkUnsignedStacksTransactionHashMode,
  getUnsignedStacksTransactionFromRpcRequest,
} from './rpc-stx-sign-transaction.utils';

export function RpcStxSignTransaction() {
  const { address, frameId, isLoadingBalance, onSetTransactionStatus, requestId, tabId } =
    useStacksRpcTransactionRequestContext();
  const {
    availableBalance,
    isLoadingFees,
    isSponsored,
    marketData,
    onUserActivatesFeeEditor,
    selectedFee,
  } = useFeeEditorContext();
  const { nonce, onUserActivatesNonceEditor } = useNonceEditorContext();
  const convertToFiatAmount = useConvertCryptoCurrencyToFiatAmount('STX');
  const signStacksTx = useSignStacksTransaction();

  const unsignedTxForBroadcast = useMemo(() => getUnsignedStacksTransactionFromRpcRequest(), []);

  // Handle multisig transactions
  const isMultisig = checkUnsignedStacksTransactionHashMode(unsignedTxForBroadcast);
  const canEditFeeAndNonce = !isMultisig;

  async function onApproveTransaction() {
    if (canEditFeeAndNonce) {
      unsignedTxForBroadcast.fee = BigInt(selectedFee.txFee.amount.toString());
      unsignedTxForBroadcast.nonce = BigInt(nonce);
    }

    if (isSponsored) unsignedTxForBroadcast.fee = BigInt(0);

    const signedTransaction = await signStacksTx(unsignedTxForBroadcast);
    if (signedTransaction === null) {
      onSetTransactionStatus('idle');
      return;
    }

    if (!signedTransaction) {
      void sendMessageToOriginatingFrame(
        { frameId, tabId },
        createRpcErrorResponse('stx_signTransaction', {
          id: requestId,
          error: {
            code: RpcErrorCode.INVALID_REQUEST,
            message: RpcErrorMessage.UnsignedTransaction,
          },
        })
      );
      throw new Error('Error signing stacks transaction');
    }

    void sendMessageToOriginatingFrame(
      { frameId, tabId },
      createRpcSuccessResponse('stx_signTransaction', {
        id: requestId,
        result: {
          txHex: Codec.Transaction.encode(signedTransaction),
          transaction: Codec.Transaction.encode(signedTransaction),
        },
      })
    );
    closeWindow();
  }
  const onApprove = useStacksRpcTransactionRequestApproval(onApproveTransaction);

  const signer = (
    <SigningAccountCard
      address={<AccountStacksAddress />}
      availableBalance={availableBalance}
      fiatBalance={convertToFiatAmount(availableBalance)}
      isLoadingBalance={isLoadingBalance}
    />
  );

  return (
    <RpcTransactionRequestLayout
      title="Sign transaction"
      method={stxSignTransaction.method}
      helpUrl="" // TODO: Need url
      actions={
        <TransactionActionsWithSpend
          isLoading={isLoadingBalance || isLoadingFees}
          isSponsored={unsignedTxForBroadcast.sponsor !== undefined}
          // TODO: Calculate amount if more than fees
          txAmount={createMoney(0, 'STX')}
          onApprove={onApprove}
        />
      }
    >
      {unsignedTxForBroadcast.type === 'transfer' ? (
        <>
          {signer}
          <TransactionRecipientsLayout
            title="Stacks"
            caption="Stacks blockchain"
            avatar={<StxAvatarIcon />}
            convertToFiatAmount={convertToFiatAmount}
            recipients={[
              {
                address: unsignedTxForBroadcast.recipient,
                amount: createMoney(unsignedTxForBroadcast.amount, 'STX'),
              },
            ]}
          />
        </>
      ) : (
        <>
          <PostConditionsDetailsLayout
            postConditions={unsignedTxForBroadcast.postConditions ?? []}
            postConditionMode={unsignedTxForBroadcast.postConditionMode}
          />
          {signer}
        </>
      )}
      {unsignedTxForBroadcast.type === 'call' && (
        <ContractCallDetailsLayout
          contractAddress={unsignedTxForBroadcast.contract.split('.')[0] ?? ''}
          contractName={unsignedTxForBroadcast.contract.split('.')[1] ?? ''}
          functionName={unsignedTxForBroadcast.functionName}
          functionArgs={unsignedTxForBroadcast.args.map(arg => Cl.serialize(arg))}
        />
      )}
      {unsignedTxForBroadcast.type === 'deploy' && (
        <ContractDeployDetailsLayout
          address={address}
          contractName={unsignedTxForBroadcast.name}
          codeBody={unsignedTxForBroadcast.code}
        />
      )}
      {canEditFeeAndNonce && (
        <FeeEditor.Trigger
          feeType="fee-value"
          isLoading={isLoadingFees}
          isSponsored={isSponsored}
          marketData={marketData}
          onEditFee={onUserActivatesFeeEditor}
          selectedFee={selectedFee}
        />
      )}
      {canEditFeeAndNonce && (
        <NonceEditor.Trigger nonce={nonce} onEditNonce={onUserActivatesNonceEditor} />
      )}
    </RpcTransactionRequestLayout>
  );
}
