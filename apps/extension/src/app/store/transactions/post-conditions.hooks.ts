import { type PostCondition } from '@jannik-stacks/kit';

import { useGetSip10AssetByPrincipalQuery } from '@app/query/stacks/sip10/sip10-asset.query';

export function useAssetFromFungiblePostCondition(
  pc: Extract<PostCondition, { type: 'ft-postcondition' }>
) {
  const contractId = pc.asset.split('::')[0] ?? '';
  const { data: asset } = useGetSip10AssetByPrincipalQuery(contractId);

  return asset;
}
