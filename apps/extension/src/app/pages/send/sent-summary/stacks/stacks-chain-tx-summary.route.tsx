import { Navigate, useParams } from 'react-router';

import { Codec } from '@jannik-stacks/kit';
import z from 'zod';

import { useRouteState } from '@app/common/hooks/use-route-state';
import { StacksChainTxSummaryLoader } from '@app/pages/send/sent-summary/stacks/stacks-chain-tx-summary.loader';

import { Sip10SentSummary, StxSentSummary } from './stacks-chain-tx-summary';
import { StacksChainTxSummaryLoading } from './stacks-chain-tx-summary.layout';

const routeParamsSchema = z.object({
  symbol: z.string(),
  txid: z.string(),
});

const stacksChainTxSummaryRouteStateSchema = z
  .object({ tx: z.string().optional() })
  .nullish()
  .catch(null);

export function StacksChainTxSummaryRoute() {
  const { data: params } = routeParamsSchema.safeParse(useParams());
  const tx = useRouteState(stacksChainTxSummaryRouteStateSchema)?.tx;

  if (!params) return <Navigate to="/" replace />;

  const SummaryComponent =
    params.symbol.toUpperCase() === 'STX' ? StxSentSummary : Sip10SentSummary;

  if (!tx) {
    return (
      <StacksChainTxSummaryLoader
        txid={params.txid}
        fallback={<StacksChainTxSummaryLoading txid={params.txid} />}
      >
        {({ rawTx }) => <SummaryComponent {...params} tx={Codec.Transaction.decode(rawTx)} />}
      </StacksChainTxSummaryLoader>
    );
  }

  return <SummaryComponent {...params} tx={Codec.Transaction.decode(tx)} />;
}
