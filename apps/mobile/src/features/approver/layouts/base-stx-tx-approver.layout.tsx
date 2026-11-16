import { useEffect, useRef, useState } from 'react';

import { ApproverAccountCard } from '@/features/approver/components/approver-account-card';
import { OutcomeAddressesCard } from '@/features/approver/components/outcome-addresses-card';
import { StacksOutcome } from '@/features/approver/components/stacks-outcome';
import { ContractCallArgsSection } from '@/features/approver/contract-call-args.section';
import { ContractCallSummarySection } from '@/features/approver/contract-call-summary.section';
import { ContractDeployCodeSection } from '@/features/approver/contract-deploy-code.section';
import { ContractDeploySummarySection } from '@/features/approver/contract-deploy-summary.section';
import { MemoSection } from '@/features/approver/memo.section';
import { NonceSection } from '@/features/approver/nonce.section';
import { StacksFeesSection } from '@/features/approver/stacks-fees.section';
import {
  type TxOptions,
  assertTokenTransferPayload,
  getTotalSpendMoney,
  getTxRecipient,
} from '@/features/approver/utils';
import { useOpenUrl } from '@/features/browser/browser/use-open-url';
import { useCurrentNetworkState } from '@/queries/leather-query-provider';
import { type Account } from '@/store/accounts/accounts';
import { Codec } from '@jannik-stacks/kit';
import { t } from '@lingui/core/macro';
import * as Clipboard from 'expo-clipboard';

import { stxAsset } from '@leather.io/constants';
import { makeAccountIdentifer } from '@leather.io/crypto';
import { makeActivityLink } from '@leather.io/features';
import { TransactionTypes, generateStacksUnsignedTransaction } from '@leather.io/stacks';
import { Approver, SentIcon, type SheetInstance } from '@leather.io/ui/native';
import { createMoney } from '@leather.io/utils';

import { AllowModeWarningSheet } from '../components/allow-mode-warning-sheet/allow-mode-warning-sheet';
import { ApproverButtons } from '../components/approver-buttons';
import { AllowModePostConditionWarning } from '../components/post-conditions/post-conditions-warning';
import { SipRecipient } from '../components/sip10-recipient';
import { StxStatusRow } from '../components/status-row/stx-status-row';
import { ContractCallPostConditionsSection } from '../contract-call-post-conditions.section';
import { useStxTransactionUpdatesHandler } from '../stx/hooks';

interface BaseStxTxApproverLayoutProps {
  onApprove(): Promise<string | null>;
  onCloseApprover(): void;
  onBack(): void;
  accountId: string | null;
  accounts: Account[];
  txHex: string;
  setTxHex(txHex: string): void;
  txOptions: TxOptions;
  origin?: string;
  onBack(): void;
}

