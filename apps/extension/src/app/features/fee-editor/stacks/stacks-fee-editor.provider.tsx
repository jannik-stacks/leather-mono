import { type StacksTransaction } from '@jannik-stacks/kit';

import { type MarketData, type Money } from '@leather.io/models';

import { type HasChildren } from '@app/common/has-children';

import { FeeEditorProvider } from '../fee-editor.provider';
import { StacksFeesLoader } from './stacks-fees-loader';

interface StacksFeeEditorProviderProps extends HasChildren {
  availableBalance: Money;
  marketData: MarketData;
  onGoBack(): void;
  unsignedTx: StacksTransaction;
}
export function StacksFeeEditorProvider({
  availableBalance,
  children,
  marketData,
  onGoBack,
  unsignedTx,
}: StacksFeeEditorProviderProps) {
  return (
    <StacksFeesLoader unsignedTx={unsignedTx}>
      {({ fees, isLoading, isSponsored, getCustomFee }) => {
        return (
          <FeeEditorProvider
            availableBalance={availableBalance}
            fees={fees}
            feeType="fee-value"
            getCustomFee={getCustomFee}
            isLoadingFees={isLoading}
            isSponsored={isSponsored}
            marketData={marketData}
            onGoBack={onGoBack}
          >
            {children}
          </FeeEditorProvider>
        );
      }}
    </StacksFeesLoader>
  );
}
