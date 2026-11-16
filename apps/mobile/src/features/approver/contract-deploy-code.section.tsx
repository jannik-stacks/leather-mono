import { CodeCard } from '@/features/approver/components/code-card';
import { Codec } from '@jannik-stacks/kit';

import { Approver } from '@leather.io/ui/native';

import { assertContractDeployPayload } from './utils';

export function ContractDeployCodeSection({ txHex }: { txHex: string }) {
  const tx = Codec.Transaction.decode(txHex);
  assertContractDeployPayload(tx);

  return (
    <Approver.Section>
      <CodeCard codeBody={tx.code} />
    </Approver.Section>
  );
}
