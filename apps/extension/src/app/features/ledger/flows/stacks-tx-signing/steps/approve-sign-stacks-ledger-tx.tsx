import { useMemo } from 'react';

import * as Sentry from '@sentry/react';
import { BigNumber } from 'bignumber.js';

import { formatClarityValue } from '@leather.io/stacks';
import { microStxToStx } from '@leather.io/utils';

import { getSip10TransferPayload } from '@app/common/transactions/stacks/transaction.utils';
import { useLedgerTxSigningContext } from '@app/features/ledger/generic-flows/tx-signing/ledger-sign-tx.context';
import { ApproveLedgerOperationLayout } from '@app/features/ledger/generic-steps/approve-ledger-operation/approve-ledger-operation.layout';
import { useHasApprovedOperation } from '@app/features/ledger/hooks/use-has-approved-transaction';
import { useCurrentStacksAccount } from '@app/store/accounts/blockchain/stacks/stacks-account.hooks';

const sipTenTransferArguments = ['Amount', 'Sender', 'To', 'Memo'];

function formatSipTenTransferArgument(index: number) {
  return `Argument ${index} — ${sipTenTransferArguments[index]}`;
}

function formatTooltipLabel(amount: bigint) {
  const stxFromMicroStx = microStxToStx(Number(amount));
  return `The amount is displayed in microstacks (µSTX) and is equal to ${stxFromMicroStx.toString()} STX`;
}

export function ApproveSignLedgerStacksTx() {
  const { transaction, chain } = useLedgerTxSigningContext();
  const currentAccount = useCurrentStacksAccount();
  const hasApprovedOperation = useHasApprovedOperation();

  const transactionDetails: [string, string, string?][] = useMemo(() => {
    if (!transaction || chain !== 'stacks') return [];

    try {
      const details: [string, string, string?][] = [];
      const nonce = transaction.nonce ?? 0n;
      const fee = transaction.fee ?? 0n;

      details.push(['Origin', currentAccount?.address ?? '']);
      details.push(['Nonce', String(nonce)]);

      details.push(['Fee (µSTX)', String(fee), formatTooltipLabel(fee)]);

      if (transaction.type === 'transfer') {
        details.push(
          [
            'Amount (µSTX)',
            new BigNumber(String(transaction.amount)).toFormat(),
            formatTooltipLabel(transaction.amount),
          ],
          ['To', transaction.recipient],
          ['Memo', transaction.memo ?? '']
        );
        return details;
      }

      if (transaction.type === 'call') {
        details.push(['Contract address', transaction.contract.split('.')[0] ?? '']);
        details.push(['Contract name', transaction.contract.split('.')[1] ?? '']);
      }

      if (transaction.type === 'deploy') {
        details.push(['Contract address', currentAccount?.address ?? '']);
        details.push(['Contract name', transaction.name]);
      }

      if (transaction.type === 'call') {
        details.push(['Function name', transaction.functionName]);

        if (transaction.args.length === 0) {
          details.push(['Arguments', 'None']);
        }

        if (getSip10TransferPayload(transaction)) {
          transaction.args.forEach((cv, index) => {
            details.push([formatSipTenTransferArgument(index), formatClarityValue(cv)]);
          });
        } else {
          transaction.args.forEach((cv, index) =>
            details.push([`Argument ${index + 0}`, formatClarityValue(cv)])
          );
        }
      }

      if (transaction.type === 'deploy') {
        details.push(['Contract code', transaction.code]);
      }

      return details;
    } catch (error) {
      Sentry.captureException(error);
      return [
        ['Status', 'Error parsing arguments'],
        ['Warning', 'Please verify transaction details on your Ledger device'],
      ];
    }
  }, [chain, currentAccount?.address, transaction]);

  return (
    <ApproveLedgerOperationLayout
      description="Verify the transaction details on your Ledger"
      details={transactionDetails}
      status={hasApprovedOperation ? 'approved' : 'awaiting-approval'}
    />
  );
}
