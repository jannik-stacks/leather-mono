import { type ClarityValue } from '@jannik-stacks/kit';
import { hexToBytes } from '@noble/hashes/utils';
import { entries, fromEntries } from 'remeda';

import { assertUnreachable } from '@leather.io/utils';

export interface ClarityJson {
  type: string;
  value: unknown;
  success?: boolean;
}

export function formatClarityType(value: ClarityValue): string {
  switch (value.type) {
    case 'true':
    case 'false':
      return 'bool';
    case 'int':
      return 'int';
    case 'uint':
      return 'uint';
    case 'buffer':
      return `(buff ${Math.ceil(value.value.length / 2)})`;
    case 'none':
      return '(optional none)';
    case 'some':
      return `(optional ${formatClarityType(value.value)})`;
    case 'err':
      return `(response UnknownType ${formatClarityType(value.value)})`;
    case 'ok':
      return `(response ${formatClarityType(value.value)} UnknownType)`;
    case 'address':
    case 'contract':
      return 'principal';
    case 'list':
      return `(list ${value.value.length} ${value.value.length ? formatClarityType(value.value[0]) : 'UnknownType'})`;
    case 'tuple':
      return `(tuple ${entries(value.value)
        .map(([key, child]) => `(${key} ${formatClarityType(child)})`)
        .join(' ')})`;
    case 'ascii':
      return `(string-ascii ${value.value.length})`;
    case 'utf8':
      return `(string-utf8 ${new TextEncoder().encode(value.value).length})`;
    default:
      return assertUnreachable(value);
  }
}

export function clarityValueToJson(value: ClarityValue): ClarityJson {
  const type = formatClarityType(value);
  switch (value.type) {
    case 'true':
      return { type, value: true };
    case 'false':
      return { type, value: false };
    case 'int':
    case 'uint':
      return { type, value: value.value.toString() };
    case 'buffer':
      return { type, value: `0x${value.value}` };
    case 'none':
      return { type, value: null };
    case 'some':
      return { type, value: clarityValueToJson(value.value) };
    case 'err':
      return { type, value: clarityValueToJson(value.value), success: false };
    case 'ok':
      return { type, value: clarityValueToJson(value.value), success: true };
    case 'address':
    case 'contract':
    case 'ascii':
    case 'utf8':
      return { type, value: value.value };
    case 'list':
      return { type, value: value.value.map(clarityValueToJson) };
    case 'tuple':
      return {
        type,
        value: fromEntries(
          entries(value.value).map(([key, child]) => [key, clarityValueToJson(child)])
        ),
      };
    default:
      return assertUnreachable(value);
  }
}

export function formatClarityValue(
  value: ClarityValue,
  encoding: 'hex' | 'tryAscii' = 'hex'
): string {
  switch (value.type) {
    case 'true':
      return 'true';
    case 'false':
      return 'false';
    case 'int':
      return value.value.toString();
    case 'uint':
      return `u${value.value}`;
    case 'buffer': {
      if (encoding === 'tryAscii') {
        const text = String.fromCharCode(...hexToBytes(value.value));
        if (/[ -~]/.test(text)) return JSON.stringify(text);
      }
      return `0x${value.value}`;
    }
    case 'none':
      return 'none';
    case 'some':
      return `(some ${formatClarityValue(value.value, encoding)})`;
    case 'err':
      return `(err ${formatClarityValue(value.value, encoding)})`;
    case 'ok':
      return `(ok ${formatClarityValue(value.value, encoding)})`;
    case 'address':
    case 'contract':
      return value.value;
    case 'list':
      return `(list ${value.value.map(child => formatClarityValue(child, encoding)).join(' ')})`;
    case 'tuple':
      return `(tuple ${entries(value.value)
        .map(([key, child]) => `(${key} ${formatClarityValue(child, encoding)})`)
        .join(' ')})`;
    case 'ascii':
      return `"${value.value}"`;
    case 'utf8':
      return `u"${value.value}"`;
    default:
      return assertUnreachable(value);
  }
}
