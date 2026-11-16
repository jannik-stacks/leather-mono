import { useCallback } from 'react';
import { useAsync } from 'react-async-hook';

import {
  Cl,
  type ClarityValue,
  type StacksNetwork,
  createClient,
  getNextNonce,
  publicKeyToAddress,
} from '@jannik-stacks/kit';
import { z } from 'zod';

import { type Sip10Asset } from '@leather.io/models';
import {
  TransactionTypes,
  generateStacksUnsignedTransaction,
  getStacksAssetStringParts,
  inferPrincipalTypeFromAddress,
} from '@leather.io/stacks';
import { createMoney, stxToMicroStx, unitToFractionalUnit } from '@leather.io/utils';

import { logger } from '@shared/logger';
import {
  type StacksSendFormValues,
  type StacksTransactionFormValues,
} from '@shared/models/form.model';
import { makeFtPostCondition } from '@shared/utils/post-conditions';

import {
  buildUnsignedPolicySip10Transfer,
  buildUnsignedPolicyStxTransfer,
} from '@app/features/multisig/build-policy-stacks-transfer';
import { useNextNonce } from '@app/query/stacks/nonce/account-nonces.hooks';
import { useCurrentStacksNetworkState } from '@app/store/networks/networks.hooks';
import { useCurrentPolicy } from '@app/store/policy/policy.selectors';

import {
  useCurrentStacksAccount,
  useCurrentStacksAccountAddress,
} from '../accounts/blockchain/stacks/stacks-account.hooks';

function createPrincipalCV(principal: string) {
  const principalType = inferPrincipalTypeFromAddress(principal);

  if (principalType === 'contract') {
    const [address, contractName] = principal.split('.');
    return Cl.contract(`${address}.${contractName}`);
  }

  if (principalType === 'standard') return Cl.address(principal);

  throw new Error(`Invalid principal: ${principal}`);
}

interface GenerateWithResolvedNonceArgs {
  nonce?: number;
  publicKey: string;
  network: StacksNetwork;
}

async function generateWithResolvedNonce<T>(
  { nonce, publicKey, network }: GenerateWithResolvedNonceArgs,
  generate: (nonce: number | string) => Promise<T>
) {
  if (nonce !== undefined) return generate(nonce);
  const client = createClient({ network });
  const address = publicKeyToAddress(publicKey, { network });
  const fetchedNonce = await getNextNonce(client, { address }).catch(async () => {
    const url = `${client.baseUrl}/v2/accounts/${address}?proof=0`;
    const response = await client.fetch(url);
    if (!response.ok) {
      const message = await response.text().catch(() => undefined);
      throw new Error(
        `Error fetching nonce. Response ${response.status}: ${response.statusText}. Attempted to fetch ${url} and failed with the message: "${message ?? ''}"`
      );
    }
    return z.object({ nonce: z.coerce.bigint() }).parse(await response.json()).nonce;
  });
  return generate(fetchedNonce.toString());
}

function formValueToStxMoney(value: number | string | undefined) {
  if (!value) return undefined;
  return createMoney(stxToMicroStx(value), 'STX');
}

export function useGenerateStxTokenTransferUnsignedTx() {
  const account = useCurrentStacksAccount();
  const stxAddress = useCurrentStacksAccountAddress();
  const { data: nextNonce } = useNextNonce(stxAddress);
  const network = useCurrentStacksNetworkState();
  const policy = useCurrentPolicy();

  return useCallback(
    async (values?: StacksSendFormValues) => {
      if (!account) return;

      if (policy?.chain === 'stacks') {
        if (!policy.publicKeys.includes(account.stxPublicKey)) {
          logger.error('Current account is not a signer of this multisig policy');
          return;
        }
        return buildUnsignedPolicyStxTransfer({
          policy,
          network,
          recipient: values?.recipient || policy.address,
          amount: formValueToStxMoney(values?.amount),
          fee: formValueToStxMoney(values?.fee),
          memo: values?.memo || undefined,
        });
      }

      return generateWithResolvedNonce(
        {
          nonce: values?.nonce ? Number(values.nonce) : nextNonce?.nonce,
          publicKey: account.stxPublicKey,
          network,
        },
        nonce =>
          generateStacksUnsignedTransaction({
            txType: TransactionTypes.StxTokenTransfer,
            publicKey: account.stxPublicKey,
            nonce,
            fee: formValueToStxMoney(values?.fee) ?? createMoney(0, 'STX'),
            recipient: values?.recipient ?? account.address,
            amount: createMoney(values?.amount ? stxToMicroStx(values?.amount) : 0, 'STX'),
            memo: values?.memo || undefined,
            network,
          })
      );
    },
    [account, nextNonce, network, policy]
  );
}

