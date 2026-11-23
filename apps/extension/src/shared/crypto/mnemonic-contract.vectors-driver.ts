import { bytesToHex } from '@noble/hashes/utils';
import { vi } from 'vitest';

import * as inMemoryStorage from '@app/store/in-memory-key/in-memory-storage';
import { initalizeWalletSession, restoreWalletSession } from '@app/store/session-restore';

import {
  decryptMnemonicBytes as decrypt,
  encryptMnemonicBytes as encrypt,
} from './mnemonic-cipher';
import { decryptMnemonic, encryptMnemonic } from './mnemonic-encryption';

const derive = vi.hoisted(() => vi.fn());
const random = vi.hoisted(() => ({ bytes: new Uint8Array(16).fill(7) }));
const storedKeys = vi.hoisted(() => {
  const keys: { id: string; encryptedSecretKey: string }[] = [];
  return { keys };
});
const sessionErrors = vi.hoisted(() => vi.fn());
vi.mock('@app/store/store', () => ({ store: { getState: vi.fn() } }));
vi.mock('@app/store/software-keys/software-key.selectors', () => ({
  selectSoftwareKeys() {
    return storedKeys.keys;
  },
}));
vi.mock('@shared/logger', () => ({ logger: { error: sessionErrors } }));
vi.mock('./generate-encryption-key', () => ({ deriveEncryptionKey: derive }));
vi.mock('./generate-random-hex', () => ({
  generateRandomHexString() {
    return '07070707070707070707070707070707';
  },
}));

export async function decryptExisting(
  input: Parameters<typeof decryptMnemonic>[0],
  derivedKey: string
) {
  const entropy = fixedEntropy();
  derive.mockClear();
  derive.mockResolvedValue(derivedKey);
  try {
    const result = await decryptMnemonic(input);
    const reencryptedMnemonic = await decrypt(result.encryptedSecretKey, result.encryptionKey);
    return {
      secretKey: result.secretKey,
      encryptedSecretKey: result.encryptedSecretKey,
      fingerprint: result.fingerprint,
      salt: result.salt,
      encryptionKey: result.encryptionKey,
      reencryptedMnemonic,
      originalCiphertextPreserved: result.encryptedSecretKey === input.encryptedSecretKey,
      derivations: derive.mock.calls,
    };
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    return { name: error.name, error: error.message };
  } finally {
    entropy.mockRestore();
  }
}

export async function encryptFixed(
  input: Parameters<typeof encryptMnemonic>[0],
  derivedKey: string,
  randomBytes: number[]
) {
  random.bytes = Uint8Array.from(randomBytes);
  derive.mockResolvedValue(derivedKey);
  const entropy = fixedEntropy();
  try {
    return await encryptMnemonic(input);
  } finally {
    entropy.mockRestore();
  }
}
export async function encryptLegacy(secretKey: string, password: string, randomBytes: number[]) {
  random.bytes = Uint8Array.from(randomBytes);
  const entropy = fixedEntropy();
  try {
    return bytesToHex(await encrypt(secretKey, password));
  } finally {
    entropy.mockRestore();
  }
}

function fixedEntropy() {
  return vi.spyOn(globalThis.crypto, 'getRandomValues').mockImplementation(array => {
    if (!(array instanceof Uint8Array) || array.length !== random.bytes.length)
      throw new Error('Unexpected mnemonic salt length');
    array.set(random.bytes);
    return array;
  });
}

export async function restoreExistingSession(ciphertext: string, encryptionKey: string) {
  inMemoryStorage.clearAll();
  sessionErrors.mockClear();
  storedKeys.keys = [{ id: '73c5da0a', encryptedSecretKey: ciphertext }];
  await initalizeWalletSession(encryptionKey);
  await restoreWalletSession();
  return {
    secretKey: inMemoryStorage.getKey('73c5da0a'),
    errors: sessionErrors.mock.calls,
  };
}
