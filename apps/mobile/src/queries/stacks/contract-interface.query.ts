import { useUserSettings } from '@/hooks/use-user-settings';
import { type ClarityAbiLike } from '@jannik-stacks/kit';
import { type UseQueryResult, useQuery } from '@tanstack/react-query';

import { createStacksContractInterfaceQueryConfig } from '@leather.io/queries';

export function useGetContractInterface(
  contractAddress: string,
  contractName: string
): UseQueryResult<ClarityAbiLike> {
  const settings = useUserSettings();
  return useQuery(
    createStacksContractInterfaceQueryConfig(contractAddress, contractName, settings)
  );
}
