import { reduceEntityEvent } from './reducers/entity';

export type State = Record<string, unknown>;

export type ReducerEvent = {
  type: string;
  payload: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

export type ReducerRegistry = {
  reduce: (state: State, event: ReducerEvent) => State;
};

export function createReducerRegistry(): ReducerRegistry {
  return {
    reduce(state: State, event: ReducerEvent): State {
      if (
        event.type === 'entity:created'
        || event.type === 'entity:updated'
        || event.type === 'entity:deleted'
      ) {
        return reduceEntityEvent(state, event.type, event.payload);
      }

      return state;
    },
  };
}
