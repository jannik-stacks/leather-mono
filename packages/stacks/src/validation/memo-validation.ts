const maxMemoLengthBytes = 34;

function exceedsMaxLengthBytes(value: string, maxLengthBytes: number): boolean {
  return value ? Buffer.from(value).length > maxLengthBytes : false;
}

export function isValidStacksMemo(memo: string) {
  return !exceedsMaxLengthBytes(memo, maxMemoLengthBytes);
}
