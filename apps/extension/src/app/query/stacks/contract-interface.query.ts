import { type ClarityAbiLike } from '@jannik-stacks/kit';
import { type UseQueryResult, useQuery } from '@tanstack/react-query';

import { createStacksContractInterfaceQueryConfig } from '@leather.io/queries';

import { useUserSettings } from '@app/hooks/use-user-settings';

export function useGetContractInterface(
  contractAddress: string,
  contractName: string
): UseQueryResult<ClarityAbiLike> {
  const settings = useUserSettings();
  return useQuery(
    createStacksContractInterfaceQueryConfig(contractAddress, contractName, settings)
  );
}
