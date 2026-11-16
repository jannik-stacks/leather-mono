import { Codec, type PostCondition } from '@jannik-stacks/kit';

import {
  getAmountFromPostCondition,
  getIconStringFromPostCondition,
  getPostConditionCodeMessage,
  getPoxConditionCodeMessage,
  getPoxConditionTitle,
} from '@app/common/transactions/stacks/post-condition.utils';
import { formatPostConditionMessage } from '@app/features/rpc-stacks-transaction-request/stacks/post-conditions/post-conditions.utils';
import { type StacksAccount } from '@app/store/accounts/blockchain/stacks/stacks-account.models';

const SENDER_ADDRESS = 'ST2PABAF9FTAJYNFZH93XENAJ8FVY99RRM4DF2YCW';

describe('getPostConditionCodeMessage with stake context', () => {
  it('uses the stake verb for fungible condition codes', () => {
    expect(getPostConditionCodeMessage('lte', true, 'stake')).toBe('You will stake at most');
    expect(getPostConditionCodeMessage('eq', false, 'stake')).toBe(
      'The contract will stake exactly'
    );
  });

  it('defaults to the transfer verb', () => {
    expect(getPostConditionCodeMessage('eq', true)).toBe('You will transfer exactly');
  });
});

describe('pox condition messaging', () => {
  it('returns a message for each pox condition code', () => {
    expect(getPoxConditionCodeMessage('will-not-perform', true)).toBe(
      'You must not perform any PoX actions'
    );
    expect(getPoxConditionCodeMessage('may-perform', true)).toBe('You may perform PoX actions');
    expect(getPoxConditionCodeMessage('will-perform', false)).toBe(
      'The contract must perform a PoX action'
    );
  });

  it('returns a title for each pox condition code', () => {
    expect(getPoxConditionTitle('will-not-perform')).toBe('must not perform any PoX actions');
    expect(getPoxConditionTitle('may-perform')).toBe('may perform PoX actions');
    expect(getPoxConditionTitle('will-perform')).toBe('must perform a PoX action');
  });
});

describe('origin principal post conditions', () => {
  const serializedOriginStxPostCondition = '0x0001010000000005f5e100';

  it('attributes an origin principal post condition to the signing user', () => {
    const wire = Codec.Raw.PostCondition.decode(serializedOriginStxPostCondition);
    expect(wire.address).toBe('origin');
    expect(wire.type).toBe('stx-postcondition');
    if (wire.type === 'stx-postcondition') {
      const formatted = formatPostConditionMessage({
        isContractPrincipal: false,
        postCondition: wire,
      });
      expect(formatted.title).toBe('You  will transfer exactly');
      expect(formatted.message).toBe(
        'You will transfer exactly 100 STX or the transaction will abort.'
      );
    }
  });

  it('attributes a standard principal post condition to the signing user only when it matches the account address', () => {
    const mockAccount: StacksAccount = {
      type: 'ledger',
      address: SENDER_ADDRESS,
      stxPublicKey: '',
      dataPublicKey: '',
      index: 0,
      accountIndex: 0,
      fingerprint: '',
      derivationPath: '',
    };
    const wire = {
      type: 'stx-postcondition',
      address: SENDER_ADDRESS,
      condition: 'eq',
      amount: 100000000n,
    } satisfies PostCondition;
    expect(wire.address).toBe(SENDER_ADDRESS);
    if (wire.type === 'stx-postcondition') {
      const matched = formatPostConditionMessage({
        account: mockAccount,
        isContractPrincipal: false,
        postCondition: wire,
      });
      expect(matched.title).toBe('You  will transfer exactly');
      expect(matched.message).toBe(
        'You will transfer exactly 100 STX or the transaction will abort.'
      );
      const unmatched = formatPostConditionMessage({
        isContractPrincipal: false,
        postCondition: wire,
      });
      expect(unmatched.title).toBe('Another address  will transfer exactly');
      expect(unmatched.message).toBe(
        'The contract will transfer exactly 100 STX or the transaction will abort.'
      );
    }
  });
});

describe('staking display helpers', () => {
  it('formats the staked amount as STX and uses the STX icon', () => {
    const wire = {
      type: 'staking-postcondition',
      address: SENDER_ADDRESS,
      condition: 'gte',
      amount: 1000000n,
    } satisfies PostCondition;
    expect(wire.type).toBe('staking-postcondition');
    if (wire.type === 'staking-postcondition') {
      expect(getIconStringFromPostCondition(wire)).toBe('STX');
      const amount = getAmountFromPostCondition(wire);
      expect(amount).not.toBe('');
      expect(amount).not.toBe('1000000');
    }
  });
});

describe('fungible post condition contract id', () => {
  it('derives the contract id from the asset rather than the principal', () => {
    const wire = {
      type: 'ft-postcondition',
      address: SENDER_ADDRESS,
      condition: 'eq',
      amount: 100000000n,
      asset: 'SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token::sbtc-token',
    } satisfies PostCondition;
    expect(wire.type).toBe('ft-postcondition');
    if (wire.type === 'ft-postcondition') {
      const formatted = formatPostConditionMessage({
        isContractPrincipal: false,
        postCondition: wire,
      });
      expect(formatted.contractId).toBe('SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token');
    }
  });
});
