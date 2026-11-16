import {
  Cl,
  type ClarityValue,
  privateKeyToPublicKey,
  signMessage as signKitMessage,
  signStructuredMessage,
} from '@jannik-stacks/kit';
import { secp256k1 } from '@noble/curves/secp256k1';
import { sha256 } from '@noble/hashes/sha256';
import { concatBytes, hexToBytes } from '@noble/hashes/utils';

export const invalidStructuredMessageError = 'Invalid structured message';

export interface SignatureData {
  signature: string;
  publicKey: string;
}

interface DecodedStructuredMessage {
  message: ClarityValue;
  domain: StructuredMessageDomain;
}

export interface StructuredMessageDomain extends Cl.Types.Tuple {
  value: Cl.Types.Tuple['value'] & {
    name: Cl.Types.Ascii;
    version: Cl.Types.Ascii;
    'chain-id': Cl.Types.Uint;
  };
}

export function decodeStructuredMessage(
  message: string,
  domain: string
): DecodedStructuredMessage | null {
  try {
    const domainValue = Cl.deserialize(domain);
    if (domainValue.type !== 'tuple') return null;
    const { name, version, 'chain-id': chainId } = domainValue.value;
    if (name?.type !== 'ascii' || version?.type !== 'ascii' || chainId?.type !== 'uint')
      return null;
    return {
      message: Cl.deserialize(message),
      domain: {
        ...domainValue,
        value: { ...domainValue.value, name, version, 'chain-id': chainId },
      },
    };
  } catch {
    return null;
  }
}

export function signMessage(message: string, privateKey: string): SignatureData {
  return {
    signature: signKitMessage(message, privateKey),
    publicKey: privateKeyToPublicKey(privateKey),
  };
}

export function signStructuredDataMessage(
  message: ClarityValue,
  domain: ClarityValue,
  privateKey: string
): SignatureData {
  const signature = signStructuredMessage({ message, domain }, privateKey);

  return {
    signature,
    publicKey: privateKeyToPublicKey(privateKey),
  };
}

interface VerifySip018SignatureArgs {
  message: ClarityValue;
  domain: ClarityValue;
  signature: string;
  publicKey: string;
}

// Verifies a SIP-018 structured-data signature: recomputes the signed message
// hash from the message + domain, recovers the public key from the RSV signature,
// and asserts it matches the expected signer. Returns false rather than throwing
// on malformed input.
export function verifySip018Signature({
  message,
  domain,
  signature,
  publicKey,
}: VerifySip018SignatureArgs): boolean {
  try {
    const messageHash = sha256(
      concatBytes(
        new TextEncoder().encode('SIP018'),
        sha256(hexToBytes(Cl.serialize(domain))),
        sha256(hexToBytes(Cl.serialize(message)))
      )
    );
    const signatureBytes = hexToBytes(signature);
    if (signatureBytes.length !== 65) return false;
    const recovered = secp256k1.Signature.fromCompact(signatureBytes.slice(0, 64))
      .addRecoveryBit(signatureBytes[64])
      .recoverPublicKey(messageHash)
      .toHex(true);
    return recovered.toLowerCase() === publicKey.toLowerCase();
  } catch {
    return false;
  }
}
