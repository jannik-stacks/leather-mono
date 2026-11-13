import { describe, expect, test } from 'vitest';

import { makeAccountIdentifer } from '@leather.io/crypto';
import { defaultNetworksKeyedById } from '@leather.io/models';
import { deriveStxMultisigAddress } from '@leather.io/stacks';
import { resetWallet } from '@leather.io/state';
import { userRemovesWallet } from '@leather.io/state/wallet';

import { type PolicyStore, makePolicyId } from './policy-store.utils';
import { selectCurrentPolicy } from './policy.selectors';
import { policySlice, userAddsPolicy, userRemovesPolicy } from './policy.slice';

const { reducer, getInitialState } = policySlice;

const fingerprintA = 'abcd1234';
const fingerprintB = 'beef5678';
const parentAccountIdA = makeAccountIdentifer(fingerprintA, 0);
const parentAccountIdB = makeAccountIdentifer(fingerprintB, 0);
const multisigAddress = 'bc1qexampleexampleexampleexampleexampleexamplexyz';
const networkId = 'mainnet';

function makeBitcoinPolicy(
  parentAccountId: string,
  { address = multisigAddress, network = networkId } = {}
): PolicyStore {
  return {
    id: makePolicyId(parentAccountId, address, network),
    parentAccountId,
    networkId: network,
    chain: 'bitcoin',
    address,
    descriptor: `wsh(sortedmulti(2,xpubA/0/0,xpubB/0/0))`,
    role: 'signer',
  };
}

const stacksPolicy: PolicyStore = {
  id: makePolicyId(parentAccountIdA, 'SM3CFXKD81GREH6MYFW4P9VKSSR2N525W3KDRH3P1', networkId),
  parentAccountId: parentAccountIdA,
  networkId,
  chain: 'stacks',
  address: 'SM3CFXKD81GREH6MYFW4P9VKSSR2N525W3KDRH3P1',
  publicKeys: ['03aa', '02bb'],
  threshold: 2,
  role: 'signer',
};

function seed(...policies: PolicyStore[]) {
  return policies.reduce(
    (state, policy) => reducer(state, userAddsPolicy({ policy })),
    getInitialState()
  );
}

