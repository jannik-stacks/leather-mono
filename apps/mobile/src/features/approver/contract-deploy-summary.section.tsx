import { Codec } from '@jannik-stacks/kit';

import { Approver, Box, Text } from '@leather.io/ui/native';

import { assertContractDeployPayload } from './utils';

export function ContractDeploySummarySection({ txHex }: { txHex: string }) {
  const tx = Codec.Transaction.decode(txHex);
  assertContractDeployPayload(tx);

  const { name: contractName } = tx;

  return (
    <Approver.Section>
      <Box gap="4">
        <Text variant="label01">{contractName}</Text>
      </Box>
    </Approver.Section>
  );
}
