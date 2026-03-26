import { DiffResult } from '../types';

export function diffObjects(oldObj: Record<string, unknown>, newObj: Record<string, unknown>): DiffResult[] {
  const results: DiffResult[] = [];
  const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);

  for (const key of allKeys) {
    const oldValue = oldObj[key];
    const newValue = newObj[key];
    const path = key;

    if (!(key in oldObj)) {
      results.push({ type: 'added', path, newValue });
    } else if (!(key in newObj)) {
      results.push({ type: 'removed', path, oldValue });
    } else if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      if (typeof oldValue === 'object' && typeof newValue === 'object' && oldValue !== null && newValue !== null) {
        const nestedDiff = diffObjects(
          oldValue as Record<string, unknown>,
          newValue as Record<string, unknown>
        );
        for (const diff of nestedDiff) {
          results.push({
            ...diff,
            path: `${path}.${diff.path}`,
          });
        }
      } else {
        results.push({ type: 'modified', path, oldValue, newValue });
      }
    }
  }

  return results;
}

export function computeDiff(before: Record<string, unknown> | null, after: Record<string, unknown>): DiffResult[] {
  if (!before) {
    return Object.keys(after).map(key => ({
      type: 'added' as const,
      path: key,
      newValue: after[key],
    }));
  }
  return diffObjects(before, after);
}
