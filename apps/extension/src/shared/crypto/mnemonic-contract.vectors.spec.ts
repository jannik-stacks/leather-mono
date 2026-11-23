import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

import * as driver from './mnemonic-contract.vectors-driver';

const expected: unknown = JSON.parse(
  readFileSync(__dirname + '/vectors/mnemonic-contract.json', 'utf8')
);

test('restores existing salted and legacy session ciphertext without exposing failed decryptions', async () => {
  const salted =
    '070707070707070707070707070707079c344e86d8b6f5b4ed4d6a646844e9b01328cf847854e9dcbbaebf4b833a4d140ed8ca251d0d35b149bb086085ad971169fbe3419cb154c49e5b5cdbf30a68d9';
  const legacy =
    '07070707070707070707070707070707f66913750055a7e02f89f99ce8cd57db28b00cd5fddee029166c425929b5215ae20be7bf7e4bdb3bbec8582c0b872bed06e416a0335fbb12521e307872dc44e3';
  const secretKey =
    'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
  expect(
    await driver.restoreExistingSession(
      salted,
      '7002728d90ebd2ef32b51a6d197970a6788baddfed67034c7b98f35fc5ba1762972f2dd332bcd9e2bb406b51dfd5c6dd'
    )
  ).toEqual({ secretKey, errors: [] });
  expect(await driver.restoreExistingSession(legacy, 'vector-password')).toEqual({
    secretKey,
    errors: [],
  });
  expect(await driver.restoreExistingSession(legacy, 'wrong-password')).toEqual({
    secretKey: null,
    errors: [['Failed to decrypt secret key']],
  });
});

test('pins fixed-entropy mnemonic encryption and decrypts salted and legacy ciphertext', async () => {
  const key =
    '7002728d90ebd2ef32b51a6d197970a6788baddfed67034c7b98f35fc5ba1762972f2dd332bcd9e2bb406b51dfd5c6dd';
  const salted =
    '070707070707070707070707070707079c344e86d8b6f5b4ed4d6a646844e9b01328cf847854e9dcbbaebf4b833a4d140ed8ca251d0d35b149bb086085ad971169fbe3419cb154c49e5b5cdbf30a68d9';
  const legacy =
    '07070707070707070707070707070707f66913750055a7e02f89f99ce8cd57db28b00cd5fddee029166c425929b5215ae20be7bf7e4bdb3bbec8582c0b872bed06e416a0335fbb12521e307872dc44e3';
  const randomBytes = [7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7];
  const results = {
    encryption: await driver.encryptFixed(
      {
        secretKey:
          'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
        password: 'vector-password',
        existingSalt: '07070707070707070707070707070707',
      },
      key,
      randomBytes
    ),
    legacyEncryption: await driver.encryptLegacy(
      'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
      'vector-password',
      randomBytes
    ),
    salted: await driver.decryptExisting(
      {
        encryptedSecretKey: salted,
        password: 'vector-password',
        salt: '07070707070707070707070707070707',
      },
      key
    ),
    cached: await driver.decryptExisting(
      {
        encryptedSecretKey: salted,
        password: 'vector-password',
        salt: '07070707070707070707070707070707',
        existingEncryptionKey: key,
      },
      key
    ),
    legacy: await driver.decryptExisting(
      { encryptedSecretKey: legacy, password: 'vector-password' },
      key
    ),
    wrongPassword: await driver.decryptExisting(
      { encryptedSecretKey: legacy, password: 'wrong-password' },
      key
    ),
    tampered: await driver.decryptExisting(
      { encryptedSecretKey: '08' + legacy.slice(2), password: 'vector-password' },
      key
    ),
  };
  const actual: unknown = JSON.parse(
    JSON.stringify(results, (_, value: unknown) =>
      typeof value === 'bigint' ? value.toString() : value
    )
  );
  expect(actual).toEqual(expected);
});
