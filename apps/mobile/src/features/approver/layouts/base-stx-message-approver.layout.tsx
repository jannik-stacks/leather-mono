import { ApproverAccountCard } from '@/features/approver/components/approver-account-card';
import { type Account } from '@/store/accounts/accounts';
import { t } from '@lingui/core/macro';

import { makeAccountIdentifer } from '@leather.io/crypto';
import { decodeStructuredMessage } from '@leather.io/stacks';
import { Approver, Button, Cell, Text } from '@leather.io/ui/native';

import { ApproverButtons } from '../components/approver-buttons';
import { StructuredMessageSection } from '../structured-message.section';

interface BaseStxMessageApproverLayoutProps {
  origin: string;
  onApprove(): Promise<void>;
  onCloseApprover(): void;
  onInvalidMessage(): void;
  accountId: string | null;
  accounts: Account[];
  messageToSign:
    | {
        messageType: 'utf8';
        message: string;
      }
    | {
        messageType: 'structured';
        message: string;
        domain: string;
      };
}

export function BaseStxMessageApproverLayout({
  origin,
  onApprove,
  onCloseApprover,
  accountId,
  accounts,
  messageToSign,
  onInvalidMessage,
}: BaseStxMessageApproverLayoutProps) {
  const structuredMessage =
    messageToSign.messageType === 'structured'
      ? decodeStructuredMessage(messageToSign.message, messageToSign.domain)
      : undefined;
  return (
    <Approver requester={origin}>
      <Approver.Container>
        <Approver.Header title={t`Sign Message`} />
        <Approver.Section>
          <ApproverAccountCard
            accounts={accounts.filter(
              acc => makeAccountIdentifer(acc.fingerprint, acc.accountIndex) === accountId
            )}
          />
        </Approver.Section>
        {messageToSign.messageType === 'utf8' && (
          <Approver.Section>
            <Text variant="label01">{t`Message`}</Text>
            <Cell.Root pressable={false}>
              <Cell.Content>
                <Cell.Label variant="primary">{messageToSign.message}</Cell.Label>
              </Cell.Content>
            </Cell.Root>
          </Approver.Section>
        )}
        {structuredMessage === null && (
          <Approver.Section>
            <Text>{t`Invalid structured message`}</Text>
          </Approver.Section>
        )}
        {structuredMessage && <StructuredMessageSection {...structuredMessage} />}
      </Approver.Container>
      <Approver.Footer>
        {structuredMessage === null ? (
          <Button onPress={onInvalidMessage}>{t`Close`}</Button>
        ) : (
          <ApproverButtons
            onBack={onCloseApprover}
            onClose={onCloseApprover}
            onApprove={onApprove}
          />
        )}
      </Approver.Footer>
    </Approver>
  );
}
