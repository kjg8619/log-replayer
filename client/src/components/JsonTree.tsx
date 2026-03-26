import { useState, memo } from 'react';
import { JsonNodeProps, DiffResult } from '../types';

const JsonNode = memo(function JsonNode({
  keyName,
  value,
  path,
  depth,
  diffMode = false,
  diffResult,
  isLast = true,
}: JsonNodeProps) {
  const [isExpanded, setIsExpanded] = useState(depth < 2);

  const isRecord = (input: unknown): input is Record<string, unknown> => {
    return typeof input === 'object' && input !== null && !Array.isArray(input);
  };

  const getDiffClass = () => {
    if (!diffMode || !diffResult) return '';
    switch (diffResult.type) {
      case 'added': return 'json-node--added';
      case 'removed': return 'json-node--removed';
      case 'modified': return 'json-node--modified';
      default: return 'json-node--unchanged';
    }
  };

  const getNestedDiff = (childKey: string): DiffResult | undefined => {
    if (!diffMode || !diffResult || diffResult.type !== 'modified') return undefined;
    if (isRecord(diffResult.oldValue) && isRecord(diffResult.newValue)) {
      const oldHasKey = Object.prototype.hasOwnProperty.call(diffResult.oldValue, childKey);
      const newHasKey = Object.prototype.hasOwnProperty.call(diffResult.newValue, childKey);
      const oldChild = diffResult.oldValue[childKey];
      const newChild = diffResult.newValue[childKey];

      if (oldChild !== newChild) {
        if (newHasKey && !oldHasKey) return { type: 'added', path: childKey, newValue: newChild };
        if (!newHasKey && oldHasKey) return { type: 'removed', path: childKey, oldValue: oldChild };
        return { type: 'modified', path: childKey, oldValue: oldChild, newValue: newChild };
      }
    }
    return undefined;
  };

  const renderArrayValue = (items: unknown[]) => {
    return (
      <span className="json-value json-value--bracket">
        <button
          className="json-toggle"
          onClick={() => setIsExpanded(!isExpanded)}
          aria-expanded={isExpanded}
        >
          {isExpanded ? '▼' : '▶'} [{items.length}]
        </button>
        {isExpanded && (
          <span className="json-children">
            {items.map((item, i) => (
              <JsonNode
                key={i}
                keyName={null}
                value={item}
                path={[...path, String(i)]}
                depth={depth + 1}
                diffMode={diffMode}
                diffResult={getNestedDiff(String(i))}
                isLast={i === items.length - 1}
              />
            ))}
          </span>
        )}
        {!isExpanded && ' ]'}
      </span>
    );
  };

  const renderObjectValue = (objectValue: Record<string, unknown>) => {
    const entries = Object.entries(objectValue);
    return (
      <span className="json-value json-value--bracket">
        <button
          className="json-toggle"
          onClick={() => setIsExpanded(!isExpanded)}
          aria-expanded={isExpanded}
        >
          {isExpanded ? '▼' : '▶'} {'{'}
        </button>
        {isExpanded && (
          <span className="json-children">
            {entries.map(([k, v], i) => (
              <JsonNode
                key={k}
                keyName={k}
                value={v}
                path={[...path, k]}
                depth={depth + 1}
                diffMode={diffMode}
                diffResult={getNestedDiff(k)}
                isLast={i === entries.length - 1}
              />
            ))}
          </span>
        )}
        {isExpanded && <span className="json-closing">{entries.length > 0 ? '}' : '{}'}</span>}
        {!isExpanded && ' {...}'}
      </span>
    );
  };

  const renderValue = () => {
    if (value === null) return <span className="json-value json-value--null">null</span>;
    if (value === undefined) return <span className="json-value json-value--undefined">undefined</span>;
    if (typeof value === 'boolean') return <span className="json-value json-value--boolean">{String(value)}</span>;
    if (typeof value === 'number') return <span className="json-value json-value--number">{value}</span>;
    if (typeof value === 'string') return <span className="json-value json-value--string">"{value}"</span>;
    if (Array.isArray(value)) return renderArrayValue(value);
    if (isRecord(value)) return renderObjectValue(value);
    return <span className="json-value">{String(value)}</span>;
  };

  const comma = isLast ? '' : ',';

  return (
    <div className={`json-node ${getDiffClass()}`} style={{ marginLeft: depth * 16 }}>
      {keyName !== null && (
        <>
          <span className="json-key">"{keyName}"</span>
          <span className="json-colon">: </span>
        </>
      )}
      {renderValue()}
      <span className="json-comma">{comma}</span>
    </div>
  );
});

interface JsonTreeProps {
  data: unknown;
  diffMode?: boolean;
  diffResults?: DiffResult[];
}

export function JsonTree({ data, diffMode = false, diffResults = [] }: JsonTreeProps) {
  void diffResults; // used for potential future diff highlighting
  return (
    <div className="json-tree">
      <JsonNode
        keyName={null}
        value={data}
        path={[]}
        depth={0}
        diffMode={diffMode}
        diffResult={undefined}
        isLast={true}
      />
    </div>
  );
}

interface DiffViewProps {
  before: Record<string, unknown> | null;
  after: Record<string, unknown>;
}

export function DiffView({ before, after }: DiffViewProps) {
  const diffResults: DiffResult[] = [];
  
  if (!before) {
    Object.keys(after).forEach(key => {
      diffResults.push({ type: 'added', path: key, newValue: after[key] });
    });
  } else {
    const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
    for (const key of allKeys) {
      if (!(key in before)) {
        diffResults.push({ type: 'added', path: key, newValue: after[key] });
      } else if (!(key in after)) {
        diffResults.push({ type: 'removed', path: key, oldValue: before[key] });
      } else if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
        diffResults.push({ type: 'modified', path: key, oldValue: before[key], newValue: after[key] });
      }
    }
  }

  return (
    <div className="diff-view">
      <div className="diff-view__legend">
        <span className="diff-legend diff-legend--added">+ Added</span>
        <span className="diff-legend diff-legend--removed">- Removed</span>
        <span className="diff-legend diff-legend--modified">~ Modified</span>
      </div>
      <JsonTree data={after} diffMode={true} diffResults={diffResults} />
    </div>
  );
}
