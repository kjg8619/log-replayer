import { memo, useCallback, useRef, useEffect, useState, type ChangeEvent } from 'react';
import { FixedSizeList as List, ListChildComponentProps } from 'react-window';
import { useApp } from '../context/AppContext';
import { LogEvent } from '../types';
import { formatTimestamp } from '../utils/formatters';
import { useKeyboard } from '../hooks/useKeyboard';
import { usePlayback } from '../hooks/usePlayback';

const EVENT_ITEM_HEIGHT = 64;

interface TimelineItemData {
  events: LogEvent[];
  selectedIndex: number;
  onEventClick: (index: number) => void;
}

const TimelineItem = memo(function TimelineItem({
  index,
  style,
  data,
}: ListChildComponentProps<TimelineItemData>) {
  const { events, selectedIndex, onEventClick } = data;
  const event = events[index];
  const isSelected = index === selectedIndex;

  if (!event) return null;

  return (
    <div
      style={style}
      className={`timeline-item ${isSelected ? 'timeline-item--selected' : ''}`}
      onClick={() => onEventClick(index)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onEventClick(index);
        }
      }}
      aria-selected={isSelected}
    >
      <div className="timeline-item__timestamp">
        {formatTimestamp(event.timestamp)}
      </div>
      <div className="timeline-item__type">{event.type}</div>
      <div className="timeline-item__preview">
        {JSON.stringify(event.payload).slice(0, 50)}
      </div>
    </div>
  );
});

interface TimelineEmptyProps {
  hasFilter: boolean;
}

function TimelineEmpty({ hasFilter }: TimelineEmptyProps) {
  return (
    <div className="timeline-empty">
      <div className="timeline-empty__icon">
        {hasFilter ? '🔍' : '📋'}
      </div>
      <h3 className="timeline-empty__title">
        {hasFilter ? 'No matching events' : 'No events loaded'}
      </h3>
      <p className="timeline-empty__message">
        {hasFilter
          ? 'Try adjusting your filter or search criteria'
          : 'Upload a session file to get started'}
      </p>
    </div>
  );
}

export function Timeline() {
  const {
    filteredEvents,
    selectedIndex,
    setSelectedIndex,
    filter,
    setFilter,
    eventTypes,
    playback,
  } = useApp();
  
  const listRef = useRef<List>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(600);

  useKeyboard();
  usePlayback();

  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerHeight(rect.height);
      }
    };

    updateHeight();
    const resizeObserver = new ResizeObserver(updateHeight);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    if (listRef.current && filteredEvents.length > 0) {
      listRef.current.scrollToItem(selectedIndex, 'smart');
    }
  }, [selectedIndex, filteredEvents.length]);

  const handleEventClick = useCallback((index: number) => {
    setSelectedIndex(index);
  }, [setSelectedIndex]);

  const handleTypeFilterChange = useCallback((e: ChangeEvent<HTMLSelectElement>) => {
    setFilter({ ...filter, type: e.target.value || null });
  }, [filter, setFilter]);

  const handleSearchChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setFilter({ ...filter, search: e.target.value });
  }, [filter, setFilter]);

  const itemData: TimelineItemData = {
    events: filteredEvents,
    selectedIndex,
    onEventClick: handleEventClick,
  };

  return (
    <div className="timeline" ref={containerRef}>
      <div className="timeline__header">
        <div className="timeline__controls">
          <select
            className="timeline__filter timeline__filter--type"
            value={filter.type || ''}
            onChange={handleTypeFilterChange}
            aria-label="Filter by event type"
          >
            <option value="">All Types</option>
            {eventTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          <input
            type="text"
            className="timeline__filter timeline__filter--search"
            placeholder="Search events..."
            value={filter.search}
            onChange={handleSearchChange}
            aria-label="Search events"
          />
        </div>
        <div className="timeline__info">
          <span className="timeline__count">
            {filteredEvents.length} events
          </span>
          {playback.isPlaying && (
            <span className="timeline__playback-indicator">
              ▶ {playback.speed}x
            </span>
          )}
        </div>
      </div>

      <div className="timeline__list-container">
        {filteredEvents.length === 0 ? (
          <TimelineEmpty hasFilter={!!(filter.type || filter.search)} />
        ) : (
          <List
            ref={listRef}
            height={containerHeight - 100}
            itemCount={filteredEvents.length}
            itemSize={EVENT_ITEM_HEIGHT}
            width="100%"
            itemData={itemData}
            overscanCount={5}
          >
            {TimelineItem}
          </List>
        )}
      </div>

      <div className="timeline__footer">
        <div className="timeline__keyboard-hints">
          <span>←→ Navigate</span>
          <span>Space Play/Pause</span>
          <span>Home/End First/Last</span>
        </div>
      </div>
    </div>
  );
}
