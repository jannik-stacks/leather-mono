import { type Sip10Asset } from '@leather.io/models';
import {
  convertAmountToBaseUnit,
  initBigNumber,
  isDefined,
  truncateMiddle,
} from '@leather.io/utils';

import {
  type NonPoxPostConditionWire,
  type PostConditionVerb,
  getAmountFromPostCondition,
  getIconStringFromPostCondition,
  getNameFromPostCondition,
  getPostConditionCodeMessage,
  getPostConditionTitle,
  getSymbolFromPostCondition,
} from '@app/common/transactions/stacks/post-condition.utils';
import { type StacksAccount } from '@app/store/accounts/blockchain/stacks/stacks-account.models';

function ftDecimals(value: number | string, decimals: number) {
  return convertAmountToBaseUnit(initBigNumber(value), decimals)
    .toNumber()
    .toLocaleString('en-US', { maximumFractionDigits: decimals });
}

interface FormatPostConditionMessageArgs {
  account?: StacksAccount;
  asset?: Sip10Asset;
  context?: PostConditionVerb;
  isContractPrincipal: boolean;
  postCondition: NonPoxPostConditionWire;
}
export function formatPostConditionMessage({
  account,
  asset,
  context = 'transfer',
  isContractPrincipal,
  postCondition: pc,
}: FormatPostConditionMessageArgs) {
  const pcTitle = getPostConditionTitle(pc, context);
  const pcIconString = getIconStringFromPostCondition(pc);
  const pcTicker = getSymbolFromPostCondition(pc);
  const pcAmount = getAmountFromPostCondition(pc);
  const pcName = getNameFromPostCondition(pc);

  const contractName = pc.address.split('.')[1];
  const address = pc.address === 'origin' ? '' : (pc.address.split('.')[0] ?? '');
  const isOriginPrincipal = pc.address === 'origin';
  const isSending = isOriginPrincipal || address === account?.address;

  const contractId = 'asset' in pc ? (pc.asset.split('::')[0] ?? '') : '';
  const amount =
    asset?.decimals && isDefined(pcAmount) ? ftDecimals(pcAmount, asset.decimals) : pcAmount;
  const ticker = asset?.symbol || pcTicker;

  const message = pc.condition
    ? `${[getPostConditionCodeMessage(pc.condition, isSending, context), amount, ticker].join(' ')} or the transaction will abort.`
    : undefined;

  function getPrincipalPrefix() {
    if (isContractPrincipal) return 'The contract ';
    if (isSending) return 'You ';
    return 'Another address ';
  }

  return {
    amount,
    contract: `${truncateMiddle(address, 4)}${contractName ? `.${contractName}` : ''}`,
    contractId,
    iconString: pcIconString,
    message,
    name: asset?.name || pcName,
    ticker,
    title: [getPrincipalPrefix(), pcTitle].join(' '),
  };
}
