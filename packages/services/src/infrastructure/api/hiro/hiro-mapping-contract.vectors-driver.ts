import { readStxLockedBalance, readStxTotalBalance } from './hiro-stacks-api.utils';

export {
  transformHiroSip9Collection as collection,
  transformHiroSip9Attributes as attributes,
  filterVerboseUnusedTransactionWithTransfersData as transaction,
} from './hiro-stacks-api.utils';

export function balance(balance: string, locked: string) {
  const response = {
    balance,
    locked,
    total_miner_rewards_received: '0',
    lock_tx_id: '',
    lock_height: 0,
    burnchain_lock_height: 0,
    burnchain_unlock_height: 0,
  };
  return { total: readStxTotalBalance(response), locked: readStxLockedBalance(response) };
}
