import { Divider } from '@/components/divider';
import { ClarityValueListDisplayer } from '@/features/approver/clarity-value.section';
import { type ClarityValue } from '@jannik-stacks/kit';
import { t } from '@lingui/core/macro';

import { ChainId } from '@leather.io/models';
import {
  type StructuredMessageDomain,
  formatClarityValue,
  stacksChainIdToCoreNetworkMode,
} from '@leather.io/stacks';
import { Approver, Box, Text } from '@leather.io/ui/native';
import { capitalize } from '@leather.io/utils';

function cvToDisplay(cv: ClarityValue): string {
  return formatClarityValue(cv).replaceAll('"', '');
}
function chainIdToDisplay(chainIdCv: ClarityValue): string | undefined {
  if (chainIdCv.type !== 'uint') return undefined;
  const chainIdString = formatClarityValue(chainIdCv);
  const chainId = parseInt(chainIdString.replace('u', ''), 10);
  if (chainId !== ChainId.Mainnet && chainId !== ChainId.Testnet) return undefined;
  return capitalize(stacksChainIdToCoreNetworkMode(chainId));
}

interface StructuredMessageSectionProps {
  message: ClarityValue;
  domain: StructuredMessageDomain;
}

export function StructuredMessageSection({ message, domain }: StructuredMessageSectionProps) {
  const domainName = cvToDisplay(domain.value.name);
  const domainVersion = cvToDisplay(domain.value.version);
  const domainChainName = chainIdToDisplay(domain.value['chain-id']);
  return (
    <Approver.Section>
      <Text variant="label01">{t`Message`}</Text>
      <Box gap="4">
        <Box flexDirection="row" justifyContent="space-between">
          <Text>{domainName}</Text>
          <Text>
            {domainVersion} {domainChainName}
          </Text>
        </Box>
        <Divider />
        <ClarityValueListDisplayer val={message} />
      </Box>
    </Approver.Section>
  );
}
