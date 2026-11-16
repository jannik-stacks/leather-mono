import { Divider } from '@/components/divider';
import { ClarityValueListDisplayer } from '@/features/approver/clarity-value.section';
import { Cl, type ClarityValue } from '@jannik-stacks/kit';
import { t } from '@lingui/core/macro';

import { ChainId } from '@leather.io/models';
import { formatClarityValue, stacksChainIdToCoreNetworkMode } from '@leather.io/stacks';
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
  messageToSign: { messageType: 'structured'; message: string; domain: string };
}

export function StructuredMessageSection({ messageToSign }: StructuredMessageSectionProps) {
  const dom = Cl.deserialize(messageToSign.domain);
  if (dom.type !== 'tuple' || !dom.value.name || !dom.value.version || !dom.value['chain-id'])
    return null;

  const domainName = cvToDisplay(dom.value.name);
  const domainVersion = cvToDisplay(dom.value.version);
  const domainChainName = chainIdToDisplay(dom.value['chain-id']);
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
        <ClarityValueListDisplayer val={Cl.deserialize(messageToSign.message)} />
      </Box>
    </Approver.Section>
  );
}
