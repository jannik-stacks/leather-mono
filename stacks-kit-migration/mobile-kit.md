# Mobile Kit migration

Mobile-owned Clarity, post-condition, transaction, signing, address and network operations
use Kit and the shared Kit-native entry points. Byte encoding uses Noble utilities; extended
v1 API response types come from Leather's models. The shared migration already moved the
transaction and approval consumers to Kit; this part removes their remaining stacks.js
imports and direct dependencies.

Metro resolves Kit's root with the `import` condition because Kit 0.1.0 exposes only an
ESM entry. Its core entry does not import the optional connect, wallet-picker, testing or
Vitest integrations. The existing `@stacks/connect-ui` empty resolver remains necessary:
`@leather.io/services` imports `@bitflowlabs/core-sdk@4.2.0`, which imports
`@stacks/connect@7.10.2` and its webpack-specific connect-ui integration.

Mobile retains no direct stacks.js dependencies. Shared services retain
`@stacks/network@7.0.2` and `@stacks/transactions@7.5.0` for
`alex-sdk@3.1.0` and `@velarprotocol/velar-sdk@0.7.6` peer requirements.
Bitflow also declares these packages as dependencies. Their legacy values are normalized
at the existing vendor wire boundaries before reaching mobile consumers.
`@leather.io/state` also reaches `sbtc@0.3.2` for Bitcoin deposit construction;
its dependency graph includes stacks.js common, encryption, network and transactions.

## Behavior contract

The unchanged frozen vectors cover Clarity text, all post-condition variants, request fees,
sponsorship, nonce-zero fallback and signed RPC replies. Settings tests reload JSON with
numeric chain and subnet IDs, keeping the parent network's transaction version and API URL.
Named testnet requests still select testnet4; devnet and mocknet remain unsupported with
`This network is currently not supported`. Invalid network names keep the existing
`Wrong network supplied in the rpc request params: ` error prefix.

## Kit gaps

No additional Kit gaps. Shared Clarity formatting and extended v1 API model gaps are
recorded in `docs/migrations/stacks-kit.md`.
