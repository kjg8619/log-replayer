import { useEffect, useState } from 'react';
import { useTimelineStore } from '../stores/timelineStore';
import { fetchSnapshot } from '../api/events';
import { JsonTree } from './JsonTree';

interface StateSnapshotProps {
  sessionId: string;
  sequence: number;
}

export function StateSnapshot({ sessionId, sequence }: StateSnapshotProps) {
  const [snapshot, setSnapshot] = useState<unknown | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (!sessionId) return;
    
    let cancelled = false;
    
    async function loadSnapshot() {
      setIsLoading(true);
      setError(null);
      
      try {
        const data = await fetchSnapshot(sessionId, sequence);
        if (!cancelled) {
          setSnapshot(data ?? null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load snapshot');
          setSnapshot(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }
    
    loadSnapshot();
    
    return () => {
      cancelled = true;
    };
  }, [sessionId, sequence]);
  
  const { currentStep, events } = useTimelineStore();
  const currentEvent = events[currentStep];
  
  return (
    <div className="state-snapshot">
      <div className="snapshot-header">
        <h3>State Snapshot</h3>
        <span className="snapshot-sequence">
          Sequence #{sequence}
        </span>
      </div>
      
      {isLoading && (
        <div className="snapshot-loading">
          <span className="loading-spinner">⏳</span>
          Loading snapshot...
        </div>
      )}
      
      {error && (
        <div className="snapshot-error">
          <span className="error-icon">❌</span>
          {error}
        </div>
      )}
      
      {!isLoading && !error && snapshot === null && (
        <div className="snapshot-empty">
          <p>No snapshot available for this sequence.</p>
        </div>
      )}
      
      {!isLoading && !error && snapshot !== null && snapshot !== undefined && (
        <div className="snapshot-content">
          {currentEvent && (
            <div className="snapshot-event-info">
              <span className="event-type">{currentEvent.type}</span>
              <span className="event-timestamp">{currentEvent.timestamp}</span>
            </div>
          )}
          
          <div className="snapshot-tree">
            <JsonTree data={snapshot} />
          </div>
        </div>
      )}
    </div>
  );
}
