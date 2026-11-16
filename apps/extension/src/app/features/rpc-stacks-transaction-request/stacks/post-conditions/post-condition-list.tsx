import { type PostCondition } from '@jannik-stacks/kit';
import { Stack } from 'leather-styles/jsx';

import { FungiblePostConditionItem } from './fungible-post-condition-item';
import { PostConditionItem } from './post-condition-item';
import { PoxPostConditionItem } from './pox-post-condition-item';

interface PostConditionListProps {
  postConditions: PostCondition[];
}
// TODO LEA-2439: Refactor post conditions
export function PostConditionList({ postConditions }: PostConditionListProps) {
  return (
    <Stack gap="space.04">
      {postConditions.map((pc, index) => {
        if (pc.type === 'ft-postcondition') {
          return (
            <FungiblePostConditionItem
              key={`${pc.type}-${pc.condition}`}
              isContractPrincipal={pc.address.includes('.')}
              isLast={index === postConditions.length - 1}
              postCondition={pc}
            />
          );
        }
        if (pc.type === 'stx-postcondition' || pc.type === 'nft-postcondition') {
          return (
            <PostConditionItem
              key={`${pc.type}-${pc.condition}`}
              isContractPrincipal={pc.address.includes('.')}
              isLast={index === postConditions.length - 1}
              postCondition={pc}
            />
          );
        }
        if (pc.type === 'staking-postcondition') {
          return (
            <PostConditionItem
              key={`${pc.type}-${pc.condition}`}
              context="stake"
              isContractPrincipal={pc.address.includes('.')}
              isLast={index === postConditions.length - 1}
              postCondition={pc}
            />
          );
        }
        if (pc.type === 'pox-postcondition') {
          return (
            <PoxPostConditionItem
              key={`${pc.type}-${pc.condition}`}
              isContractPrincipal={pc.address.includes('.')}
              isLast={index === postConditions.length - 1}
              postCondition={pc}
            />
          );
        }
        return null;
      })}
    </Stack>
  );
}
