import {
  type FungibleComparator,
  type NonFungibleComparator,
  type PostCondition,
  type PoxComparator,
} from '@jannik-stacks/kit';
import { t } from '@lingui/core/macro';

import { truncateMiddle } from '@leather.io/utils';

type PostConditionVerb = 'transfer' | 'stake';

type NonPoxPostCondition = Exclude<PostCondition, { type: 'pox-postcondition' }>;

function getUserPcTitle(conditionCode: FungibleComparator | NonFungibleComparator, verb: string) {
  return {
    ['eq']: t`You will ${verb} exactly`,
    ['gt']: t`You will ${verb} more than`,
    ['gte']: t`You will ${verb} equal to or greater than`,
    ['lt']: t`You will ${verb} less than`,
    ['lte']: t`You will ${verb} less than or equal to`,
    ['sent']: t`You will transfer`,
    ['not-sent']: t`You will keep`,
    ['maybe-sent']: t`You may transfer`,
  }[conditionCode];
}
function getContractPcTitle(
  conditionCode: FungibleComparator | NonFungibleComparator,
  verb: string
) {
  return {
    ['eq']: t`The contract will ${verb} exactly`,
    ['gt']: t`The contract will ${verb} more than`,
    ['gte']: t`The contract will ${verb} equal to or greater than`,
    ['lt']: t`The contract will ${verb} less than`,
    ['lte']: t`The contract will ${verb} less than or equal to`,
    ['sent']: t`The contract will transfer`,
    ['not-sent']: t`The contract will keep`,
    ['maybe-sent']: t`The contract may transfer`,
  }[conditionCode];
}

function getAddressPcTitle(
  conditionCode: FungibleComparator | NonFungibleComparator,
  address: string,
  verb: string
) {
  const shortenedPcAddress = truncateMiddle(address, 4);
  return {
    ['eq']: t`Another address ${shortenedPcAddress} will ${verb} exactly`,
    ['gt']: t`Another address ${shortenedPcAddress} will ${verb} more than`,
    ['gte']: t`Another address ${shortenedPcAddress} will ${verb} equal to or greater than`,
    ['lt']: t`Another address ${shortenedPcAddress} will ${verb} less than`,
    ['lte']: t`Another address ${shortenedPcAddress} will ${verb} less than or equal to`,
    ['sent']: t`Another address ${shortenedPcAddress} will transfer`,
    ['not-sent']: t`Another address ${shortenedPcAddress} will keep`,
    ['maybe-sent']: t`Another address ${shortenedPcAddress} may transfer`,
  }[conditionCode];
}

function getPoxTitle(conditionCode: PoxComparator, sender: string) {
  return {
    ['will-not-perform']: t`${sender} must not perform any PoX actions`,
    ['may-perform']: t`${sender} may perform PoX actions`,
    ['will-perform']: t`${sender} must perform a PoX action`,
  }[conditionCode];
}

function getPoxSender(
  isContractPrincipal: boolean,
  userIsSending: boolean,
  address: string | null
) {
  if (isContractPrincipal) return t`The contract`;
  if (userIsSending) return t`You`;
  if (address) {
    const shortenedPcAddress = truncateMiddle(address, 4);
    return t`Another address ${shortenedPcAddress}`;
  }
  return null;
}

interface FormatPostConditionMessageArgs {
  stacksAddress: string;
  isContractPrincipal: boolean;
  postCondition: NonPoxPostCondition;
  context?: PostConditionVerb;
}

export function formatPostConditionMessage({
  stacksAddress,
  isContractPrincipal,
  postCondition: pc,
  context = 'transfer',
}: FormatPostConditionMessageArgs) {
  const address = pc.address === 'origin' ? null : (pc.address.split('.')[0] ?? null);
  const isOriginPrincipal = pc.address === 'origin';
  const userIsSending = isOriginPrincipal || address === stacksAddress;
  const verb = context === 'stake' ? 'stake' : 'transfer';
  function getTitle() {
    if (isContractPrincipal) {
      return getContractPcTitle(pc.condition, verb);
    }
    if (userIsSending) {
      return getUserPcTitle(pc.condition, verb);
    }
    if (address) {
      return getAddressPcTitle(pc.condition, address, verb);
    }
    return null;
  }

  return getTitle();
}

interface FormatPoxPostConditionMessageArgs {
  stacksAddress: string;
  isContractPrincipal: boolean;
  postCondition: Extract<PostCondition, { type: 'pox-postcondition' }>;
}

export function formatPoxPostConditionMessage({
  stacksAddress,
  isContractPrincipal,
  postCondition: pc,
}: FormatPoxPostConditionMessageArgs) {
  const address = pc.address === 'origin' ? null : (pc.address.split('.')[0] ?? null);
  const isOriginPrincipal = pc.address === 'origin';
  const userIsSending = isOriginPrincipal || address === stacksAddress;
  const sender = getPoxSender(isContractPrincipal, userIsSending, address);
  if (!sender) return null;
  return getPoxTitle(pc.condition, sender);
}
