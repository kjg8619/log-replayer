import { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { JsonTree, DiffView } from './JsonTree';
import { formatTimestamp, formatDuration } from '../utils/formatters';
import { computeDiff } from '../utils/diff';

interface EventDetailEmptyProps {
  message?: string;
}

function EventDetailEmpty({ message = 'Select an event to view details' }: EventDetailEmptyProps) {
  return (
    <div className="event-detail-empty">
      <div className="event-detail-empty__icon">📄</div>
      <p className="event-detail-empty__message">{message}</p>
    </div>
  );
}

export function EventDetail() {
  const { currentEvent, previousEvent, selectedIndex, filteredEvents } = useApp();

  const diffResults = useMemo(() => {
    if (!currentEvent) return null;
    const beforeData = previousEvent?.payload ?? null;
    const afterData = currentEvent.payload;
    return computeDiff(beforeData, afterData);
  }, [currentEvent, previousEvent]);

  if (!currentEvent) {
    return (
      <div className="event-detail event-detail--empty">
        <EventDetailEmpty />
      </div>
    );
  }

  const hasChanges = diffResults && diffResults.length > 0;
  const changesSummary = diffResults ? {
    added: diffResults.filter(d => d.type === 'added').length,
    removed: diffResults.filter(d => d.type === 'removed').length,
    modified: diffResults.filter(d => d.type === 'modified').length,
  } : null;

  return (
    <div className="event-detail">
      <div className="event-detail__header">
        <div className="event-detail__index">
          Event {selectedIndex + 1} of {filteredEvents.length}
        </div>
        <div className="event-detail__timestamp">
          {formatTimestamp(currentEvent.timestamp)}
        </div>
      </div>

      <div className="event-detail__meta">
        <div className="event-detail__type">
          <span className="event-detail__label">Type:</span>
          <span className="event-detail__value event-detail__value--type">
            {currentEvent.type}
          </span>
        </div>
        {previousEvent && (
          <div className="event-detail__delta">
            <span className="event-detail__label">Since previous:</span>
            <span className="event-detail__value">
              {(() => {
                const deltaMs = Date.parse(currentEvent.timestamp) - Date.parse(previousEvent.timestamp);
                return Number.isNaN(deltaMs) ? '—' : formatDuration(deltaMs);
              })()}
            </span>
          </div>
        )}
      </div>

      {changesSummary && (
        <div className="event-detail__changes-summary">
          {changesSummary.added > 0 && (
            <span className="change-badge change-badge--added">
              +{changesSummary.added} added
            </span>
          )}
          {changesSummary.removed > 0 && (
            <span className="change-badge change-badge--removed">
              -{changesSummary.removed} removed
            </span>
          )}
          {changesSummary.modified > 0 && (
            <span className="change-badge change-badge--modified">
              ~{changesSummary.modified} modified
            </span>
          )}
        </div>
      )}

      <div className="event-detail__content">
        {hasChanges ? (
          <DiffView
            before={previousEvent?.payload ?? null}
            after={currentEvent.payload}
          />
        ) : (
          <div className="event-detail__data">
            <JsonTree data={currentEvent.payload} />
          </div>
        )}
      </div>

      <div className="event-detail__raw">
        <details className="event-detail__raw-details">
          <summary>Raw JSON</summary>
          <pre className="event-detail__raw-content">
            {JSON.stringify(currentEvent, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  );
}
