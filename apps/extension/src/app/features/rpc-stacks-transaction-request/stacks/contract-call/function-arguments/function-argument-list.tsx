import { Cl, type ClarityAbiFunction } from '@jannik-stacks/kit';
import { Stack } from 'leather-styles/jsx';

import { cleanHex, formatClarityType, formatClarityValue } from '@leather.io/stacks';
import { Caption } from '@leather.io/ui';

import { FunctionArgumentItem } from './function-argument-item';

interface FunctionArgumentListProps {
  fn: ClarityAbiFunction;
  fnArgs: string[];
}
export function FunctionArgumentList({ fn, fnArgs }: FunctionArgumentListProps) {
  return fnArgs.length > 0 ? (
    <Stack gap="space.04">
      {fnArgs
        .map(arg => Cl.deserialize(cleanHex(arg)))
        .map((arg, i) => (
          <FunctionArgumentItem
            key={i}
            name={fn.args[i].name}
            type={formatClarityType(arg)}
            value={formatClarityValue(arg)}
          />
        ))}
    </Stack>
  ) : (
    <Caption>There are no arguments</Caption>
  );
}
