import { vi } from 'vitest';

import { createGetPox5EarnedRewardsQueryOptions } from './create-get-pox5-earned-rewards-query-options';
import { createGetPox5PayoutPreferenceQueryOptions } from './create-get-pox5-payout-preference-query-options';
import { createGetPox5PoolFeeQueryOptions } from './create-get-pox5-pool-fee-query-options';
import { createGetPox5SignerManagerValidationQueryOptions } from './create-get-pox5-signer-manager-validation-query-options';
import { createGetPox5StakerInfoQueryOptions } from './create-get-pox5-staker-info-query-options';

const fetchMock = vi.hoisted(() => vi.fn());
vi.mock('~/utils/hiro-wrapped-fetch', () => ({ fetchFn: fetchMock }));

interface QueryInput {
  kind: string;
  address: string;
  signerManagerContractId: string;
  pox5ContractId: string;
  cycle: number;
  responses: { okay: boolean; result?: string; cause?: string; data?: string }[];
}

export async function readPox5Query(input: QueryInput) {
  const calls: unknown[] = [];
  const responses = [...input.responses];
  const client = {
    callReadOnlyFunction(request: {
      contractAddress: string;
      contractName: string;
      functionName: string;
      readOnlyFunctionArgs: { arguments: string[]; sender: string };
    }) {
      calls.push({
        contractAddress: request.contractAddress,
        contractName: request.contractName,
        functionName: request.functionName,
        readOnlyFunctionArgs: request.readOnlyFunctionArgs,
      });
      return Promise.resolve(responses.shift() ?? { okay: false });
    },
    getContractInterface() {
      return Promise.resolve({
        functions: [
          { name: 'get-earned-staker-rewards', access: 'read_only' },
          { name: 'get-payout-config', access: 'read_only' },
          { name: 'claim-staker-rewards', access: 'public' },
        ],
        variables: [{ name: 'fees-bips' }],
      });
    },
  };
  async function observe(
    options: { queryKey: unknown; enabled: boolean },
    queryFn: () => Promise<unknown>
  ) {
    try {
      return {
        queryKey: options.queryKey,
        enabled: options.enabled,
        value: await queryFn(),
        calls,
      };
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      return { queryKey: options.queryKey, enabled: options.enabled, error: error.message, calls };
    }
  }
  if (input.kind === 'earned') {
    const options = createGetPox5EarnedRewardsQueryOptions({ ...input, client });
    return observe(options, options.queryFn);
  }
  if (input.kind === 'payout') {
    const options = createGetPox5PayoutPreferenceQueryOptions({
      ...input,
      networkName: 'mainnet',
      client,
    });
    return observe(options, options.queryFn);
  }
  if (input.kind === 'validation') {
    const options = createGetPox5SignerManagerValidationQueryOptions({
      contractId: input.signerManagerContractId,
      pox5ContractId: input.pox5ContractId,
      client,
    });
    const context = { signal: new AbortController().signal };
    return observe(options, () => options.queryFn(context));
  }
  if (input.kind === 'staker') {
    const options = createGetPox5StakerInfoQueryOptions({ ...input, client });
    return observe(options, options.queryFn);
  }
  if (input.kind === 'poolFee') {
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      calls.push({ url, body: init?.body ?? null });
      const response = responses.shift();
      return Promise.resolve(Response.json(response));
    });
    const options = createGetPox5PoolFeeQueryOptions({
      ...input,
      apiUrl: 'https://stacks.example',
    });
    return observe(options, options.queryFn);
  }
  throw new Error('Unknown PoX query vector: ' + input.kind);
}
