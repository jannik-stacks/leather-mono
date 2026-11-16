import { type PostCondition } from '@jannik-stacks/kit';
import { PostConditionSelectors } from '@tests/selectors/requests.selectors';
import { Box, Stack, styled } from 'leather-styles/jsx';

import { ItemLayout, StxAvatarIcon } from '@leather.io/ui';
import { truncateMiddle } from '@leather.io/utils';

import {
  getPoxConditionCodeMessage,
  getPoxConditionTitle,
} from '@app/common/transactions/stacks/post-condition.utils';
import { useCurrentStacksAccount } from '@app/store/accounts/blockchain/stacks/stacks-account.hooks';

interface PoxPostConditionItemProps {
  isContractPrincipal: boolean;
  isLast: boolean;
  postCondition: Extract<PostCondition, { type: 'pox-postcondition' }>;
}
export function PoxPostConditionItem({
  isContractPrincipal,
  isLast,
  postCondition: pc,
}: PoxPostConditionItemProps) {
  const currentAccount = useCurrentStacksAccount();

  const address = pc.address === 'origin' ? '' : (pc.address.split('.')[0] ?? '');
  const contractName = pc.address.split('.')[1] ?? '';
  const isOriginPrincipal = pc.address === 'origin';
  const isSending = isOriginPrincipal || address === currentAccount?.address;

  function getPrincipalPrefix() {
    if (isContractPrincipal) return 'The contract ';
    if (isSending) return 'You ';
    return 'Another address ';
  }

  const title = [getPrincipalPrefix(), getPoxConditionTitle(pc.condition)].join(' ');
  const message = `${getPoxConditionCodeMessage(
    pc.condition,
    isSending
  )} or the transaction will abort.`;
  const contract = `${truncateMiddle(address, 4)}${contractName ? `.${contractName}` : ''}`;

  return (
    <Stack data-testid={PostConditionSelectors.PostConditionItem} gap="space.03">
      <styled.span textStyle="label.03">{title}</styled.span>
      <ItemLayout
        img={<StxAvatarIcon />}
        titleLeft="STX"
        captionLeft="Stacking"
        captionRight={contract}
      />
      <Box py="space.03" borderTop="default" borderBottom={!isLast ? 'active' : 'unset'}>
        <styled.span color="ink.text-secondary" textStyle="caption.01">
          {message}
        </styled.span>
      </Box>
    </Stack>
  );
}
