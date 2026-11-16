import { type Client } from '@jannik-stacks/kit';
import { type MethodResponse } from 'openapi-fetch';

type KitTransactionResponse = MethodResponse<
  Client['api'],
  'get',
  '/extended/v3/transactions/{tx_id}'
>;
type WithIsoFields<T> = T extends { block: infer Block; bitcoin_block: infer BitcoinBlock }
  ? T & {
      block: Block & { time_iso?: string };
      bitcoin_block: BitcoinBlock & { time_iso?: string };
    }
  : T & { receipt_time_iso?: string };
export type StacksApiTransactionResponse = WithIsoFields<KitTransactionResponse>;
type KitFeeEstimate = MethodResponse<Client['api'], 'post', '/v2/fees/transaction'>;
interface StacksApiFeeEstimation extends Partial<KitFeeEstimate['estimations'][number]> {
  [key: string]: unknown;
}
export interface StacksApiFeeEstimate
  extends Omit<KitFeeEstimate, 'cost_scalar_change_by_byte' | 'estimations'> {
  cost_scalar_change_by_byte?: KitFeeEstimate['cost_scalar_change_by_byte'];
  estimations?: StacksApiFeeEstimation[];
}

export interface StacksApiAddressTransactionWithTransfers {
  tx: StacksApiTransaction;
  stx_sent: string;
  stx_received: string;
  stx_transfers: {
    amount: string;
    sender?: string;
    recipient?: string;
  }[];
  ft_transfers?: {
    asset_identifier: string;
    amount: string;
    sender?: string;
    recipient?: string;
  }[];
  nft_transfers?: {
    asset_identifier: string;
    value: {
      hex: string;
      repr: string;
    };
    sender?: string;
    recipient?: string;
  }[];
}

export type StacksApiTransaction =
  | StacksApiTokenTransferTransaction
  | StacksApiSmartContractTransaction
  | StacksApiContractCallTransaction
  | StacksApiPoisonMicroblockTransaction
  | StacksApiCoinbaseTransaction
  | StacksApiTenureChangeTransaction;

export type StacksApiTokenTransferTransaction = StacksApiAbstractTransaction &
  StacksApiTokenTransferTransactionMetadata;

export type StacksApiAbstractTransaction = StacksApiBaseTransaction & {
  block_hash: string;
  block_height: number;
  block_time: number;
  block_time_iso: string;
  burn_block_height: number;
  burn_block_time: number;
  burn_block_time_iso: string;
  parent_burn_block_time: number;
  parent_burn_block_time_iso: string;
  canonical: boolean;
  tx_index: number;
  tx_status: StacksApiTransactionStatus;
  tx_result: {
    hex: string;
    repr: string;
  };
  event_count: number;
  parent_block_hash: string;
  is_unanchored: boolean;
  microblock_hash: string;
  microblock_sequence: number;
  microblock_canonical: boolean;
  execution_cost_read_count: number;
  execution_cost_read_length: number;
  execution_cost_runtime: number;
  execution_cost_write_count: number;
  execution_cost_write_length: number;
  events: StacksApiTransactionEvent[];
};

export interface StacksApiBaseTransaction {
  tx_id: string;
  nonce: number;
  fee_rate: string;
  sender_address: string;
  sponsor_nonce?: number;
  sponsored: boolean;
  sponsor_address?: string;
  post_condition_mode: StacksApiPostConditionMode;
  post_conditions: StacksApiPostCondition[];
  anchor_mode: StacksApiTransactionAnchorModeType;
}

type StacksApiPostConditionMode = 'allow' | 'deny';

export type StacksApiPostCondition =
  | StacksApiPostConditionStx
  | StacksApiPostConditionFungible
  | StacksApiPostConditionNonFungible;

export type StacksApiPostConditionStx = {
  principal: StacksApiPostConditionPrincipal;
} & {
  condition_code: StacksApiPostConditionFungibleConditionCode;
  amount: string;
  type: 'stx';
};

type StacksApiPostConditionPrincipal =
  | {
      type_id: 'principal_origin';
    }
  | {
      type_id: 'principal_standard';
      address: string;
    }
  | {
      type_id: 'principal_contract';
      address: string;
      contract_name: string;
    };

type StacksApiPostConditionFungibleConditionCode =
  | 'sent_equal_to'
  | 'sent_greater_than'
  | 'sent_greater_than_or_equal_to'
  | 'sent_less_than'
  | 'sent_less_than_or_equal_to';

