import { useGetContractInterface } from '@/queries/stacks/contract-interface.query';
import { Codec } from '@jannik-stacks/kit';
import { t } from '@lingui/core/macro';

import { formatClarityValue } from '@leather.io/stacks';
import { Approver, Box, Text } from '@leather.io/ui/native';

import { assertContractCallPayload, getContractAddress } from './utils';

export function ContractCallArgsSection({ txHex }: { txHex: string }) {
  const tx = Codec.Transaction.decode(txHex);
  assertContractCallPayload(tx);

  const contractAddress = getContractAddress(tx);
  const { args: functionArgs = [], functionName } = tx;
  const contractName = tx.contract.split('.')[1] ?? '';

  const { data } = useGetContractInterface(contractAddress, contractName);

  return (
    <Approver.Section>
      <Box>
        <Text>{t`Contract arguments`}</Text>
      </Box>
      <Box>
        {functionArgs.map((fa, index) => {
          const strValue = formatClarityValue(fa);
          const func = data?.functions.find(fn => fn.name === functionName);
          const argumentNumber = index + 1;
          return (
            <Box key={strValue}>
              <Text variant="caption01" color="ink.text-subdued">
                {func?.args[index]?.name ?? t`Argument ${argumentNumber}`}
              </Text>
              <Text variant="label01">{strValue}</Text>
            </Box>
          );
        })}
      </Box>
    </Approver.Section>
  );
}
