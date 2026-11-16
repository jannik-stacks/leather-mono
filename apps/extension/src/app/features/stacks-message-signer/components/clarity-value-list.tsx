import { type ClarityValue } from '@jannik-stacks/kit';

import { formatClarityValue } from '@leather.io/stacks';
import { assertUnreachable } from '@leather.io/utils';

import {
  TupleDisplayer,
  TupleNodeDisplayer,
  TupleNodeLabelDisplayer,
  TupleNodeValueDisplayer,
} from './nested-tuple-displayer';

function wrapText(text: string): React.JSX.Element {
  return <>{text}</>;
}

interface ClarityValueListDisplayerProps {
  val: ClarityValue;
  encoding?: 'tryAscii' | 'hex';
  isRoot?: boolean;
}
export function ClarityValueListDisplayer(props: ClarityValueListDisplayerProps) {
  const { val, encoding, isRoot = true } = props;

  const valType = val.type;
  switch (valType) {
    case 'true':
      return wrapText('true');
    case 'false':
      return wrapText('false');
    case 'int':
      return wrapText(val.value.toString());
    case 'uint':
      return wrapText(`u${val.value.toString()}`);
    case 'buffer':
      if (encoding === 'tryAscii') {
        if (/[ -~]/.test(val.value)) return wrapText(JSON.stringify(val.value));
      }
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
        <TupleDisplayer isRoot={isRoot}>
          {Object.entries(val.value).map(([key, value]) => (
            <TupleNodeDisplayer clarityType={value.type} key={key}>
              <TupleNodeLabelDisplayer>{key}:</TupleNodeLabelDisplayer>
              <TupleNodeValueDisplayer>
                <ClarityValueListDisplayer val={value} encoding="tryAscii" isRoot={false} />
              </TupleNodeValueDisplayer>
            </TupleNodeDisplayer>
          ))}
        </TupleDisplayer>
      );
    case 'ascii':
      return wrapText(`"${val.value}"`);
    case 'utf8':
      return wrapText(`u"${val.value}"`);
    default:
      assertUnreachable(valType);
  }
}
