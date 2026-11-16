import { type ClarityValue } from '@jannik-stacks/kit';

import { formatClarityValue } from '@leather.io/stacks';
import { Box, Text, useTheme } from '@leather.io/ui/native';
import { assertUnreachable } from '@leather.io/utils';

function wrapText(val: string) {
  return <Text>{val}</Text>;
}

export function ClarityValueListDisplayer({
  val,
  level = 0,
}: {
  val: ClarityValue;
  level?: number;
}) {
  const theme = useTheme();
  const encoding = 'tryAscii';

  switch (val.type) {
    case 'true':
      return wrapText('true');
    case 'false':
      return wrapText('false');
    case 'int':
      return wrapText(val.value.toString());
    case 'uint':
      return wrapText(`u${val.value.toString()}`);
    case 'buffer':
      if (/[ -~]/.test(val.value)) return wrapText(JSON.stringify(val.value));
      return wrapText(`0x${val.value}`);
    case 'none':
      return wrapText('none');
    case 'some':
      return wrapText(`some ${formatClarityValue(val.value, encoding)}`);
    case 'err':
      return wrapText(`err ${formatClarityValue(val.value, encoding)}`);
    case 'ok':
      return wrapText(`ok ${formatClarityValue(val.value, encoding)}`);
    case 'address':
    case 'contract':
      return wrapText(val.value);
    case 'list':
      return wrapText(`[${val.value.map(v => formatClarityValue(v, encoding)).join(', ')}]`);
    case 'tuple':
      return (
        <Box>
          {Object.entries(val.value).map(([key, value]) => (
            <Box
              style={{ paddingLeft: level * theme.spacing['3'] }}
              key={key}
              gap="2"
              flexDirection={value.type === 'tuple' ? 'column' : 'row'}
            >
              <Text>{key}:</Text>
              <Box flexDirection="row">
                <ClarityValueListDisplayer val={value} level={level + 1} />
              </Box>
            </Box>
          ))}
        </Box>
      );
    case 'ascii':
      return wrapText(`"${val.value}"`);
    case 'utf8':
      return wrapText(`u"${val.value}"`);
    default:
      assertUnreachable(val);
  }
}
