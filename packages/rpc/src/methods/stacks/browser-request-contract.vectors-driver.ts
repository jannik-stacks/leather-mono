import { stxAddAccount } from './stx-add-account';
import { stxCallContract } from './stx-call-contract';
import { stxDeployContract } from './stx-deploy-contract';
import { stxSignMessage } from './stx-sign-message';
import { stxTransferStx } from './stx-transfer-stx';

const endpoints = {
  add: stxAddAccount,
  call: stxCallContract,
  deploy: stxDeployContract,
  message: stxSignMessage,
  transfer: stxTransferStx,
};
export function request(method: keyof typeof endpoints, input: unknown) {
  const parsed = endpoints[method].params.safeParse(input);
  return parsed.success
    ? { method: endpoints[method].method, data: parsed.data }
    : { issues: parsed.error.issues };
}
export function result(input: unknown) {
  const parsed = stxCallContract.result.safeParse(input);
  return parsed.success ? parsed.data : parsed.error.issues;
}
