import { type Cl, type ClarityValue } from '@jannik-stacks/kit';

import {
  formatClarityType,
  formatClarityValue,
  isClarityOptionalSome,
  isClarityResponseError,
  isClarityResponseOk,
  isClarityTuple,
  isClarityUInt,
} from '@leather.io/stacks';

interface StackingDaoGetWithdrawalsByNft {
  ststxAmount?: number;
  stxAmount: number;
  unlockBurnHeight: number;
}

export function parseStackingDaoGetWithdrawalResponseCV(
  response: ClarityValue
): StackingDaoGetWithdrawalsByNft {
  if (isClarityResponseError(response)) {
    throw new Error(formatClarityValue(response.value));
  }

  if (
    (isClarityResponseOk(response) || isClarityOptionalSome(response)) &&
    isClarityTuple(response.value)
  ) {
    return parseWithdrawalsTuple(response.value);
  }

  if (isClarityTuple(response)) {
    return parseWithdrawalsTuple(response);
  }

  throw new Error(
    `Unexpected get-withdrawals-by-nft Clarity Value type: ${formatClarityType(response)}`
  );

  function parseWithdrawalsTuple(tuple: Cl.Types.Tuple): StackingDaoGetWithdrawalsByNft {
    const stxAmountCV = tuple.value['stx-amount'];
    const ststxAmountCV = tuple.value['ststx-amount'];
    const unlockBurnHeightCV = tuple.value['unlock-burn-height'];

    if (!isClarityUInt(stxAmountCV) || !isClarityUInt(unlockBurnHeightCV)) {
      throw new Error(
        'Unexpected get-withdrawals-by-nft response: expected UInt for stx-amount and unlock-burn-height'
      );
    }

    return {
      stxAmount: Number(stxAmountCV.value),
      unlockBurnHeight: Number(unlockBurnHeightCV.value),
      ...(ststxAmountCV &&
        isClarityUInt(ststxAmountCV) && { ststxAmount: Number(ststxAmountCV.value) }),
    };
  }
}
