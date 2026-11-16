import { useGetContractInterface } from '@/queries/stacks/contract-interface.query';
import { Codec } from '@jannik-stacks/kit';
import { t } from '@lingui/core/macro';

import { getSip9TransferRecipient, getSip10TransferRecipient } from '@leather.io/stacks';
import { Approver } from '@leather.io/ui/native';

import { assertContractCallPayload, getContractAddress } from '../utils';
import { OutcomeAddressesCard } from './outcome-addresses-card';

export function SipRecipient({ txHex }: { txHex: string }) {
  const tx = Codec.Transaction.decode(txHex);
  assertContractCallPayload(tx);

  const contractAddress = getContractAddress(tx);
  const { args: functionArgs = [], functionName } = tx;
  const contractName = tx.contract.split('.')[1] ?? '';

  const { data: contractInterfaceData } = useGetContractInterface(contractAddress, contractName);

  if (!contractInterfaceData) return null;

  const sip9recipient = getSip9TransferRecipient({
    functionName,
    functionArgs,
    contractInterfaceData,
  });
  const sip10recipient = getSip10TransferRecipient({
    functionName,
    functionArgs,
    contractInterfaceData,
  });
  const recipient = sip9recipient ?? sip10recipient;

  const outcome = recipient ? <OutcomeAddressesCard addresses={[recipient]} /> : null;

  if (!outcome) return null;

  return (
    <Approver.Section>
      <Approver.Subheader>{t`To address`}</Approver.Subheader>
      {outcome}
    </Approver.Section>
  );
}
