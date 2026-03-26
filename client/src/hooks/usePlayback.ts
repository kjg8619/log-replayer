import { useEffect, useRef, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import type { PlaybackSpeed } from '../types';

export function usePlayback() {
  const { playback, setPlayback, filteredEvents, selectedIndex, addToast } = useApp();
  const intervalRef = useRef<number | null>(null);

  const clearPlaybackInterval = useCallback(() => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startPlayback = useCallback(() => {
    clearPlaybackInterval();
    
    const interval = 1000 / playback.speed;
    intervalRef.current = window.setInterval(() => {
      const next = selectedIndex + 1;
      if (next >= filteredEvents.length) {
        setPlayback({ isPlaying: false });
        addToast({
          type: 'info',
          message: 'Playback reached the end of events',
          duration: 2000,
        });
      } else {
        setPlayback({ currentIndex: next });
      }
    }, interval);
  }, [playback.speed, selectedIndex, filteredEvents.length, setPlayback, addToast, clearPlaybackInterval]);

  const stopPlayback = useCallback(() => {
    clearPlaybackInterval();
    setPlayback({ isPlaying: false });
  }, [clearPlaybackInterval, setPlayback]);

  const play = useCallback(() => {
    if (selectedIndex >= filteredEvents.length - 1) {
      setPlayback({ currentIndex: 0 });
    }
    setPlayback({ isPlaying: true });
  }, [setPlayback, selectedIndex, filteredEvents.length]);

  const pause = useCallback(() => {
    stopPlayback();
  }, [stopPlayback]);

  const togglePlayback = useCallback(() => {
    if (playback.isPlaying) {
      pause();
    } else {
      play();
    }
  }, [playback.isPlaying, play, pause]);

  const setSpeed = useCallback((speed: number) => {
    setPlayback({ speed: Math.max(0.25, Math.min(10, speed)) as PlaybackSpeed });
  }, [setPlayback]);

  useEffect(() => {
    if (playback.isPlaying) {
      startPlayback();
    } else {
      clearPlaybackInterval();
    }

    return clearPlaybackInterval;
  }, [playback.isPlaying, playback.speed, startPlayback, clearPlaybackInterval]);

  useEffect(() => {
    return () => {
      clearPlaybackInterval();
    };
  }, [clearPlaybackInterval]);

  return {
    isPlaying: playback.isPlaying,
    speed: playback.speed,
    play,
    pause,
    togglePlayback,
    setSpeed,
  };
}
