import { hmac } from '@noble/hashes/hmac';
import { sha256 } from '@noble/hashes/sha256';
import { concatBytes, hexToBytes } from '@noble/hashes/utils';
import { entropyToMnemonic, mnemonicToEntropy, validateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';

const saltLength = 16;
const macLength = 32;
const iterations = 100_000;
const derivedKeyLength = 48;

class PasswordError extends Error {}

async function deriveCipherKeys(password: string, salt: Uint8Array) {
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const keys = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: 'PBKDF2', hash: 'SHA-512', salt: new Uint8Array(salt), iterations },
      passwordKey,
      derivedKeyLength * 8
    )
  );
  const key = await crypto.subtle.importKey('raw', keys.slice(0, 16), 'AES-CBC', false, [
    'encrypt',
    'decrypt',
  ]);
  return { key, macKey: keys.slice(16, 32), iv: keys.slice(32) };
}

function mnemonicToPlaintext(phrase: string) {
  try {
    return mnemonicToEntropy(phrase, wordlist);
  } catch {
    throw new Error('Not a valid bip39 mnemonic');
  }
}

export async function encryptMnemonicBytes(phrase: string, password: string): Promise<Uint8Array> {
  const entropy = mnemonicToPlaintext(phrase);
  const salt = crypto.getRandomValues(new Uint8Array(saltLength));
  const { key, macKey, iv } = await deriveCipherKeys(password, salt);
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-CBC', iv }, key, new Uint8Array(entropy))
  );
  const mac = hmac(sha256, macKey, concatBytes(salt, ciphertext));
  return concatBytes(salt, mac, ciphertext);
}

export async function decryptMnemonicBytes(data: string | Uint8Array, password: string) {
  const bytes = typeof data === 'string' ? hexToBytes(data) : data;
  const salt = bytes.slice(0, saltLength);
  const mac = bytes.slice(saltLength, saltLength + macLength);
  const ciphertext = bytes.slice(saltLength + macLength);
  const { key, macKey, iv } = await deriveCipherKeys(password, salt);
  const entropy = new Uint8Array(
    await crypto.subtle.decrypt({ name: 'AES-CBC', iv }, key, new Uint8Array(ciphertext))
  );
  const expected = sha256(hmac(sha256, macKey, concatBytes(salt, ciphertext)));
  const actual = sha256(mac);
  const mismatch = actual.reduce(
    (difference, byte, index) => difference | (byte ^ expected[index]),
    0
  );
  if (mismatch) throw new PasswordError('Wrong password (HMAC mismatch)');
  try {
    const mnemonic = entropyToMnemonic(entropy, wordlist);
    if (!validateMnemonic(mnemonic, wordlist)) throw new PasswordError();
    return mnemonic;
  } catch {
    throw new PasswordError('Wrong password (invalid plaintext)');
  }
}
