import { useState, useCallback } from 'react';
import { useTimelineStore } from '../stores/timelineStore';
import type { PlaybackSpeed } from '../types';

const SPEED_OPTIONS: PlaybackSpeed[] = [0.5, 1, 2, 5];

export function ControlBar() {
  const {
    isPlaying,
    playbackSpeed,
    currentStep,
    events,
    play,
    pause,
    next,
    previous,
    setPlaybackSpeed,
    setCurrentStep,
  } = useTimelineStore();
  
  const [jumpValue, setJumpValue] = useState('');
  
  const totalEvents = events.length;
  const canPrevious = currentStep > 0;
  const canNext = currentStep < totalEvents - 1;
  
  const handleJump = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const sequence = parseInt(jumpValue, 10);
    if (!isNaN(sequence) && sequence >= 0 && sequence < totalEvents) {
      setCurrentStep(sequence);
      setJumpValue('');
    }
  }, [jumpValue, totalEvents, setCurrentStep]);
  
  const handleSpeedChange = (speed: PlaybackSpeed) => {
    setPlaybackSpeed(speed);
  };
  
  return (
    <div className="control-bar">
      <div className="control-bar-section playback-controls">
        <button
          className="control-button"
          onClick={previous}
          disabled={!canPrevious}
          title="Previous event"
          aria-label="Previous event"
        >
          ⏮️
        </button>
        
        <button
          className="control-button play-pause"
          onClick={isPlaying ? pause : play}
          disabled={totalEvents === 0}
          title={isPlaying ? 'Pause' : 'Play'}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? '⏸️' : '▶️'}
        </button>
        
        <button
          className="control-button"
          onClick={next}
          disabled={!canNext}
          title="Next event"
          aria-label="Next event"
        >
          ⏭️
        </button>
      </div>
      
      <div className="control-bar-section position-info">
        <span className="current-position">
          Step {currentStep + 1} / {totalEvents || 0}
        </span>
      </div>
      
      <div className="control-bar-section jump-to">
        <form onSubmit={handleJump}>
          <label htmlFor="jump-input" className="jump-label">
            Jump to:
          </label>
          <input
            id="jump-input"
            type="number"
            className="jump-input"
            value={jumpValue}
            onChange={(e) => setJumpValue(e.target.value)}
            min={0}
            max={totalEvents - 1}
            placeholder="0"
          />
          <button
            type="submit"
            className="control-button jump-button"
            disabled={!jumpValue || totalEvents === 0}
          >
            Go
          </button>
        </form>
      </div>
      
      <div className="control-bar-section speed-control">
        <span className="speed-label">Speed:</span>
        <div className="speed-options">
          {SPEED_OPTIONS.map((speed) => (
            <button
              key={speed}
              className={`speed-button ${playbackSpeed === speed ? 'active' : ''}`}
              onClick={() => handleSpeedChange(speed)}
              aria-pressed={playbackSpeed === speed}
            >
              {speed}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