export function useStxTokenTransferUnsignedTxState(values?: StacksSendFormValues) {
  const generateTx = useGenerateStxTokenTransferUnsignedTx();
  const account = useCurrentStacksAccount();
  const stxAddress = useCurrentStacksAccountAddress();
  const { data: nextNonce } = useNextNonce(stxAddress);
  const network = useCurrentStacksNetworkState();
  const policy = useCurrentPolicy();

  const tx = useAsync(
    async () => generateTx(values ?? undefined),
    [values, network, account, nextNonce, policy]
  );

  return tx.result;
}

export function useGenerateFtTokenTransferUnsignedTx(info: Sip10Asset) {
  const account = useCurrentStacksAccount();
  const stxAddress = useCurrentStacksAccountAddress();
  const { data: nextNonce } = useNextNonce(stxAddress);
  const network = useCurrentStacksNetworkState();
  const policy = useCurrentPolicy();
  const { assetId } = info;
  const { contractAddress, contractAssetName, contractName } = getStacksAssetStringParts(assetId);
  return useCallback(
    async (values?: StacksSendFormValues | StacksTransactionFormValues) => {
      try {
        if (!account) return;

        if (policy?.chain === 'stacks') {
          if (!policy.publicKeys.includes(account.stxPublicKey)) {
            logger.error('Current account is not a signer of this multisig policy');
            return;
          }
          const amountInBaseUnits =
            values && 'amount' in values && values.amount
              ? unitToFractionalUnit(info.decimals)(values.amount).toString(10)
              : undefined;
          return await buildUnsignedPolicySip10Transfer({
            policy,
            network,
            assetId,
            recipient:
              values && 'recipient' in values && values.recipient
                ? values.recipient
                : policy.address,
            baseUnitAmount: amountInBaseUnits,
            fee: formValueToStxMoney(values?.fee),
            memo: values && 'memo' in values && values.memo !== '' ? values.memo : undefined,
          });
        }

        const functionName = 'transfer';
        const recipientAddressClarityValue =
          values && 'recipient' in values
            ? createPrincipalCV(values.recipient)
            : Cl.address('SP000000000000000000002Q6VF78');
        const amount = values && 'amount' in values ? values.amount : 0;
        const memo =
          values && 'memo' in values && values.memo
            ? Cl.some(Cl.buffer(new TextEncoder().encode(values.memo)))
            : Cl.none();

        const amountAsFractionalUnit = unitToFractionalUnit(info.decimals)(amount).toString(10);
        const postConditionOptions = {
          amount: amountAsFractionalUnit,
          contractAddress,
          contractAssetName,
          contractName,
          stxAddress: account.address,
        };

        const postConditions = [makeFtPostCondition(postConditionOptions)];

        const functionArgs: ClarityValue[] = [
          Cl.uint(amountAsFractionalUnit),
          createPrincipalCV(account.address),
          recipientAddressClarityValue,
        ];

        functionArgs.push(memo);

        return generateWithResolvedNonce(
          {
            nonce: values?.nonce ? Number(values.nonce) : nextNonce?.nonce,
            publicKey: account.stxPublicKey,
            network,
          },
          nonce =>
            generateStacksUnsignedTransaction({
              txType: TransactionTypes.ContractCall,
              contractAddress,
              contractName,
              functionName,
              functionArgs: functionArgs.map(arg => Cl.serialize(arg)),
              postConditions,
              postConditionMode: 'deny',
              network,
              publicKey: account.stxPublicKey,
              fee: formValueToStxMoney(values?.fee) ?? createMoney(0, 'STX'),
              nonce,
            })
        );
      } catch (error) {
        logger.error('Failed to generate unsigned transaction', error);
        return;
      }
    },
    [
      account,
      info.decimals,
      network,
      nextNonce?.nonce,
      contractName,
      contractAssetName,
      contractAddress,
      policy,
      assetId,
    ]
  );
}

export function useFtTokenTransferUnsignedTx(info: Sip10Asset) {
  const account = useCurrentStacksAccount();
  const generateTx = useGenerateFtTokenTransferUnsignedTx(info);

  const tx = useAsync(async () => generateTx(), [account, generateTx]);
  return tx.result;
}
