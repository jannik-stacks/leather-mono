import { isValidStacksMemo } from '../validation/memo-validation';
import { stacksMemoSchema } from './memo.schema';

export function memo(input: string) {
  const parsed = stacksMemoSchema.safeParse(input);
  return {
    valid: isValidStacksMemo(input),
    schema: parsed.success ? parsed.data : parsed.error.issues,
  };
}
