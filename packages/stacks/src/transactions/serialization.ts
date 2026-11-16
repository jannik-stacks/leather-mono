import { Codec, type StacksTransaction } from '@jannik-stacks/kit';

const messageSignatureWireByteLength = 66;
const publicKeyWireByteLength = 34;
const hexCharactersPerByte = 2;
export function getEstimatedUnsignedStacksTxByteLength(transaction: StacksTransaction) {
  return Codec.Transaction.encode(transaction).length / hexCharactersPerByte;
}
export function getSerializedUnsignedStacksTxPayload(transaction: StacksTransaction): string {
  switch (transaction.type) {
    case 'transfer':
      return Codec.Raw.Payload.encode({
        type: 'token-transfer',
        recipient: transaction.recipient,
        amount: transaction.amount,
        memo: transaction.memo ?? '',
      });
    case 'call':
      return Codec.Raw.Payload.encode({
        type: 'contract-call',
        contractAddress: transaction.contract.split('.')[0],
        contractName: transaction.contract.split('.')[1],
        functionName: transaction.functionName,
        functionArgs: transaction.args,
      });
    case 'deploy': {
      const payload = { contractName: transaction.name, codeBody: transaction.code };
      return transaction.clarityVersion === undefined
        ? Codec.Raw.Payload.encode({ type: 'smart-contract', ...payload })
        : Codec.Raw.Payload.encode({
            type: 'versioned-smart-contract',
            clarityVersion: transaction.clarityVersion,
            ...payload,
          });
    }
    default:
      throw new Error('Unsupported transaction payload');
  }
}
export function estimateStacksTransactionByteLength(
  transaction: StacksTransaction,
  signerCount?: number
): number {
  const baseByteLength = getEstimatedUnsignedStacksTxByteLength(transaction);
  if (transaction.signaturesRequired === undefined || transaction.signatures === undefined)
    return baseByteLength;
  const existingSignatureCount = transaction.signatures.filter(
    field => field.type === 'signature'
  ).length;
  const missingSignatureCount = Math.max(
    0,
    transaction.signaturesRequired - existingSignatureCount
  );
  const mode =
    transaction.signer?.hashMode ??
    (transaction.signaturesRequired === undefined ? 'p2pkh' : 'p2sh-non-sequential');
  if (mode !== 'p2sh-non-sequential' && mode !== 'p2wsh-non-sequential')
    return baseByteLength + missingSignatureCount * messageSignatureWireByteLength;
  const totalSigners = signerCount ?? transaction.signatures.length;
  return (
    baseByteLength +
    missingSignatureCount * messageSignatureWireByteLength +
    Math.max(0, totalSigners - transaction.signaturesRequired) * publicKeyWireByteLength
  );
}
