import { Cl, type PostCondition } from '@jannik-stacks/kit';
import BN from 'bn.js';

import { formatAssetString } from '@leather.io/stacks';

interface FtPostConditionsOptions {
  amount: string | number;
  contractAddress: string;
  contractAssetName: string;
  contractName: string;
  stxAddress: string;
}
export function makeFtPostCondition(options: FtPostConditionsOptions): PostCondition {
  const { amount, contractAddress, contractAssetName, contractName, stxAddress } = options;

  return {
    type: 'ft-postcondition',
    address: stxAddress,
    condition: 'eq',
    amount: BigInt(new BN(amount, 10).toString()),
    asset: formatAssetString({ contractAddress, contractName, assetName: contractAssetName }),
  };
}

interface NftPostConditionsOptions {
  assetId: string;
  contractAddress: string;
  contractAssetName: string;
  contractName: string;
  stxAddress: string;
}
export function makeNftPostCondition(options: NftPostConditionsOptions): PostCondition {
  const { assetId, contractAddress, contractAssetName, contractName, stxAddress } = options;

  return {
    type: 'nft-postcondition',
    address: stxAddress,
    condition: 'sent',
    asset: formatAssetString({ contractAddress, contractName, assetName: contractAssetName }),
    assetId: Cl.deserialize(assetId),
  };
}
