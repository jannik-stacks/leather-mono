import { type Cl, type ClarityValue } from '@jannik-stacks/kit';
import { z } from 'zod';

// Clarity values
export const cvIntSchema: z.ZodType<Cl.Types.Int> = z.object({
  type: z.literal('int'),
  value: z.coerce.bigint(),
});

export const cvUintSchema: z.ZodType<Cl.Types.Uint> = z.object({
  type: z.literal('uint'),
  value: z.coerce.bigint(),
});

export const cvBufferSchema: z.ZodType<Cl.Types.Buffer> = z.object({
  type: z.literal('buffer'),
  value: z.string(),
});

export const cvTrueSchema: z.ZodType<Cl.Types.True> = z.object({
  type: z.literal('true'),
});

export const cvFalseSchema: z.ZodType<Cl.Types.False> = z.object({
  type: z.literal('false'),
});

export const cvAddressSchema: z.ZodType<Cl.Types.Address> = z.object({
  type: z.literal('address'),
  value: z.string(),
});

export const cvContractSchema: z.ZodType<Cl.Types.Contract> = z.object({
  type: z.literal('contract'),
  value: z.string().pipe(
    z.custom<string>(value => typeof value === 'string' && value.includes('.'), {
      message: 'Stacks contract principals are denoted with a dot',
    })
  ),
});

export const cvAsciiSchema: z.ZodType<Cl.Types.Ascii> = z.object({
  type: z.literal('ascii'),
  value: z.string(),
});

export const cvUtf8Schema: z.ZodType<Cl.Types.Utf8> = z.object({
  type: z.literal('utf8'),
  value: z.string(),
});

export const cvOkSchema: z.ZodType<Cl.Types.Ok> = z
  .object({
    type: z.literal('ok'),
    value: z.lazy(() => clarityValueSchema),
  })
  .transform((value): Cl.Types.Ok => value);

export const cvErrSchema: z.ZodType<Cl.Types.Err> = z.object({
  type: z.literal('err'),
  value: z.lazy(() => clarityValueSchema),
});

export const cvNoneSchema: z.ZodType<Cl.Types.None> = z.object({
  type: z.literal('none'),
});

export const cvSomeSchema: z.ZodType<Cl.Types.Some> = z.object({
  type: z.literal('some'),
  value: z.lazy(() => clarityValueSchema),
});

export const cvListSchema = z.object({
  type: z.literal('list'),
  value: z.array(z.lazy(() => clarityValueSchema)),
});

export const cvTupleSchema = z.object({
  type: z.literal('tuple'),
  value: z.record(
    z.string(),
    z.lazy(() => clarityValueSchema)
  ),
});

export const clarityValueSchema: z.ZodType<ClarityValue> = z.union([
  cvIntSchema,
  cvUintSchema,
  cvBufferSchema,
  cvTrueSchema,
  cvFalseSchema,
  cvAddressSchema,
  cvContractSchema,
  cvOkSchema,
  cvErrSchema,
  cvNoneSchema,
  cvSomeSchema,
  cvListSchema,
  cvTupleSchema,
  cvAsciiSchema,
  cvUtf8Schema,
]);
