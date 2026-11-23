# Extension Kit migration

Extension-owned protocol operations, test builders and drivers use Kit. Byte utilities use
`@noble/hashes/utils`. No extension source or test imports stacks.js.

## Kit gaps

Kit has no mnemonic encryption. `apps/extension/src/shared/crypto/mnemonic-cipher.ts`
implements the existing format directly with Noble hashes, Scure BIP39 and native Web Crypto
PBKDF2/AES, preserving the previous native key derivation performance:

- English BIP39 mnemonic entropy is the plaintext.
- A random 16-byte salt feeds PBKDF2-SHA512 with 100,000 iterations and a 48-byte output.
- Output bytes 0–15 are the AES-128-CBC key, 16–31 the HMAC key, and 32–47 the IV.
- AES-CBC uses PKCS#7 padding. HMAC-SHA256 authenticates `salt || ciphertext`.
- Stored hex encodes `salt || MAC || ciphertext`.

The outer Argon2 password derivation and salt remain unchanged. Records predating that salt
still decrypt with the raw password and are re-encrypted on unlock. Fixed vectors cover
both formats, session restoration, invalid authentication, and 12- and 24-word entropy.
Ledger's VRS message signature is rotated to the RSV format at the device boundary.
Kit's public Address codec uses C32 strings; Emily's wire address is read as its version
and 20-byte hash160 for `Address.stringify`.

## Remaining legacy dependencies

The extension retains `@stacks/network` and `@stacks/transactions` declarations to satisfy
ALEX's peer dependencies. `@zondax/ledger-stacks` also depends on stacks.js transactions.
Their transitive closures still include stacks.js common/encryption code; extension-owned
code does not import it. The unused common, encryption and wallet-sdk direct declarations
are removed.

Vite's stacks.js ESM aliases, source-map patterns and transaction vendor chunk remain for
these reachable vendor dependencies. Final bundler pruning belongs to migration part 6.
