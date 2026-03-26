import React, { useCallback } from 'react';
import { usePlayback } from '../hooks/usePlayback';

export function PlaybackControls() {
  const { isPlaying, speed, togglePlayback, setSpeed } = usePlayback();

  const handleSpeedChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSpeed(parseFloat(e.target.value));
  }, [setSpeed]);

  const speeds = [0.25, 0.5, 1, 2, 4, 8];

  return (
    <div className="playback-controls">
      <button
        className={`playback-controls__button playback-controls__button--play ${isPlaying ? 'playback-controls__button--playing' : ''}`}
        onClick={togglePlayback}
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? '⏸' : '▶'}
      </button>
      
      <div className="playback-controls__speed">
        <label className="playback-controls__speed-label">Speed:</label>
        <div className="playback-controls__speed-buttons">
          {speeds.map(s => (
            <button
              key={s}
              className={`playback-controls__speed-button ${speed === s ? 'playback-controls__speed-button--active' : ''}`}
              onClick={() => setSpeed(s)}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      <div className="playback-controls__range">
        <input
          type="range"
          min="0.25"
          max="8"
          step="0.25"
          value={speed}
          onChange={handleSpeedChange}
          className="playback-controls__slider"
          aria-label="Playback speed"
        />
        <span className="playback-controls__speed-value">{speed}x</span>
      </div>
    </div>
  );
}
