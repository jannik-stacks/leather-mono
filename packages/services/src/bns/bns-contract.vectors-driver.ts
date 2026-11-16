import { Cl } from '@jannik-stacks/kit';

import { parseBnsContractGetPrimaryResponseCV } from './bns.utils';

export function primary(hex: string) {
  try {
    return parseBnsContractGetPrimaryResponseCV(Cl.deserialize(hex));
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    return { error: error.message };
  }
}
export { mapBnsProfileDataFromZoneFile as profile } from './bns.utils';
