import React, { useCallback, useMemo } from 'react';

export interface FilterState {
  type: string | null;
  search: string;
}

interface FilterBarProps {
  eventTypes: string[];
  filter: FilterState;
  onFilterChange: (filter: FilterState) => void;
  totalCount: number;
  filteredCount: number;
  isPlaying?: boolean;
  playbackSpeed?: number;
}

export function FilterBar({
  eventTypes,
  filter,
  onFilterChange,
  totalCount,
  filteredCount,
  isPlaying = false,
  playbackSpeed = 1,
}: FilterBarProps) {
  const handleTypeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({ ...filter, type: e.target.value || null });
  }, [filter, onFilterChange]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({ ...filter, search: e.target.value });
  }, [filter, onFilterChange]);

  const handleClearFilter = useCallback(() => {
    onFilterChange({ type: null, search: '' });
  }, [onFilterChange]);

  const hasActiveFilter = filter.type !== null || filter.search !== '';

  const typeOptions = useMemo(() => {
    return eventTypes.map(type => (
      <option key={type} value={type}>
        {type}
      </option>
    ));
  }, [eventTypes]);

  return (
    <div className="filter-bar">
      <div className="filter-bar__controls">
        <div className="filter-bar__field">
          <label htmlFor="event-type-filter" className="filter-bar__label">
            Type
          </label>
          <select
            id="event-type-filter"
            className="filter-bar__select"
            value={filter.type || ''}
            onChange={handleTypeChange}
            aria-label="Filter by event type"
          >
            <option value="">All Types</option>
            {typeOptions}
          </select>
        </div>

        <div className="filter-bar__field filter-bar__field--search">
          <label htmlFor="event-search" className="filter-bar__label">
            Search
          </label>
          <div className="filter-bar__search-wrapper">
            <span className="filter-bar__search-icon">🔍</span>
            <input
              id="event-search"
              type="text"
              className="filter-bar__input"
              placeholder="Search events..."
              value={filter.search}
              onChange={handleSearchChange}
              aria-label="Search events"
            />
            {filter.search && (
              <button
                type="button"
                className="filter-bar__clear"
                onClick={() => onFilterChange({ ...filter, search: '' })}
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {hasActiveFilter && (
          <button
            type="button"
            className="filter-bar__reset"
            onClick={handleClearFilter}
            aria-label="Clear all filters"
          >
            Clear Filters
          </button>
        )}
      </div>

      <div className="filter-bar__info">
        <span className="filter-bar__count">
          {filteredCount === totalCount
            ? `${totalCount.toLocaleString()} events`
            : `${filteredCount.toLocaleString()} of ${totalCount.toLocaleString()} events`}
        </span>
        {isPlaying && (
          <span className="filter-bar__playback-indicator">
            ▶ {playbackSpeed}x
          </span>
        )}
      </div>
    </div>
  );
}