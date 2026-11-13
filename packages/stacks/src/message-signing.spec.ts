import { stringAsciiCV, tupleCV, uintCV } from '@stacks/transactions';
import { readFileSync as readStacksVectorFileSync } from 'node:fs';

import * as messageContractVectorDriver from './message-contract.vectors-driver';
import { signStructuredDataMessage, verifySip018Signature } from './message-signing';

// Mirrors the multisig proposal commitment: a SIP-018 structured signature over
// the proposal hash, wrapped in the proposal domain. Proves verify accepts what
// sign produces and rejects every tampering. (Real-data KAT against a live
// proposer pubkey folds in once that vault's signers are to hand.)
const privateKey = '753b7cc01a1a2e86221266a154af739463fce51219d97e4f856cd7200c3bd2a601';
// A valid compressed pubkey that is not the signer, for the wrong-signer case.
const otherPublicKey = '02f9308a019258c31049344f85f89d5229b531c845836f99b08601f113bce036f9';

const domain = tupleCV({
  name: stringAsciiCV('leather-multisig-proposal-v1'),
  version: stringAsciiCV('1'),
  'chain-id': uintCV(1),
});
const message = stringAsciiCV('2a5f997755408a0a7f063923c830b3ae2fd3a26d8c19ab736ee523c3daf29a86');

describe(verifySip018Signature.name, () => {
  const { signature, publicKey } = signStructuredDataMessage(message, domain, privateKey);

  test('verifies a genuine SIP-018 signature', () => {
    expect(verifySip018Signature({ message, domain, signature, publicKey })).toBe(true);
  });

  test('rejects the signature against a different signer', () => {
    expect(verifySip018Signature({ message, domain, signature, publicKey: otherPublicKey })).toBe(
      false
    );
  });

  test('rejects a tampered message', () => {
    const tampered = stringAsciiCV(
      '0000000000000000000000000000000000000000000000000000000000000000'
    );
    expect(verifySip018Signature({ message: tampered, domain, signature, publicKey })).toBe(false);
  });

  test('rejects a tampered domain (different chain-id)', () => {
    const otherDomain = tupleCV({
      name: stringAsciiCV('leather-multisig-proposal-v1'),
      version: stringAsciiCV('1'),
      'chain-id': uintCV(2147483648),
    });
    expect(verifySip018Signature({ message, domain: otherDomain, signature, publicKey })).toBe(
      false
    );
  });

  test('returns false (does not throw) on a malformed signature', () => {
    expect(verifySip018Signature({ message, domain, signature: 'garbage', publicKey })).toBe(false);
  });
});

describe('Stacks migration vectors: message-contract', () => {
  const expected: unknown = JSON.parse(
    readStacksVectorFileSync(__dirname + '/vectors/message-contract.json', 'utf8')
  );

  test('pins plain-message and SIP-018 signatures and tampered input rejection', () => {
    const key = '753b7cc01a1a2e86221266a154af739463fce51219d97e4f856cd7200c3bd2a601';
    const message = '0d0000000568656c6c6f';
    const signature =
      '2d31fab788ad2af399f914f341c6c7bc9a4c1b7de17c8cfeff42b521e1972c6500010425f54a50120ce499779037e652dbb5dd400b4d0442fe3deb889fb8024600';
    const publicKey = '0390a5cac7c33fda49f70bc1b0866fa0ba7a9440d9de647fecb8132ceb76a94dfa';
    const results = {
      plain: ['', 'hello', 'Leather 🌟'].map(message =>
        messageContractVectorDriver.plain(message, key)
      ),
      structured: [1, 2147483648, 256].map(chainId =>
        messageContractVectorDriver.structured(message, chainId, key)
      ),
      valid: messageContractVectorDriver.verify(
        message,
        1,
        '2d31fab788ad2af399f914f341c6c7bc9a4c1b7de17c8cfeff42b521e1972c6500010425f54a50120ce499779037e652dbb5dd400b4d0442fe3deb889fb8024600',
        '0390a5cac7c33fda49f70bc1b0866fa0ba7a9440d9de647fecb8132ceb76a94dfa'
      ),
      malformed: messageContractVectorDriver.verify(message, 1, 'garbage', publicKey),
      wrongMessage: messageContractVectorDriver.verify(
        '0d000000056a656c6c6f',
        1,
        signature,
        publicKey
      ),
      wrongDomain: messageContractVectorDriver.verify(message, 256, signature, publicKey),
    };
    const actual: unknown = JSON.parse(
      JSON.stringify(results, (_, value: unknown) =>
        typeof value === 'bigint' ? value.toString() : value
      )
    );
    expect(actual).toEqual(expected);
  });
});

test('pins the prefixed plain-message digest displayed before RSV signing', () => {
  expect(messageContractVectorDriver.plainHash('Hello, 🌟')).toEqual(
    '3eac21f1f44423339154d0018db0e13077c472f8adbab71f2dd63f4c284a1a49'
  );
  expect(messageContractVectorDriver.plainHash('')).toEqual(
    '89da565bd5b575c8d3b4370ce0b5965eb43e51d4434680cfe72c9420f8e790b4'
  );
});