export function BaseStxTxApproverLayout({
  onApprove,
  onCloseApprover,
  accountId,
  accounts,
  txHex,
  setTxHex,
  txOptions,
  origin,
  onBack,
}: BaseStxTxApproverLayoutProps) {
  const approverWarningSheetRef = useRef<SheetInstance>(null);
  const tx = Codec.Transaction.decode(txHex);
  const fee = tx.fee ?? 0n;
  const nonce = tx.nonce ?? 0n;
  const { changeFeeToastHandler, changeMemoToastHandler, changeNonceToastHandler } =
    useStxTransactionUpdatesHandler();
  const [broadcastedTxid, setBroadcastedTxid] = useState<null | string>(null);
  const network = useCurrentNetworkState();
  const { openUrl } = useOpenUrl();

  useEffect(() => {
    if (tx.postConditionMode === 'allow') {
      approverWarningSheetRef.current?.present();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function changeMemo(memo: string) {
    assertTokenTransferPayload(tx);
    const newTx = await generateStacksUnsignedTransaction({
      txType: TransactionTypes.StxTokenTransfer,
      amount: createMoney(tx.amount, 'STX'),
      fee: createMoney(fee, 'STX'),
      nonce: Number(nonce),
      recipient: tx.recipient,
      memo,
      // Rebuilding must keep sponsored auth, or the approver would try to broadcast a 0-fee tx.
      sponsored: tx.sponsor !== undefined,
      ...txOptions,
    });
    const newTxHex = Codec.Transaction.encode(newTx);
    setTxHex(newTxHex);
  }

  const onChangeMemo = changeMemoToastHandler((memo: string) => void changeMemo(memo));

  const onChangeFee = changeFeeToastHandler((fee: number) => {
    tx.fee = BigInt(fee);
    const newTxHex = Codec.Transaction.encode(tx);
    setTxHex(newTxHex);
  });

  const onChangeNonce = changeNonceToastHandler((nonce: string) => {
    tx.nonce = BigInt(Number(nonce));
    const newTxHex = Codec.Transaction.encode(tx);
    setTxHex(newTxHex);
  });

  const isModifyingDisabled = !!broadcastedTxid;

  return (
    <>
      <Approver requester={origin}>
        <Approver.Container>
          <Approver.Header title={t`Sign Transaction`} />
          {tx.type === 'call' && <AllowModePostConditionWarning txHex={txHex} />}
          {broadcastedTxid && <StxStatusRow txid={broadcastedTxid} />}

          <Approver.Section>
            <ApproverAccountCard
              accounts={accounts.filter(
                acc => makeAccountIdentifer(acc.fingerprint, acc.accountIndex) === accountId
              )}
              displayPreference="stacks"
            />
          </Approver.Section>
          {tx.type === 'transfer' && (
            <Approver.Overview>
              <Approver.Section mb="-3">
                <Approver.Subheader icon={<SentIcon variant="small" />}>
                  {t`You’ll send`}
                </Approver.Subheader>

                <StacksOutcome amount={getTotalSpendMoney(tx, fee)} />
              </Approver.Section>

              <Approver.Section>
                <Approver.Subheader>{t`To address`}</Approver.Subheader>

                <OutcomeAddressesCard addresses={[getTxRecipient(tx)]} />
              </Approver.Section>
            </Approver.Overview>
          )}
          {tx.type === 'call' && accountId && (
            <Approver.Overview>
              <ContractCallPostConditionsSection txHex={txHex} origin={origin} />

              <SipRecipient txHex={txHex} />
            </Approver.Overview>
          )}

          {tx.type === 'call' && <ContractCallSummarySection txHex={txHex} />}
          {tx.type === 'deploy' && <ContractDeploySummarySection txHex={txHex} />}
          <StacksFeesSection
            disabled={isModifyingDisabled}
            txHex={txHex}
            onChangeFee={onChangeFee}
          />
          {tx.type === 'transfer' && (
            <MemoSection memo={tx.memo ?? ''} disabled onChangeMemo={onChangeMemo} />
          )}
          <Approver.Advanced
            titleClosed={t`Show advanced options`}
            titleOpened={t`Hide advanced options`}
          >
            {tx.type === 'call' && <ContractCallArgsSection txHex={txHex} />}
            {tx.type === 'deploy' && <ContractDeployCodeSection txHex={txHex} />}
            <NonceSection
              nonce={(tx.nonce ?? 0n).toString()}
              onChangeNonce={onChangeNonce}
              disabled={isModifyingDisabled}
            />
          </Approver.Advanced>
        </Approver.Container>
        <Approver.Footer>
          <ApproverButtons
            onBack={onBack}
            onClose={onCloseApprover}
            onApprove={async () => {
              const txid = await onApprove();
              setBroadcastedTxid(txid);
            }}
            onCopy={() => {
              if (!broadcastedTxid) return;
              void Clipboard.setStringAsync(broadcastedTxid);
            }}
            onViewDetails={() => {
              if (!broadcastedTxid) return;

              const activityLink = makeActivityLink({
                txid: broadcastedTxid,
                networkPreference: network,
                asset: stxAsset,
              });

              if (!activityLink) return;

              openUrl(activityLink);
              onCloseApprover();
            }}
          />
        </Approver.Footer>
      </Approver>
      <AllowModeWarningSheet ref={approverWarningSheetRef} onDismiss={onCloseApprover} />
    </>
  );
}
