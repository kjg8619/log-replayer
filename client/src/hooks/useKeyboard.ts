import { useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';

interface UseKeyboardOptions {
  onPlayPause?: () => void;
  onHome?: () => void;
  onEnd?: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
}

export function useKeyboard(options: UseKeyboardOptions = {}) {
  const { filteredEvents, setSelectedIndex, selectedIndex, playback, setPlayback } = useApp();

  const goToPrevious = useCallback(() => {
    setSelectedIndex(Math.max(0, selectedIndex - 1));
  }, [setSelectedIndex, selectedIndex]);

  const goToNext = useCallback(() => {
    setSelectedIndex(Math.min(filteredEvents.length - 1, selectedIndex + 1));
  }, [setSelectedIndex, selectedIndex, filteredEvents.length]);

  const goToFirst = useCallback(() => {
    setSelectedIndex(0);
  }, [setSelectedIndex]);

  const goToLast = useCallback(() => {
    setSelectedIndex(filteredEvents.length - 1);
  }, [setSelectedIndex, filteredEvents.length]);

  const togglePlayPause = useCallback(() => {
    if (selectedIndex >= filteredEvents.length - 1) {
      setSelectedIndex(0);
    }
    setPlayback({ isPlaying: !playback.isPlaying });
  }, [playback.isPlaying, setPlayback, selectedIndex, filteredEvents.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          goToPrevious();
          options.onPrevious?.();
          break;
        case 'ArrowRight':
          e.preventDefault();
          goToNext();
          options.onNext?.();
          break;
        case 'Home':
          e.preventDefault();
          goToFirst();
          options.onHome?.();
          break;
        case 'End':
          e.preventDefault();
          goToLast();
          options.onEnd?.();
          break;
        case ' ':
          e.preventDefault();
          togglePlayPause();
          options.onPlayPause?.();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToPrevious, goToNext, goToFirst, goToLast, togglePlayPause, options]);

  return {
    goToPrevious,
    goToNext,
    goToFirst,
    goToLast,
    togglePlayPause,
  };
}
