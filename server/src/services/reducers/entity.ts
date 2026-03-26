type EntityMap = Record<string, Record<string, Record<string, unknown>>>;

export type EntityState = {
  entities: EntityMap;
};

type EntityCreatedPayload = {
  entityType: string;
  entityId: string;
  data: Record<string, unknown>;
};

type EntityUpdatedPayload = {
  entityType: string;
  entityId: string;
  changes: Record<string, unknown>;
};

type EntityDeletedPayload = {
  entityType: string;
  entityId: string;
};

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function cloneEntities(state: EntityState): EntityMap {
  return JSON.parse(JSON.stringify(state.entities)) as EntityMap;
}

export function createInitialEntityState(): EntityState {
  return { entities: {} };
}

export function reduceEntityEvent(
  state: Record<string, unknown>,
  eventType: string,
  payload: Record<string, unknown>,
): Record<string, unknown> {
  const root = asRecord(state);
  const current: EntityState = {
    entities: (asRecord(root.entities) as EntityMap) ?? {},
  };

  if (eventType === 'entity:created') {
    const input = payload as EntityCreatedPayload;
    const nextEntities = cloneEntities(current);
    if (!nextEntities[input.entityType]) {
      nextEntities[input.entityType] = {};
    }

    nextEntities[input.entityType][input.entityId] = {
      id: input.entityId,
      ...input.data,
    };

    return {
      ...root,
      entities: nextEntities,
    };
  }

  if (eventType === 'entity:updated') {
    const input = payload as EntityUpdatedPayload;
    const nextEntities = cloneEntities(current);
    const byType = nextEntities[input.entityType];

    if (!byType || !byType[input.entityId]) {
      return root;
    }

    byType[input.entityId] = {
      ...byType[input.entityId],
      ...input.changes,
    };

    return {
      ...root,
      entities: nextEntities,
    };
  }

  if (eventType === 'entity:deleted') {
    const input = payload as EntityDeletedPayload;
    const nextEntities = cloneEntities(current);
    const byType = nextEntities[input.entityType];

    if (!byType || !byType[input.entityId]) {
      return root;
    }

    delete byType[input.entityId];
    return {
      ...root,
      entities: nextEntities,
    };
  }

  return root;
}
