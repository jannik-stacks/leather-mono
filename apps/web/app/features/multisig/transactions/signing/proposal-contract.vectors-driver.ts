import { computeProposalHash, decodeProposalPayload } from '@leather.io/crypto';

import { preSignVerification } from './pre-sign-verification';

export function verify(input: Parameters<typeof preSignVerification>[0]) {
  const { transaction, account } = input;
  try {
    preSignVerification(input);
    return {
      accepted: true,
      commitment: computeProposalHash({
        multisigAddress: account.multisigAddress,
        rawPayload: decodeProposalPayload('stx', transaction.proposalRawPayload),
        proposalTimestamp: transaction.proposalTimestamp,
      }),
    };
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    return { accepted: false, error: error.message };
  }
}
