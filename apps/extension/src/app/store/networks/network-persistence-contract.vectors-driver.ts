import { type PersistedNetworkConfiguration, networksSlice } from './networks.slice';

export function persist(network: PersistedNetworkConfiguration) {
  const initial = networksSlice.reducer(undefined, { type: 'init' });
  const added = networksSlice.reducer(initial, networksSlice.actions.addNetwork(network));
  const selected = networksSlice.reducer(added, networksSlice.actions.changeNetwork(network.id));
  return {
    added,
    selected,
    removed: networksSlice.reducer(selected, networksSlice.actions.removeNetwork(network.id)),
  };
}
