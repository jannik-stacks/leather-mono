import { Loading } from '@/components/loading/loading';
import { TokenCell } from '@/features/token/components/token-cell';
import { useSip10FtMetadata } from '@/queries/assets/sip10-asset.query';
import { type PostCondition } from '@jannik-stacks/kit';

import {
  Approver,
  Box,
  Cell,
  CircledFunctionIcon,
  Sip10AvatarIcon,
  Text,
} from '@leather.io/ui/native';

import { AssetOutcomeBalance } from '../asset-outcome';
import { formatPostConditionMessage } from './post-conditions.utils';

interface FTPostConditionProps {
  stacksAddress: string;
  postCondition: Extract<PostCondition, { type: 'ft-postcondition' }>;
}

export function FTPostCondition({ stacksAddress, postCondition }: FTPostConditionProps) {
  const contractId = postCondition.asset.split('::')[0] ?? '';
  const [, contractName = ''] = contractId.split('.');
  const asset = useSip10FtMetadata(contractId);

  const isContractPrincipal = postCondition.address.includes('.');

  const title = formatPostConditionMessage({
    stacksAddress,
    isContractPrincipal,
    postCondition,
  });

  return (
    <Box>
      <Approver.Subheader icon={<CircledFunctionIcon variant="small" />}>
        {title}
      </Approver.Subheader>
      {asset.isLoading && <Loading />}
      {asset.data && <AssetOutcomeBalance asset={asset.data} amount={postCondition.amount} />}
      {!asset.isLoading && !asset.data && (
        <TokenCell
          mx="-5"
          icon={
            <Sip10AvatarIcon contractId={contractId} imageCanonicalUri="" name={contractName} />
          }
          tokenName={contractName}
          ticker={contractId}
          asideComponent={
            <Cell.Aside>
              <Cell.Label variant="primary">
                <Text variant="label02">{postCondition.amount.toString()}</Text>
              </Cell.Label>
            </Cell.Aside>
          }
        />
      )}
    </Box>
  );
}
