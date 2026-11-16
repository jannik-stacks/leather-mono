import { useMemo } from 'react';

import {
  Codec,
  type StacksNetwork,
  type StacksTransaction,
  createClient,
} from '@jannik-stacks/kit';
import { z } from 'zod';

import { type BitcoinNativeSegwitPayer } from '@leather.io/bitcoin';
import { type NetworkModes, bitcoinNetworkToNetworkMode } from '@leather.io/models';
import {
  getBitcoinCoinSelectionService,
  getBitcoinTransactionFeesService,
  getMarketDataService,
  getMempoolApiClient,
  getStacksTransactionFeesService,
  getSwapService,
} from '@leather.io/services';
import { type StacksSigner } from '@leather.io/stacks';
import {
  type SwapDependencies,
  SwapSigningCancelledError,
  broadcastBitcoinTransaction,
} from '@leather.io/state/swap';
import { assertExistence } from '@leather.io/utils';

import { useRefreshAllAccountData } from '@app/common/hooks/account/use-refresh-all-account-data';
import { useNextNonce } from '@app/query/stacks/nonce/account-nonces.hooks';
import { hiroFetchWrapper } from '@app/query/stacks/stacks-client';
import { useAccountAddresses } from '@app/services/accounts/use-account-addresses';
import { useCurrentAccountId } from '@app/store/accounts/account';
import { useSignBitcoinTx } from '@app/store/accounts/blockchain/bitcoin/bitcoin.hooks';
import { useCurrentAccountNativeSegwitIndexZeroPayerNullable } from '@app/store/accounts/blockchain/bitcoin/native-segwit-account.hooks';
import {
  useCurrentStacksAccount,
  useCurrentStacksAccountAddress,
} from '@app/store/accounts/blockchain/stacks/stacks-account.hooks';
import { useCurrentStacksNetworkState } from '@app/store/networks/networks.hooks';
import { useCurrentNetwork } from '@app/store/networks/networks.selectors';
import { useSignStacksTransaction } from '@app/store/transactions/transaction.hooks';

import { isSigningCancelledError } from '../swap-utils';

// This file is mostly vibed to be able to plug useSwapState and move forward with the UI work
// TODO: Needs a careful rewrite.

const accountDataRefreshDelayMs = 250;

interface BroadcastStacksTransactionParams {
  tx: StacksTransaction;
  stacksNetwork: StacksNetwork;
}

async function broadcastStacksTx({
  tx,
  stacksNetwork,
}: BroadcastStacksTransactionParams): Promise<{ txid: string }> {
  const { data, error } = await createClient({
    network: stacksNetwork,
    fetch: hiroFetchWrapper,
  }).api.POST('/v2/transactions', {
    body: Codec.Transaction.encode(tx),
    bodySerializer(tx) {
      return JSON.stringify({ tx });
    },
    headers: { 'Content-Type': 'application/json' },
    parseAs: 'text',
  });
  const txid = typeof data === 'string' ? data.replace(/["]+/g, '') : undefined;
  if (typeof data === 'string' && (txid === undefined || !/^(?:0x)?[a-f0-9]{64}$/i.test(txid)))
    throw new Error(data);
  const response = z
    .object({
      txid: z.string().optional(),
      error: z.string().optional(),
      reason: z.string().optional(),
    })
    .loose()
    .parse(error ?? { txid });

  if (response.error !== undefined) {
    throw new Error(response.reason);
  }

  if (!response.txid) {
    throw new Error('Broadcast returned no txid');
  }

  return { ...response, txid: response.txid };
}

export function useSwapDependencies(): SwapDependencies {
  const currentAccountId = useCurrentAccountId();
  const accountAddresses = useAccountAddresses(currentAccountId);
  const stacksAccount = useCurrentStacksAccount();
  const stacksNetwork = useCurrentStacksNetworkState();
  const network = useCurrentNetwork();
  const signStacksTx = useSignStacksTransaction({ settleOnRejection: true });
  const stxAddress = useCurrentStacksAccountAddress();
  const { data: nextNonce } = useNextNonce(stxAddress);
  const nativeSegwitSigner = useCurrentAccountNativeSegwitIndexZeroPayerNullable();
  const signBitcoinTx = useSignBitcoinTx({ settleOnRejection: true });
  const refreshAllAccountData = useRefreshAllAccountData();

  const bitcoinNetworkMode = bitcoinNetworkToNetworkMode(network.chain.bitcoin.bitcoinNetwork);
  const stacksNetworkMode: NetworkModes = bitcoinNetworkMode === 'mainnet' ? 'mainnet' : 'testnet';

  assertExistence(stacksAccount, 'Stacks account missing during swap initialization');
  assertExistence(
    currentAccountId.fingerprint,
    'Wallet fingerprint missing during swap initialization'
  );

  const stacksSigner: StacksSigner = useMemo(() => {
    return {
      descriptor: '',
      keyOrigin: '',
      derivationPath: '',
      address: stacksAccount.address,
      accountIndex: currentAccountId.accountIndex,
      network: stacksNetworkMode,
      publicKey: Uint8Array.from(Buffer.from(stacksAccount.stxPublicKey, 'hex')),
      async sign(tx: StacksTransaction) {
        const result = signStacksTx(tx);
        const signed = await Promise.resolve(result);
        if (!signed) throw new SwapSigningCancelledError();
        return signed;
      },
      signMessage() {
        throw new Error('signMessage not used in swap');
      },
      signStructuredMessage() {
        throw new Error('signStructuredMessage not used in swap');
      },
    };
  }, [stacksAccount, currentAccountId, stacksNetworkMode, signStacksTx]);

  const bitcoinPayer: BitcoinNativeSegwitPayer | undefined = useMemo(() => {
    if (!nativeSegwitSigner) return undefined;
    return {
      paymentType: 'p2wpkh',
      network: bitcoinNetworkMode,
      address: nativeSegwitSigner.address,
      keyOrigin: nativeSegwitSigner.keyOrigin,
      masterKeyFingerprint: String(currentAccountId.fingerprint),
      publicKey: nativeSegwitSigner.publicKey,
      payment: nativeSegwitSigner.payment,
    };
  }, [nativeSegwitSigner, bitcoinNetworkMode, currentAccountId.fingerprint]);

  return {
    accountRequest: { account: accountAddresses },
    services: {
      stacksTransactionFeesService: getStacksTransactionFeesService(),
      marketDataService: getMarketDataService(),
      bitcoinTransactionFeesService: getBitcoinTransactionFeesService(),
      bitcoinCoinSelectionService: getBitcoinCoinSelectionService(),
      swapService: getSwapService(),
    },
    stacks: {
      stacksNetwork,
      stacksSigner,
      broadcast: broadcastStacksTx,
      nextNonce,
    },
    bitcoin: bitcoinPayer
      ? {
          network,
          bitcoinPayer,
          async signBitcoinPsbt(psbt: Uint8Array) {
            const signed = await Promise.resolve(signBitcoinTx(psbt));
            if (!signed) throw new SwapSigningCancelledError();
            return signed;
          },
          broadcast: (txHex: string) => broadcastBitcoinTransaction(getMempoolApiClient(), txHex),
        }
      : undefined,
    onSwapSubmitted() {
      void refreshAllAccountData(accountDataRefreshDelayMs);
    },
    isSigningCancelledError,
  };
}
