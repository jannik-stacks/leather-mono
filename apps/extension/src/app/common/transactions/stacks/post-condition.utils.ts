import {
  type FungibleComparator,
  type NonFungibleComparator,
  type PostCondition,
  type PoxComparator,
  type Transaction,
} from '@jannik-stacks/kit';

import { assertUnreachable } from '@leather.io/utils';

import { stacksValue } from '@app/common/stacks-utils';

// TODO: Refactor pc utils to use with Approver UX
//
// These were used with legacy tx requests, so we have to keep them
// until we are able to remove that code entirely.

export function rpcPostConditionModeToEnum(
  mode?: Transaction['postConditionMode']
): NonNullable<Transaction['postConditionMode']> {
  if (mode === 'allow') return 'allow';
  if (mode === 'originator') return 'originator';
  return 'deny';
}

export type NonPoxPostConditionWire = Exclude<PostCondition, { type: 'pox-postcondition' }>;

export type PostConditionVerb = 'transfer' | 'stake';

export function getIconStringFromPostCondition(pc: NonPoxPostConditionWire) {
  if (pc.type === 'ft-postcondition') return pc.asset.replace('::', '.');
  if (pc.type === 'nft-postcondition') return pc.asset.split('::')[1] ?? '';
  return 'STX';
}

export function getAmountFromPostCondition(pc: NonPoxPostConditionWire) {
  if (pc.type === 'ft-postcondition') return pc.amount.toString();
  if (pc.type === 'stx-postcondition' || pc.type === 'staking-postcondition')
    return stacksValue({ value: pc.amount.toString(), withTicker: false });
  return undefined;
}

export function getSymbolFromPostCondition(pc: NonPoxPostConditionWire) {
  if ('asset' in pc) {
    return (pc.asset.split('::')[1] ?? '').slice(0, 3).toUpperCase();
  }
  return 'STX';
}

export function getNameFromPostCondition(pc: NonPoxPostConditionWire) {
  if ('asset' in pc) {
    return pc.asset.split('::')[1] ?? '';
  }
  return 'STX';
}

export function getPostConditionCodeMessage(
  code: FungibleComparator | NonFungibleComparator,
  isSender: boolean,
  context: PostConditionVerb = 'transfer'
) {
  const sender = isSender ? 'You' : 'The contract';
  const verb = context === 'stake' ? 'stake' : 'transfer';
  switch (code) {
    case 'eq':
      return `${sender} will ${verb} exactly`;
    case 'gt':
      return `${sender} will ${verb} more than`;
    case 'gte':
      return `${sender} will ${verb} at least`;
    case 'lt':
      return `${sender} will ${verb} less than`;
    case 'lte':
      return `${sender} will ${verb} at most`;
    case 'sent':
      return `${sender} will transfer`;
    case 'not-sent':
      return `${sender} will keep or receive`;
    case 'maybe-sent':
      return `${sender} may transfer`;
    default:
      assertUnreachable(code);
  }
}

export function getPoxConditionCodeMessage(code: PoxComparator, isSender: boolean) {
  const sender = isSender ? 'You' : 'The contract';
  switch (code) {
    case 'will-not-perform':
      return `${sender} must not perform any PoX actions`;
    case 'may-perform':
      return `${sender} may perform PoX actions`;
    case 'will-perform':
      return `${sender} must perform a PoX action`;
    default:
      assertUnreachable(code);
  }
}

function getTitleFromConditionCode(
  code: FungibleComparator | NonFungibleComparator,
  context: PostConditionVerb = 'transfer'
) {
  const verb = context === 'stake' ? 'stake' : 'transfer';
  switch (code) {
    case 'eq':
      return `will ${verb} exactly`;
    case 'gt':
      return `will ${verb} more than`;
    case 'gte':
      return `will ${verb} equal to or greater than`;
    case 'lt':
      return `will ${verb} less than`;
    case 'lte':
      return `will ${verb} less than or equal to`;
    case 'sent':
      return 'will transfer';
    case 'not-sent':
      return 'will keep';
    case 'maybe-sent':
      return 'may transfer';
    default:
      return undefined;
  }
}

export function getPostConditionTitle(
  pc: NonPoxPostConditionWire,
  context: PostConditionVerb = 'transfer'
) {
  return getTitleFromConditionCode(pc.condition, context);
}

export function getPoxConditionTitle(code: PoxComparator) {
  switch (code) {
    case 'will-not-perform':
      return 'must not perform any PoX actions';
    case 'may-perform':
      return 'may perform PoX actions';
    case 'will-perform':
      return 'must perform a PoX action';
    default:
      return undefined;
  }
}
