import { extractStxMultisigSignature } from './extract-stx-multisig-signature';
import { substituteStxNonce } from './substitute-stx-nonce';

export function nonce(rawPayload: string, nonce: number) {
  try {
    return substituteStxNonce({ rawPayload, nonce });
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    return { error: error.message };
  }
}
export function signature(hex: string) {
  try {
    return extractStxMultisigSignature(hex);
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    return { error: error.message };
  }
}
