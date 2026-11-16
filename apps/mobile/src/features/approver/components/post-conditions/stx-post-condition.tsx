import { type PostCondition } from '@jannik-stacks/kit';

import { Approver, Box, CircledFunctionIcon } from '@leather.io/ui/native';
import { createMoney } from '@leather.io/utils';

import { StacksOutcome } from '../stacks-outcome';
import { formatPostConditionMessage } from './post-conditions.utils';

interface StxPostConditionProps {
  stacksAddress: string;
  postCondition: Extract<PostCondition, { type: 'stx-postcondition' }>;
}

export function StxPostCondition({ stacksAddress, postCondition }: StxPostConditionProps) {
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
      <StacksOutcome amount={createMoney(postCondition.amount, 'STX')} />
    </Box>
  );
}
