import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

import { display, functionArgument } from './clarity-display.vectors-driver';

const inputs = [
  '03',
  '04',
  '00ffffffffffffffffffffffffffffffff',
  '01ffffffffffffffffffffffffffffffff',
  '0200000003616263',
  '020000000200ff',
  '09',
  '0a0100000000000000000000000000000001',
  '070100000000000000000000000000000001',
  '080100000000000000000000000000000002',
  '051a0000000000000000000000000000000000000000',
  '061a000000000000000000000000000000000000000003706f78',
  '0b00000002030100000000000000000000000000000001',
  '0c00000002016e0c000000010176010000000000000000000000000000002a01730d00000003616263',
  '0d00000003616263',
  '0e00000004f09f8c9f',
];
const expected: unknown = JSON.parse(
  readFileSync(__dirname + '/vectors/clarity-display.json', 'utf8')
);

test('pins the displayed text of every Clarity type, both buffer encodings and nested tuples', () => {
  expect(
    inputs.map(hex => ({ hex: display(hex, 'hex'), ascii: display(hex, 'tryAscii') }))
  ).toEqual(expected);
});

const expectedArguments: unknown = JSON.parse(
  readFileSync(__dirname + '/vectors/function-argument-display.json', 'utf8')
);

test('pins shown Clarity argument names, types and values', () => {
  expect(inputs.map(functionArgument)).toEqual(expectedArguments);
});