export type StacksApiPostConditionFungible = {
  principal: StacksApiPostConditionPrincipal;
} & {
  condition_code: StacksApiPostConditionFungibleConditionCode;
  type: 'fungible';
  amount: string;
  asset: {
    asset_name: string;
    contract_address: string;
    contract_name: string;
  };
};

export type StacksApiPostConditionNonFungible = {
  principal: StacksApiPostConditionPrincipal;
} & {
  condition_code: StacksApiPostConditionNonFungibleConditionCode;
  type: 'non_fungible';
  asset_value: {
    hex: string;
    repr: string;
  };
  asset: {
    asset_name: string;
    contract_address: string;
    contract_name: string;
  };
};

type StacksApiPostConditionNonFungibleConditionCode = 'sent' | 'not_sent';

type StacksApiTransactionAnchorModeType = 'on_chain_only' | 'off_chain_only' | 'any';

type StacksApiTransactionStatus = 'success' | 'abort_by_response' | 'abort_by_post_condition';

export type StacksApiTransactionEvent =
  | StacksApiTransactionEventSmartContractLog
  | StacksApiTransactionEventStxLock
  | StacksApiTransactionEventStxAsset
  | StacksApiTransactionEventFungibleAsset
  | StacksApiTransactionEventNonFungibleAsset;

export type StacksApiTransactionEventSmartContractLog = StacksApiAbstractTransactionEvent & {
  event_type: 'smart_contract_log';
  tx_id: string;
  contract_log: {
    contract_id: string;
    topic: string;
    value: {
      hex: string;
      repr: string;
    };
  };
};

interface StacksApiAbstractTransactionEvent {
  event_index: number;
}

type StacksApiTransactionEventStxLock = StacksApiAbstractTransactionEvent & {
  event_type: 'stx_lock';
  tx_id: string;
  stx_lock_event: {
    locked_amount: string;
    unlock_height: number;
    locked_address: string;
  };
};

export type StacksApiTransactionEventStxAsset = StacksApiAbstractTransactionEvent & {
  event_type: 'stx_asset';
  tx_id: string;
  asset: StacksApiTransactionEventAsset;
};

interface StacksApiTransactionEventAsset {
  asset_event_type?: StacksApiTransactionEventAssetType;
  asset_id?: string;
  sender?: string;
  recipient?: string;
  amount?: string;
  value?: string;
  memo?: string;
}

type StacksApiTransactionEventAssetType = 'transfer' | 'mint' | 'burn';

export type StacksApiTransactionEventFungibleAsset = StacksApiAbstractTransactionEvent & {
  event_type: 'fungible_token_asset';
  tx_id: string;
  asset: {
    asset_event_type: string;
    asset_id: string;
    sender: string;
    recipient: string;
    amount: string;
  };
};

export type StacksApiTransactionEventNonFungibleAsset = StacksApiAbstractTransactionEvent & {
  event_type: 'non_fungible_token_asset';
  tx_id: string;
  asset: {
    asset_event_type: string;
    asset_id: string;
    sender: string;
    recipient: string;
    value: {
      hex: string;
      repr: string;
    };
  };
};

interface StacksApiTokenTransferTransactionMetadata {
  tx_type: 'token_transfer';
  token_transfer: {
    recipient_address: string;
    amount: string;
    memo: string;
  };
}

export type StacksApiSmartContractTransaction = StacksApiAbstractTransaction &
  StacksApiSmartContractTransactionMetadata;

interface StacksApiSmartContractTransactionMetadata {
  tx_type: 'smart_contract';
  smart_contract: {
    clarity_version?: number;
    contract_id: string;
    source_code: string;
  };
}

export type StacksApiContractCallTransaction = StacksApiAbstractTransaction &
  StacksApiContractCallTransactionMetadata;

interface StacksApiContractCallTransactionMetadata {
  tx_type: 'contract_call';
  contract_call: {
    contract_id: string;
    function_name: string;
    function_signature: string;
    function_args?: {
      hex: string;
      repr: string;
      name: string;
      type: string;
    }[];
  };
}

type StacksApiPoisonMicroblockTransaction = StacksApiAbstractTransaction &
  StacksApiPoisonMicroblockTransactionMetadata;

interface StacksApiPoisonMicroblockTransactionMetadata {
  tx_type: 'poison_microblock';
  poison_microblock: {
    microblock_header_1: string;
    microblock_header_2: string;
  };
}

type StacksApiCoinbaseTransaction = StacksApiAbstractTransaction &
  StacksApiCoinbaseTransactionMetadata;

interface StacksApiCoinbaseTransactionMetadata {
  tx_type: 'coinbase';
  coinbase_payload: {
    data: string;
    alt_recipient?: string;
    vrf_proof?: string;
  };
}

