import { type PostCondition } from '@jannik-stacks/kit';

import { Approver, Box, Cell, CircledFunctionIcon, Sip10AvatarIcon } from '@leather.io/ui/native';
import { truncateMiddle } from '@leather.io/utils';

import { formatPostConditionMessage } from './post-conditions.utils';

interface NFTPostConditionProps {
  stacksAddress: string;
  postCondition: Extract<PostCondition, { type: 'nft-postcondition' }>;
}

export function NFTPostCondition({ stacksAddress, postCondition }: NFTPostConditionProps) {
  const contractId = postCondition.asset.split('::')[0] ?? '';
  const [contractAddress = '', contractName = ''] = contractId.split('.');
  const assetName = postCondition.asset.split('::')[1] ?? '';
  const visibleAssetId = `${truncateMiddle(contractAddress, 4)}.${contractName}::${assetName}`;
  const isContractPrincipal = postCondition.address.includes('.');
  const title = formatPostConditionMessage({
    stacksAddress,
    isContractPrincipal,
    postCondition,
  });

  const icon = (
    <Sip10AvatarIcon
      variant="square"
      indicator="stacksIcon"
      name={contractName}
      contractId={contractId}
      imageCanonicalUri=""
    />
  );

  return (
    <Box>
      <Approver.Subheader icon={<CircledFunctionIcon variant="small" />}>
        {title}
      </Approver.Subheader>

      <Cell.Root px="0" pressable={true}>
        <Cell.Icon>{icon}</Cell.Icon>
        <Cell.Content flexShrink={0}>
          <Cell.Label variant="primary" numberOfLines={1} ellipsizeMode="tail">
            {assetName}
          </Cell.Label>
        </Cell.Content>
        <Cell.Aside flexShrink={1}>
          <Cell.Label variant="secondary" ellipsizeMode="tail" numberOfLines={2} textAlign="right">
            {visibleAssetId}
          </Cell.Label>
        </Cell.Aside>
      </Cell.Root>
    </Box>
  );
}
