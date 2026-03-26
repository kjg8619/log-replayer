import type { LogEvent } from '../types';

interface EventItemProps {
  event: LogEvent;
  isActive: boolean;
  isPast: boolean;
  color: string;
  onClick: () => void;
}

const EVENT_ICONS: Record<string, string> = {
  click: '🖱️',
  input: '⌨️',
  api: '🌐',
  error: '❌',
  state: '📊',
  navigation: '🧭',
  default: '📝',
};

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp;
  return date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatPayloadPreview(payload: unknown): string {
  if (!payload) return '';
  
  if (typeof payload === 'object') {
    const obj = payload as Record<string, unknown>;
    const keys = Object.keys(obj).slice(0, 2);
    const preview = keys.map(k => `${k}: ${String(obj[k])}`).join(', ');
    return preview || 'Empty object';
  }
  
  return String(payload).slice(0, 50);
}

export function EventItem({ event, isActive, isPast, color, onClick }: EventItemProps) {
  const icon = EVENT_ICONS[event.type.toLowerCase()] || EVENT_ICONS.default;
  
  return (
    <div
      className={`event-item ${isActive ? 'active' : ''} ${isPast ? 'past' : ''}`}
      onClick={onClick}
      style={{
        borderLeftColor: color,
        borderLeftWidth: isActive ? '4px' : '2px',
      }}
    >
      <div className="event-item-icon" style={{ backgroundColor: color }}>
        {icon}
      </div>
      
      <div className="event-item-content">
        <div className="event-item-header">
          <span className="event-type">{event.type}</span>
          <span className="event-sequence">#{event.sequence}</span>
        </div>
        
        <div className="event-item-timestamp">
          {formatTimestamp(event.timestamp)}
        </div>
        
        <div className="event-item-preview">
          {formatPayloadPreview(event.payload)}
        </div>
      </div>
      
      {isActive && (
        <div className="event-item-indicator">
          ▶
        </div>
      )}
    </div>
  );
}
