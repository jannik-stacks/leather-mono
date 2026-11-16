import { type StacksTransaction } from '@jannik-stacks/kit';

import { baseCurrencyAmountInQuote, createMoney, isNumber, sumMoney } from '@leather.io/utils';

import { formatCurrency } from '@app/common/currency-formatter';
import {
  getContractAddressFromContractCallPayload,
  getNonceFromStacksTransaction,
  getRecipientFromStacksTransaction,
  getSip10MemoDisplayText,
  getSip10TransferAmount,
  getSip10TransferPayload,
  getStacksTransactionFee,
  getTokenTransferAmount,
  getTokenTransferMemoDisplayText,
  safeAddressToString,
} from '@app/common/transactions/stacks/transaction.utils';
import { TxStatusBadge } from '@app/features/tx-status-badge/tx-status-badge';
import { useCryptoCurrencyMarketData } from '@app/query/common/market-data/market-data.hooks';
import { useGetFungibleTokenMetadataQuery } from '@app/query/stacks/token-metadata/fungible-tokens/fungible-token-metadata.query';

import {
  StacksChainTxSummaryLayout,
  StacksChainTxSummaryLoading,
} from './stacks-chain-tx-summary.layout';

interface StacksChainSummaryProps {
  txid: string;
  symbol: string;
  tx: StacksTransaction;
}
export function StxSentSummary({ txid, tx }: StacksChainSummaryProps) {
  const tokenMarketData = useCryptoCurrencyMarketData('STX');

  if (tx.type !== 'transfer')
    throw new Error('Impossible state, STX transfers are always of type `token_transfer`');

  const amount = getTokenTransferAmount(tx);
  const fiatAmount = baseCurrencyAmountInQuote(amount, tokenMarketData);
  const fee = getStacksTransactionFee(tx);
  const total = sumMoney([amount, fee]);
  const memo = getTokenTransferMemoDisplayText(tx) || '—';

  return (
    <StacksChainTxSummaryLayout
      value={amount}
      txFiatValue={formatCurrency(fiatAmount)}
      recipient={safeAddressToString(tx.recipient) ?? undefined}
      token="STX"
      txid={txid}
      metadata={[
        ['Status', <TxStatusBadge key={txid} txid={txid} />],
        ['Total spend', formatCurrency(total)],
        ['Sending', formatCurrency(createMoney(Number(tx.amount), 'STX'))],
        ['Fee', formatCurrency(fee)],
        ['Memo', memo],
        ['Nonce', getNonceFromStacksTransaction(tx)],
      ]}
    />
  );
}

export function Sip10SentSummary({ txid, symbol, tx }: StacksChainSummaryProps) {
  const sip10Payload = getSip10TransferPayload(tx);
  if (!sip10Payload) throw new Error('Impossible state, not a SIP-10 transfer');
  const contract = getContractAddressFromContractCallPayload(sip10Payload);

  // Type casting because monorepo returns inaccurate type
  const { data: tokenMetadata } = useGetFungibleTokenMetadataQuery(contract);

  if (!tokenMetadata || !('decimals' in tokenMetadata))
    return <StacksChainTxSummaryLoading txid={txid} />;

  const amount = getSip10TransferAmount(
    sip10Payload,
    symbol,
    isNumber(tokenMetadata.decimals) ? tokenMetadata.decimals : 0
  );
  const recipient = getRecipientFromStacksTransaction(tx) ?? undefined;
  const fee = getStacksTransactionFee(tx);
  const memo = getSip10MemoDisplayText(sip10Payload) || '—';

  return (
    <StacksChainTxSummaryLayout
      token={symbol}
      txid={txid}
      value={amount}
      recipient={recipient}
      metadata={[
        ['Status', <TxStatusBadge key={txid} txid={txid} />],
        ['Fee', formatCurrency(fee)],
        ['Memo', memo],
        ['Nonce', getNonceFromStacksTransaction(tx)],
      ]}
    />
  );
}
