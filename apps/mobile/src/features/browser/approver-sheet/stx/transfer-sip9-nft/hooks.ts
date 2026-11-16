import { useCallback } from 'react';

import { getApproverFee } from '@/features/approver/utils';
import { useStacksSigners } from '@/store/keychains/stacks/stacks-keychains.read';
import { assertStacksSigner } from '@/store/keychains/stacks/utils';
import { Cl, Codec, Pc, type StacksNetwork } from '@jannik-stacks/kit';
import { bytesToHex } from '@stacks/common';

import { type RpcRequest, type stxTransferSip9Nft } from '@leather.io/rpc';
import {
  TransactionTypes,
  createSip9FnArgs,
  formatAssetString,
  generateStacksUnsignedTransaction,
  getStacksAssetStringParts,
} from '@leather.io/stacks';
import { useOnMount } from '@leather.io/ui/native';

interface UseTransferSip9NftTxHex {
  request: RpcRequest<typeof stxTransferSip9Nft>;
  setTxHex(txHex: string): void;
  nonce: number;
  accountId: string;
  network: StacksNetwork;
}

export function useTransferSip9NftTxHex({
  request,
  accountId,
  setTxHex,
  nonce,
  network,
}: UseTransferSip9NftTxHex) {
  const { fromAccountId } = useStacksSigners();

  const getTxHex = useCallback(
    async function getTxHex() {
      const signer = fromAccountId(accountId)[0];
      const fee = getApproverFee(request.params.sponsored);

      assertStacksSigner(signer);
      const { contractAddress, contractAssetName, contractName } = getStacksAssetStringParts(
        request.params.asset
      );

      const currentStacksAddress = signer.address;

      const fnArgs = createSip9FnArgs({
        assetId: request.params.assetId,
        senderStacksAddress: currentStacksAddress,
        recipientStacksAddress: request.params.recipient,
      });

      const tx = await generateStacksUnsignedTransaction({
        txType: TransactionTypes.ContractCall,
        publicKey: bytesToHex(signer.publicKey),
        contractAddress,
        contractName,
        functionArgs: fnArgs.map(arg => Cl.serialize(arg)),
        functionName: 'transfer',
        nonce,
        fee,
        network,
        sponsored: request.params.sponsored,
        postConditions: [
          Pc.principal(currentStacksAddress)
            .willSendAsset()
            .nft(
              formatAssetString({
                contractName,
                contractAddress,
                assetName: contractAssetName,
              }),
              Cl.deserialize(request.params.assetId)
            ),
        ],
      });
      const txHex = Codec.Transaction.encode(tx);
      return txHex;
    },
    [
      fromAccountId,
      request.params.asset,
      request.params.assetId,
      request.params.recipient,
      request.params.sponsored,
      accountId,
      nonce,
      network,
    ]
  );
  async function loadTxHex() {
    setTxHex(await getTxHex());
  }

  useOnMount(() => {
    void loadTxHex();
  });
}