describe('policySlice', () => {
  test('adds a bitcoin policy', () => {
    const policy = makeBitcoinPolicy(parentAccountIdA);
    const result = reducer(getInitialState(), userAddsPolicy({ policy }));

    expect(result.ids).toEqual([policy.id]);
    expect(result.entities[policy.id]).toEqual(policy);
  });

  test('adds a stacks policy', () => {
    const result = reducer(getInitialState(), userAddsPolicy({ policy: stacksPolicy }));

    expect(result.entities[stacksPolicy.id]).toEqual(stacksPolicy);
  });

  test('does not persist the provided name on the policy entity', () => {
    const policy = makeBitcoinPolicy(parentAccountIdA);
    const result = reducer(getInitialState(), userAddsPolicy({ policy, name: 'Family vault' }));

    expect(result.entities[policy.id]).toEqual(policy);
  });

  test('is idempotent: re-adding the same (parent, address) replaces in place', () => {
    const policy = makeBitcoinPolicy(parentAccountIdA);
    const updated = { ...policy, descriptor: 'wsh(sortedmulti(2,xpubC/0/0,xpubD/0/0))' };
    let state = reducer(getInitialState(), userAddsPolicy({ policy }));
    state = reducer(state, userAddsPolicy({ policy: updated }));

    expect(state.ids).toHaveLength(1);
    expect(state.entities[policy.id]).toEqual(updated);
  });

  test('keeps separate rows for the same address under different parent accounts', () => {
    const policyA = makeBitcoinPolicy(parentAccountIdA);
    const policyB = makeBitcoinPolicy(parentAccountIdB);
    const state = seed(policyA, policyB);

    expect(state.ids).toHaveLength(2);
    expect(state.entities[policyA.id]).toBeDefined();
    expect(state.entities[policyB.id]).toBeDefined();
  });

  test('keeps separate rows for the same parent and address on different networks', () => {
    const policyA = makeBitcoinPolicy(parentAccountIdA, { network: 'mainnet' });
    const policyB = makeBitcoinPolicy(parentAccountIdA, { network: 'testnet4' });
    const state = seed(policyA, policyB);

    expect(state.ids).toHaveLength(2);
    expect(state.entities[policyA.id]).toBeDefined();
    expect(state.entities[policyB.id]).toBeDefined();
  });

  test('cascades removal of a wallet to its policies', () => {
    const policyA = makeBitcoinPolicy(parentAccountIdA);
    const policyB = makeBitcoinPolicy(parentAccountIdB);
    const state = reducer(seed(policyA, policyB), userRemovesWallet({ fingerprint: fingerprintA }));

    expect(state.ids).toEqual([policyB.id]);
  });

  test('is a no-op when removing a wallet with no policies', () => {
    const seeded = seed(makeBitcoinPolicy(parentAccountIdA));
    const result = reducer(seeded, userRemovesWallet({ fingerprint: '99999999' }));

    expect(result).toEqual(seeded);
  });

  test('removes a single policy by id, leaving siblings', () => {
    const policyA = makeBitcoinPolicy(parentAccountIdA);
    const policyB = makeBitcoinPolicy(parentAccountIdB);
    const state = reducer(seed(policyA, policyB), userRemovesPolicy({ policyId: policyA.id }));

    expect(state.ids).toEqual([policyB.id]);
  });

  test('is a no-op when removing an unknown policy id', () => {
    const seeded = seed(makeBitcoinPolicy(parentAccountIdA));
    const result = reducer(seeded, userRemovesPolicy({ policyId: 'unknown/0/addr/mainnet' }));

    expect(result).toEqual(seeded);
  });

  test('clears all policies on wallet reset', () => {
    const seeded = seed(makeBitcoinPolicy(parentAccountIdA));
    const result = reducer(seeded, resetWallet());

    expect(result).toEqual(getInitialState());
  });
});

test('finds an existing stored STX policy by its ordered address and policy id', () => {
  const publicKeys = [
    '031b84c5567b126440995d3ed5aaba0565d71e1834604819ff9c17f5e9d5dd078f',
    '024d4b6cd1361032ca9bd2aeb9d900aa4d45d9ead80ac9423374c451a7254d0766',
  ];
  const address = deriveStxMultisigAddress({ publicKeys, threshold: 2, chainId: 1 });
  expect(address).toEqual('SM3CFXKD81GREH6MYFW4P9VKSSR2N525W3KDRH3P1');
  const id = makePolicyId('abcd1234/0', address, 'mainnet');
  expect(id).toEqual('abcd1234/0/SM3CFXKD81GREH6MYFW4P9VKSSR2N525W3KDRH3P1/mainnet');
  const state = seed({
    id: 'abcd1234/0/SM3CFXKD81GREH6MYFW4P9VKSSR2N525W3KDRH3P1/mainnet',
    parentAccountId: 'abcd1234/0',
    networkId: 'mainnet',
    chain: 'stacks',
    address: 'SM3CFXKD81GREH6MYFW4P9VKSSR2N525W3KDRH3P1',
    publicKeys,
    threshold: 2,
    role: 'signer',
  });
  const selected = selectCurrentPolicy.resultFunc(
    state.entities,
    id,
    true,
    {},
    { fingerprint: 'abcd1234', accountIndex: 0 },
    defaultNetworksKeyedById.mainnet
  );
  expect(selected?.id).toEqual('abcd1234/0/SM3CFXKD81GREH6MYFW4P9VKSSR2N525W3KDRH3P1/mainnet');
  expect(selected?.address).toEqual('SM3CFXKD81GREH6MYFW4P9VKSSR2N525W3KDRH3P1');
});
