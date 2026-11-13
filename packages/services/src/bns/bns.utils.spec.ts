import { readFileSync as readStacksVectorFileSync } from 'node:fs';

import {
  type BnsV2ApiZoneFilResponse,
  type BnsV2ApiZoneFileAddress,
} from '../infrastructure/api/bns-v2/bns-v2-api.schema';
import * as bnsContractVectorDriver from './bns-contract.vectors-driver';
import { mapBnsProfileDataAddresses, mapBnsProfileDataFromZoneFile } from './bns.utils';

describe(mapBnsProfileDataAddresses.name, () => {
  const oldSchemaBtcAddress = '3123123123123123123123123123123123123123';
  const nativeSegwitBtcAddress = 'bc1q1234567890123456789012345678901234567890';
  const ethAddress = '0x1234567890123456789012345678901234567890';
  const solAddress = 'So11111111111111111111111111111111111111112';

  it('should build profile btc, eth, and sol addresses from the zone file', () => {
    const zoneFileAddresses: BnsV2ApiZoneFileAddress[] = [
      {
        network: 'btc',
        type: 'payment',
        address: nativeSegwitBtcAddress,
      },
      {
        network: 'eth',
        type: 'wallet',
        address: ethAddress,
      },
      {
        network: 'sol',
        type: 'wallet',
        address: solAddress,
      },
    ];
    expect(mapBnsProfileDataAddresses(oldSchemaBtcAddress, zoneFileAddresses)).toEqual({
      bitcoinPayment: nativeSegwitBtcAddress,
      ethereum: ethAddress,
      solana: solAddress,
    });
  });

  it('should use the old schema btc address as payment address if no new payment address in zone file', () => {
    expect(mapBnsProfileDataAddresses(oldSchemaBtcAddress, [])).toEqual({
      bitcoinPayment: oldSchemaBtcAddress,
    });
  });

  it('should return an empty object if no addresses are provided', () => {
    expect(mapBnsProfileDataAddresses(undefined, [])).toEqual({});
  });
});

describe(mapBnsProfileDataFromZoneFile.name, () => {
  const name = 'name';
  const bio = 'bio';
  const website = 'website';
  const pfp = 'pfp';
  const location = 'location';
  const btc = 'btc';

  const zoneFileRaw: BnsV2ApiZoneFilResponse = {
    full_name: 'full_name',
    zonefile: {
      bio,
      website,
      pfp,
      name,
      location,
      addresses: [],
      btc,
    },
  };

  it('should map bns profile data from a raw zone file response', () => {
    expect(mapBnsProfileDataFromZoneFile(zoneFileRaw.zonefile)).toEqual({
      bio,
      website,
      pfpUrl: pfp,
      name,
      location,
      addresses: {
        bitcoinPayment: btc,
      },
    });
  });

  it('should remove undefined values from the profile data', () => {
    expect(mapBnsProfileDataFromZoneFile({ bio })).toEqual({
      bio,
    });
  });
});

describe('Stacks migration vectors: bns-contract', () => {
  const expected: unknown = JSON.parse(
    readStacksVectorFileSync(__dirname + '/vectors/bns-contract.json', 'utf8')
  );

  test('pins BNS Clarity responses and profile mapping', () => {
    const results = {
      primary: [
        '070c00000002046e616d650200000005616c696365096e616d6573706163650200000003627463',
        '070a0c00000002046e616d650200000005616c696365096e616d6573706163650200000003627463',
        '080100000000000000000000000000000083',
        '080100000000000000000000000000000001',
        '0709',
        '03',
      ].map(bnsContractVectorDriver.primary),
      profiles: [
        {},
        {
          name: 'alice',
          bio: 'hello',
          btc: 'legacy',
          addresses: [
            { network: 'btc', type: 'payment', address: 'bc1payment' },
            { network: 'eth', type: 'wallet', address: '0x123' },
          ],
        },
        { name: '', bio: '', btc: 'legacy' },
      ].map(bnsContractVectorDriver.profile),
    };
    const actual: unknown = JSON.parse(
      JSON.stringify(results, (_, value: unknown) =>
        typeof value === 'bigint' ? value.toString() : value
      )
    );
    expect(actual).toEqual(expected);
  });
});
