import { Codec } from '@jannik-stacks/kit';
import { z } from 'zod';

export function isValidContractLength(contract: string) {
  try {
    // `codeBodyString` throws when creating a contract deploy transaction in
    // `@stacks/transaction`. Using this method here, we can validate the
    // contract length and gracefully handle the error
    const maxCodeBodyBytes = 100000;
    if (new TextEncoder().encode(contract).length > maxCodeBodyBytes) return false;
    Codec.Raw.Payload.encode({
      type: 'smart-contract',
      contractName: 'validation',
      codeBody: contract,
    });
    return true;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (_e: unknown) {
    return false;
  }
}

export const clarityContractSchema = z
  .string()
  .refine(contract => isValidContractLength(contract), {
    message: 'ContractExceedsMaxLength',
  });
