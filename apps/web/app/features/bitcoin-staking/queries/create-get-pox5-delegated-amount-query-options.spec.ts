import { responseOkCV, serializeCV, uintCV } from '@stacks/transactions';

import { createGetPox5DelegatedAmountQueryOptions } from './create-get-pox5-delegated-amount-query-options';
import { readPox5Query } from './pox5-read-only.vectors-driver';
import delegatedAmountVector from './vectors/delegated-amount.json';
import readOnlyVectors from './vectors/read-only.json';

const signerManagerContractId = 'SP21YTSM60CAY6D011EZVEVNKXVW8FVZE198XEFFP.custom-signer-manager';
const pox5ContractId = 'SP000000000000000000002Q6VF78.pox-5';
const cycle = 113;

function makeContext() {
  return { signal: new AbortController().signal };
}

function makeClient(result: { okay: boolean; result?: string }) {
  const calls: { functionName: string; arguments: string[] }[] = [];
  return {
    calls,
    callReadOnlyFunction(args: {
      functionName: string;
      readOnlyFunctionArgs: { arguments: string[] };
    }) {
      calls.push({
        functionName: args.functionName,
        arguments: args.readOnlyFunctionArgs.arguments,
      });
      return Promise.resolve(result);
    },
  };
}

describe(createGetPox5DelegatedAmountQueryOptions.name, () => {
  test('keys the query by contract ids and cycle, and disables it without them', () => {
    const options = createGetPox5DelegatedAmountQueryOptions({
      signerManagerContractId,
      cycle,
      pox5ContractId,
      client: makeClient({ okay: true, result: `0x${serializeCV(uintCV(0))}` }),
    });
    expect(options.queryKey).toEqual([
      'pox5-delegated-amount',
      pox5ContractId,
      signerManagerContractId,
      cycle,
    ]);
    expect(options.enabled).toBe(true);

    const withoutContract = createGetPox5DelegatedAmountQueryOptions({
      signerManagerContractId: undefined,
      cycle,
      pox5ContractId,
      client: makeClient({ okay: true }),
    });
    expect(withoutContract.enabled).toBe(false);

    const withoutCycle = createGetPox5DelegatedAmountQueryOptions({
      signerManagerContractId,
      cycle: undefined,
      pox5ContractId,
      client: makeClient({ okay: true }),
    });
    expect(withoutCycle.enabled).toBe(false);
  });

  test('parses the delegated amount and passes signer + cycle args', async () => {
    const client = makeClient({
      okay: true,
      result: `0x${serializeCV(uintCV(75_000_000_000n))}`,
    });
    const options = createGetPox5DelegatedAmountQueryOptions({
      signerManagerContractId,
      cycle,
      pox5ContractId,
      client,
    });
    await expect(options.queryFn(makeContext())).resolves.toEqual(75_000_000_000n);
    expect(client.calls).toEqual([
      {
        functionName: 'get-amount-delegated-for-signer',
        arguments: [expect.stringMatching(/^0x0616/), `0x${serializeCV(uintCV(cycle))}`],
      },
    ]);
  });

  test('resolves to null when the read fails or returns a non-uint', async () => {
    const failed = createGetPox5DelegatedAmountQueryOptions({
      signerManagerContractId,
      cycle,
      pox5ContractId,
      client: makeClient({ okay: false }),
    });
    await expect(failed.queryFn(makeContext())).resolves.toBeNull();

    const nonUint = createGetPox5DelegatedAmountQueryOptions({
      signerManagerContractId,
      cycle,
      pox5ContractId,
      client: makeClient({ okay: true, result: `0x${serializeCV(responseOkCV(uintCV(1)))}` }),
    });
    await expect(nonUint.queryFn(makeContext())).resolves.toBeNull();
  });
});

describe('Stacks migration vectors: delegated amount', () => {
  test('pins delegated-amount request bytes, cache key, decoded amounts and failures', async () => {
    const results = await Promise.all(
      delegatedAmountVector.responses.map(async response => {
        const calls: unknown[] = [];
        const context = makeContext();
        const options = createGetPox5DelegatedAmountQueryOptions({
          ...delegatedAmountVector.input,
          client: {
            callReadOnlyFunction({ signal, ...request }) {
              expect(signal).toBe(context.signal);
              calls.push(request);
              return Promise.resolve(response);
            },
          },
        });
        try {
          const amount = await options.queryFn(context);
          return {
            queryKey: options.queryKey,
            enabled: options.enabled,
            calls,
            amount: amount?.toString() ?? null,
          };
        } catch (error) {
          if (!(error instanceof Error)) throw error;
          return { calls, error: error.message };
        }
      })
    );
    expect(results).toEqual(delegatedAmountVector.expected);
  });
});

describe('Stacks migration vectors: PoX read-only queries', () => {
  test('pins each PoX query through its production request and response mapping', async () => {
    const outputs = [];
    for (const vector of readOnlyVectors) outputs.push(await readPox5Query(vector.input));
    const actual: unknown = JSON.parse(
      JSON.stringify(outputs, (_, value: unknown) =>
        typeof value === 'bigint' ? value.toString() : value
      )
    );
    expect(actual).toEqual(readOnlyVectors.map(vector => vector.expected));
  });
});
