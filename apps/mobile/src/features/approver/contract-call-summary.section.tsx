import { assertContractCallPayload, getContractAddress } from '@/features/approver/utils';
import { Codec } from '@jannik-stacks/kit';

import { Approver, Box, Text } from '@leather.io/ui/native';

export function ContractCallSummarySection({ txHex }: { txHex: string }) {
  const tx = Codec.Transaction.decode(txHex);
  assertContractCallPayload(tx);

  const contractAddress = getContractAddress(tx);
  const { functionName } = tx;
  const contractName = tx.contract.split('.')[1] ?? '';

  return (
    <Approver.Section>
      <Box gap="4">
        <Text variant="label01">{functionName}</Text>
        <Text variant="body02">{contractAddress + '.' + contractName}</Text>
      </Box>
    </Approver.Section>
  );
}