type StacksApiTenureChangeTransaction = StacksApiAbstractTransaction &
  StacksApiTenureChangeTransactionMetadata;

interface StacksApiTenureChangeTransactionMetadata {
  tx_type: 'tenure_change';
  tenure_change_payload?: {
    tenure_consensus_hash: string;
    prev_tenure_consensus_hash: string;
    burn_view_consensus_hash: string;
    previous_tenure_end: string;
    previous_tenure_blocks: number;
    cause: 'block_found' | 'extended';
    pubkey_hash: string;
  };
}

export interface StacksApiGetRawTransactionResult {
  raw_tx: string;
}

export type StacksApiMempoolTransaction =
  | StacksApiMempoolTokenTransferTransaction
  | StacksApiMempoolSmartContractTransaction
  | StacksApiMempoolContractCallTransaction
  | StacksApiMempoolPoisonMicroblockTransaction
  | StacksApiMempoolCoinbaseTransaction
  | StacksApiMempoolTenureChangeTransaction;

export type StacksApiMempoolTokenTransferTransaction = StacksApiAbstractMempoolTransaction &
  StacksApiTokenTransferTransactionMetadata;

type StacksApiAbstractMempoolTransaction = StacksApiBaseTransaction & {
  tx_status: StacksApiMempoolTransactionStatus;
  receipt_time: number;
  receipt_time_iso: string;
};

type StacksApiMempoolTransactionStatus =
  | 'pending'
  | 'dropped_replace_by_fee'
  | 'dropped_replace_across_fork'
  | 'dropped_too_expensive'
  | 'dropped_stale_garbage_collect'
  | 'dropped_problematic';

export type StacksApiMempoolSmartContractTransaction = StacksApiAbstractMempoolTransaction &
  StacksApiSmartContractTransactionMetadata;

export type StacksApiMempoolContractCallTransaction = StacksApiAbstractMempoolTransaction &
  StacksApiContractCallTransactionMetadata;

type StacksApiMempoolPoisonMicroblockTransaction = StacksApiAbstractMempoolTransaction &
  StacksApiPoisonMicroblockTransactionMetadata;

type StacksApiMempoolCoinbaseTransaction = StacksApiAbstractMempoolTransaction &
  StacksApiCoinbaseTransactionMetadata;

type StacksApiMempoolTenureChangeTransaction = StacksApiAbstractMempoolTransaction &
  StacksApiTenureChangeTransactionMetadata;

export interface StacksApiAddressAssetsListResponse {
  limit: number;
  offset: number;
  total: number;
  results: StacksApiTransactionEvent[];
}

export interface StacksApiAddressBalanceResponse {
  stx: StacksApiStxBalance;
  fungible_tokens: {
    [k: string]: StacksApiFtBalance | undefined;
  };
  non_fungible_tokens: {
    [k: string]: StacksApiNftBalance | undefined;
  };
  token_offering_locked?: StacksApiAddressTokenOfferingLocked;
}

interface StacksApiStxBalance {
  balance: string;
  total_sent: string;
  total_received: string;
  total_fees_sent: string;
  total_miner_rewards_received: string;
  lock_tx_id: string;
  locked: string;
  lock_height: number;
  burnchain_lock_height: number;
  burnchain_unlock_height: number;
}

interface StacksApiFtBalance {
  balance: string;
  total_sent: string;
  total_received: string;
}

interface StacksApiNftBalance {
  count: string;
  total_sent: string;
  total_received: string;
}

interface StacksApiAddressTokenOfferingLocked {
  total_locked: string;
  total_unlocked: string;
  unlock_schedule: StacksApiAddressUnlockSchedule[];
}

interface StacksApiAddressUnlockSchedule {
  amount: string;
  block_height: number;
}

export interface StacksApiAddressTransactionsWithTransfersListResponse {
  limit: number;
  offset: number;
  total: number;
  results: StacksApiAddressTransactionWithTransfers[];
}

export interface StacksApiServerStatusResponse {
  server_version?: string;
  status: string;
  pox_v1_unlock_height?: number;
  pox_v2_unlock_height?: number;
  pox_v3_unlock_height?: number;
  chain_tip?: StacksApiChainTip;
}

interface StacksApiChainTip {
  block_height: number;
  block_hash: string;
  index_block_hash: string;
  microblock_hash?: string;
  microblock_sequence?: number;
  burn_block_height: number;
}

export type StacksApiTransactionFeeEstimateResponse = StacksApiFeeEstimate;
