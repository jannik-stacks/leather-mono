import { bytesToHex } from '@stacks/common';
import { values } from 'remeda';
import { z } from 'zod';

import { initalizeStacksSigner } from '@leather.io/stacks';

import { migrateToRenameKeysStoreModule } from './migrate-1-2';
import { migrateMultiWalletSupport } from './migrate-2-3';

function identity(descriptor: string) {
  const signer = initalizeStacksSigner({
    descriptor,
    network: 'mainnet',
    signFn() {
      throw new Error('No signing requested');
    },
    signMessageFn() {
      throw new Error('No signing requested');
    },
    signStructuredMessageFn() {
      throw new Error('No signing requested');
    },
  });
  return {
    descriptor,
    fingerprint: z.object({ fingerprint: z.string() }).parse(signer).fingerprint,
    accountIndex: signer.accountIndex,
    publicKey: bytesToHex(signer.publicKey),
    address: signer.address,
  };
}

export function migrateAccounts(stored: unknown) {
  const migrated = migrateMultiWalletSupport(migrateToRenameKeysStoreModule(stored));
  const software = z
    .object({
      chains: z.object({
        stx: z.record(z.string(), z.object({ currentAccountStacksDescriptor: z.string() })),
      }),
    })
    .safeParse(migrated);
  const ledger = z
    .object({
      keychains: z.object({
        entities: z.record(z.string(), z.object({ chain: z.string(), descriptor: z.string() })),
      }),
    })
    .safeParse(migrated);
  return {
    software: software.success
      ? values(software.data.chains.stx).map(key => identity(key.currentAccountStacksDescriptor))
      : [],
    ledger: ledger.success
      ? values(ledger.data.keychains.entities)
          .filter(key => key.chain === 'stacks')
          .map(key => identity(key.descriptor))
      : [],
  };
}
