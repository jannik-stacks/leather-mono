import { type PostCondition, type Transaction } from '@jannik-stacks/kit';

import { Approver } from '@leather.io/ui';

import { NoPostConditions } from './no-post-conditions';
import { PostConditionList } from './post-condition-list';
import { PostConditionModeWarning } from './post-condition-mode-warning';

interface PostConditionsDetailsLayoutProps {
  postConditions: PostCondition[];
  postConditionMode?: 'allow' | 'deny' | 'originator' | Transaction['postConditionMode'];
}
export function PostConditionsDetailsLayout({
  postConditions,
  postConditionMode = 'deny',
}: PostConditionsDetailsLayoutProps) {
  if (postConditionMode === 'allow') return <PostConditionModeWarning />;

  return (
    <Approver.Section>
      <Approver.Subheader>Post conditions</Approver.Subheader>
      {postConditions.length ? (
        <PostConditionList postConditions={postConditions} />
      ) : (
        <NoPostConditions />
      )}
    </Approver.Section>
  );
}
