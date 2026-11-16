import { assertContractCallPayload } from '@/features/approver/utils';
import { Codec } from '@jannik-stacks/kit';
import { t } from '@lingui/core/macro';

import { Callout } from '@leather.io/ui/native';

export function AllowModePostConditionWarning({ txHex }: { txHex: string }) {
  const tx = Codec.Transaction.decode(txHex);
  assertContractCallPayload(tx);

  if (tx.postConditionMode === 'allow') {
    return (
      <Callout title={t`This is an “Allow Mode” transaction`} variant="warning">
        {t`By approving, this app can move your assets anytime, without asking again. Only proceed if you fully trust it.`}
      </Callout>
    );
  }
  return null;
}
