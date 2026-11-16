import { Codec } from '@jannik-stacks/kit';

// Reads the lone signature this participant contributed to a Leather multisig
// STX transaction. Leather multisig is non-sequential (P2SHNonSequential): each
// signer independently signs the same tx with one key, so a signed tx carries
// exactly one MessageSignature (65-byte recoverable VRS, hex).
export function extractStxMultisigSignature(signedTxHex: string): string {
  const spendingCondition = Codec.Transaction.decode(signedTxHex);
  if (spendingCondition.signaturesRequired === undefined)
    throw new Error('Not a multisig transaction: spending condition has no auth fields');

  const signatures = (spendingCondition.signatures ?? []).flatMap(field =>
    field.type === 'signature' ? [field.value] : []
  );

  const [signature, ...rest] = signatures;
  if (signature === undefined || rest.length > 0)
    throw new Error(
      `Expected exactly one signature in the signed transaction, found ${signatures.length}`
    );
  return signature;
}
