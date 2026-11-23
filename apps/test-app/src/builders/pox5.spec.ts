// The post conditions and the post-condition MODE are what the staking tests
// exist to exercise, so they are pinned here: a silent change to either would
// otherwise make the catalog test something other than production.
import { serializeCV } from '@stacks/transactions';
import { readFileSync as readStacksVectorFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

import { decodePostCondition } from '../verifiers/stx-decode';
import {
  encodeSignerCalldata,
  getClaimStakerRewardsOptions,
  getStakeOptions,
  getStakeUpdateOptions,
  getUnstakeOptions,
  parseContractId,
} from './pox5';
import * as pox5ContractVectorDriver from './pox5-contract.vectors-driver';

const pox5ContractId = 'SP000000000000000000002Q6VF78.pox-5';
const signerManagerContractId = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.signer-manager';
const stakerAddress = 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7';

test('pins the test-app payout preference calldata bytes', () => {
  expect(
    serializeCV(
      encodeSignerCalldata({
        btcRewardAddress: 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4',
        maxFeeSats: 5000n,
        minClaimSats: 25000n,
      })
    )
  ).toEqual(
    '0a02000000780c00000003076d61782d6665650100000000000000000000000000001388096d696e2d636c61696d01000000000000000000000000000061a808706f782d616464720c00000002096861736862797465730200000014751e76e8199196d454941c45d1b3a323f1433bd60776657273696f6e020000000104'
  );
});

function decodeFirstPostCondition({ postConditions }: { postConditions?: string[] }) {
  const [postCondition] = postConditions ?? [];
  if (!postCondition) throw new Error('Expected a post condition');
  return decodePostCondition(postCondition);
}

function readAmount(decoded: ReturnType<typeof decodePostCondition>) {
  return 'amount' in decoded ? String(decoded.amount) : undefined;
}

const stakeArgs = {
  signerManagerContractId,
  amountMicroStx: 40_000_000n,
  numCycles: 12,
  startBurnHeight: 900_000,
  pox5ContractId,
  network: 'mainnet',
};

describe('parseContractId', () => {
  test('splits a contract id', () => {
    expect(parseContractId(signerManagerContractId)).toEqual({
      contractAddress: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
      contractName: 'signer-manager',
    });
  });

  test('rejects anything that is not address.name', () => {
    expect(() => parseContractId('not-a-contract')).toThrow('Invalid contract id');
  });
});

describe('getStakeOptions', () => {
  test('calls stake on the pox-5 contract with five arguments', () => {
    const options = getStakeOptions(stakeArgs);
    expect(options.contract).toBe(pox5ContractId);
    expect(options.functionName).toBe('stake');
    expect(options.functionArgs).toHaveLength(5);
  });

  test('sends deny mode with a staking post-condition equal to the amount', () => {
    const options = getStakeOptions(stakeArgs);
    expect(options.postConditionMode).toBe('deny');
    expect(options.postConditions).toHaveLength(1);
    const decoded = decodeFirstPostCondition(options);
    expect(decoded).toMatchObject({ type: 'staking-postcondition', condition: 'eq' });
  });

  test('rejects a cycle count outside the protocol range', () => {
    expect(() => getStakeOptions({ ...stakeArgs, numCycles: 0 })).toThrow();
    expect(() => getStakeOptions({ ...stakeArgs, numCycles: 97 })).toThrow();
  });
});

describe('getStakeUpdateOptions', () => {
  const updateArgs = {
    newSignerManagerContractId: signerManagerContractId,
    currentSignerManagerContractId: signerManagerContractId,
    cyclesToExtend: 0,
    amountIncreaseMicroStx: 0n,
    currentAmountMicroStx: 40_000_000n,
    pox5ContractId,
    network: 'mainnet',
  };

  test('an amount increase pins the RESULTING TOTAL with eq', () => {
    const options = getStakeUpdateOptions({ ...updateArgs, amountIncreaseMicroStx: 10_000_000n });
    const decoded = decodeFirstPostCondition(options);
    expect(decoded).toMatchObject({ type: 'staking-postcondition', condition: 'eq' });
    // 40 STX already staked + 10 STX added = 50 STX total.
    expect(readAmount(decoded)).toBe('50000000');
  });

  test('a cycles-only extend caps the total with lte, because node builds disagree', () => {
    const options = getStakeUpdateOptions({ ...updateArgs, cyclesToExtend: 6 });
    const decoded = decodeFirstPostCondition(options);
    expect(decoded).toMatchObject({ condition: 'lte' });
    expect(readAmount(decoded)).toBe('40000000');
  });
});

describe('getUnstakeOptions', () => {
  test('sends a pox post-condition of will-perform under deny mode', () => {
    const options = getUnstakeOptions({
      currentSignerManagerContractId: signerManagerContractId,
      pox5ContractId,
      network: 'mainnet',
    });
    expect(options.functionName).toBe('unstake');
    expect(options.postConditionMode).toBe('deny');
    expect(decodeFirstPostCondition(options)).toMatchObject({
      type: 'pox-postcondition',
      condition: 'will-perform',
    });
  });
});

describe('getClaimStakerRewardsOptions', () => {
  test('targets the signer-manager in originator mode with no post conditions', () => {
    const options = getClaimStakerRewardsOptions({
      signerManagerContractId,
      stakerAddress,
      rewardCycle: 3,
      network: 'mainnet',
    });
    expect(options.contract).toBe(signerManagerContractId);
    expect(options.functionName).toBe('claim-staker-rewards');
    expect(options.postConditionMode).toBe('originator');
    expect(options.postConditions).toBeUndefined();
  });

  test('rejects a negative reward cycle', () => {
    expect(() =>
      getClaimStakerRewardsOptions({
        signerManagerContractId,
        stakerAddress,
        rewardCycle: -1,
        network: 'mainnet',
      })
    ).toThrow();
  });
});

describe('Stacks migration vectors: pox5-contract', () => {
  const expected: unknown = JSON.parse(
    readStacksVectorFileSync(__dirname + '/vectors/pox5-contract.json', 'utf8')
  );

  test('pins PoX-5 calldata, post-condition bytes and modes', () => {
    const signerManagerContractId = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.signer-manager';
    const pox5ContractId = 'SP000000000000000000002Q6VF78.pox-5';
    const network = 'mainnet';
    const base = {
      signerManagerContractId,
      pox5ContractId,
      network,
      amountMicroStx: 40000000n,
      numCycles: 12,
      startBurnHeight: 900000,
    };
    const update = {
      pox5ContractId,
      network,
      newSignerManagerContractId: signerManagerContractId,
      currentSignerManagerContractId: signerManagerContractId,
      cyclesToExtend: 6,
      amountIncreaseMicroStx: 0n,
      currentAmountMicroStx: 40000000n,
    };
    const results = {
      stake: pox5ContractVectorDriver.stake(base),
      payout: pox5ContractVectorDriver.stake({
        ...base,
        payoutPreference: {
          btcRewardAddress: 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4',
          maxFeeSats: 2500n,
          minClaimSats: 10000n,
        },
      }),
      extend: pox5ContractVectorDriver.update(update),
      increase: pox5ContractVectorDriver.update({
        ...update,
        cyclesToExtend: 0,
        amountIncreaseMicroStx: 10000000n,
      }),
      unstake: pox5ContractVectorDriver.unstake({
        currentSignerManagerContractId: signerManagerContractId,
        pox5ContractId,
        network,
      }),
      claim: pox5ContractVectorDriver.claim({
        signerManagerContractId,
        stakerAddress: 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7',
        rewardCycle: 3,
        network,
      }),
    };
    const actual: unknown = JSON.parse(
      JSON.stringify(results, (_, value: unknown) =>
        typeof value === 'bigint' ? value.toString() : value
      )
    );
    expect(actual).toEqual(expected);
  });
});
