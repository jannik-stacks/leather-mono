import { type PostCondition } from '@jannik-stacks/kit';

import { Approver, Box, CircledFunctionIcon } from '@leather.io/ui/native';

import { formatPoxPostConditionMessage } from './post-conditions.utils';

interface PoxPostConditionProps {
  stacksAddress: string;
  postCondition: Extract<PostCondition, { type: 'pox-postcondition' }>;
}

export function PoxPostCondition({ stacksAddress, postCondition }: PoxPostConditionProps) {
  const isContractPrincipal = postCondition.address.includes('.');

  const title = formatPoxPostConditionMessage({
    stacksAddress,
    isContractPrincipal,
    postCondition,
  });
  return (
    <Box>
      <Approver.Subheader icon={<CircledFunctionIcon variant="small" />}>
        {title}
      </Approver.Subheader>
    </Box>
  );
}
