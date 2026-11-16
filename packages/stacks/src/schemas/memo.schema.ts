import { z } from 'zod';

import { isValidStacksMemo } from '../validation/memo-validation';

export const stacksMemoSchema = z
  .string()
  .refine(isValidStacksMemo, { message: 'Invalid memo string' });
