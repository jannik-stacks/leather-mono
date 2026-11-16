import { Address } from '@jannik-stacks/kit';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

import { EMILY_API_BASE_URL_MAINNET } from '@leather.io/models';

export type SbtcStatus = 'pending' | 'accepted' | 'confirmed' | 'failed' | 'rbf';

export interface SbtcDeposit {
  amount: number;
  bitcoinTxOutputIndex: number;
  bitcoinTxid: string;
  depositScript: string;
  lastUpdateBlockHash: string;
  lastUpdateHeight: number;
  recipient: string; // Stacks address
  reclaimScript: string;
  status: SbtcStatus;
}

interface GetSbtcDepositsResponse {
  deposits: SbtcDeposit[];
  nextToken?: string;
}

async function getSbtcDeposits(apiUrl: string, status: string): Promise<GetSbtcDepositsResponse> {
  const resp = await axios.get<GetSbtcDepositsResponse>(`${apiUrl}/deposit?status=${status}`, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
  return resp.data;
}

function useGetSbtcDeposits(stxAddress: string, status: string) {
  return useQuery({
    queryKey: ['get-sbtc-deposits', EMILY_API_BASE_URL_MAINNET, stxAddress, status],
    queryFn: () => getSbtcDeposits(EMILY_API_BASE_URL_MAINNET, status),
    select: resp =>
      resp.deposits.filter(deposit => {
        const recipient = Address.stringify({
          version: Number.parseInt(deposit.recipient.slice(2, 4), 16),
          hash160: deposit.recipient.slice(4, 44),
        });
        return recipient === stxAddress;
      }),
  });
}

export function useSbtcPendingDeposits(stxAddress: string) {
  const { data: pendingDeposits = [], isLoading: isLoadingStatusPending } = useGetSbtcDeposits(
    stxAddress,
    'pending'
  );
  const { data: acceptedDeposits = [], isLoading: isLoadingStatusAccepted } = useGetSbtcDeposits(
    stxAddress,
    'accepted'
  );

  return {
    isLoading: isLoadingStatusPending || isLoadingStatusAccepted,
    pendingSbtcDeposits: [...pendingDeposits, ...acceptedDeposits],
  };
}

export function useSbtcFailedDeposits(stxAddress: string) {
  const { data: failedSbtcDeposits = [], isLoading } = useGetSbtcDeposits(stxAddress, 'failed');

  return { isLoading, failedSbtcDeposits };
}
