import { Codec, type PostCondition } from '@jannik-stacks/kit';

export const mockStxPostCondition: Extract<PostCondition, { type: 'stx-postcondition' }> = {
  type: 'stx-postcondition',
  address: 'ST2PABAF9FTAJYNFZH93XENAJ8FVY99RRM4DF2YCW',
  condition: 'eq',
  amount: BigInt(100000000),
};

export const mockPostConditionHex = Codec.Raw.PostCondition.encode(mockStxPostCondition);

export const mockDeserializedPostCondition = Codec.Raw.PostCondition.decode(mockPostConditionHex);

const mockStakingPostCondition: Extract<PostCondition, { type: 'staking-postcondition' }> = {
  type: 'staking-postcondition',
  address: 'ST2PABAF9FTAJYNFZH93XENAJ8FVY99RRM4DF2YCW',
  condition: 'gte',
  amount: BigInt(100000000),
};

export const mockStakingPostConditionHex = Codec.Raw.PostCondition.encode(mockStakingPostCondition);

export const mockDeserializedStakingPostCondition = Codec.Raw.PostCondition.decode(
  mockStakingPostConditionHex
);

const mockPoxPostCondition: Extract<PostCondition, { type: 'pox-postcondition' }> = {
  type: 'pox-postcondition',
  address: 'ST2PABAF9FTAJYNFZH93XENAJ8FVY99RRM4DF2YCW',
  condition: 'will-not-perform',
};

export const mockPoxPostConditionHex = Codec.Raw.PostCondition.encode(mockPoxPostCondition);

export const mockDeserializedPoxPostCondition =
  Codec.Raw.PostCondition.decode(mockPoxPostConditionHex);
