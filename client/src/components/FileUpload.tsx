import React, { useCallback, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { LogEvent } from '../types';
import { generateId } from '../utils/formatters';

interface ParsedSession {
  name: string;
  events: LogEvent[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toImportedEvent(item: unknown, index: number, sessionId: string): LogEvent {
  const record = isRecord(item) ? item : {};
  const payload = isRecord(record.payload)
    ? record.payload
    : isRecord(record.data)
      ? record.data
      : record;

  return {
    id: typeof record.id === 'string' ? record.id : generateId(),
    timestamp: typeof record.timestamp === 'string'
      ? record.timestamp
      : new Date(Date.now() + index * 1000).toISOString(),
    type: typeof record.type === 'string' ? record.type : 'unknown',
    payload,
    sessionId,
    sequence: index + 1,
  };
}

function parseSessionData(content: string): ParsedSession {
  try {
    const data = JSON.parse(content);
    
    if (Array.isArray(data)) {
      return {
        name: 'Imported Session',
        events: data.map((item, index) => toImportedEvent(item, index, 'imported')),
      };
    }

    if (isRecord(data) && data.events && Array.isArray(data.events)) {
      return {
        name: typeof data.name === 'string' ? data.name : 'Imported Session',
        events: data.events.map((item: unknown, index: number) =>
          toImportedEvent(item, index, typeof data.id === 'string' ? data.id : 'imported')
        ),
      };
    }

    throw new Error('Invalid session format');
  } catch (e) {
    if (e instanceof SyntaxError) {
      throw new Error('Malformed JSON: Please check the file format');
    }
    throw e;
  }
}

export function FileUpload() {
  const { setEvents, addToast } = useApp();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.endsWith('.json')) {
      addToast({ type: 'error', message: 'Please upload a JSON file' });
      return;
    }

    setIsLoading(true);
    
    try {
      const content = await file.text();
      const session = parseSessionData(content);
      
      setEvents(session.events);
      addToast({
        type: 'success',
        message: `Loaded ${session.events.length} events from ${session.name}`,
        duration: 3000,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to parse session file';
      addToast({ type: 'error', message });
    } finally {
      setIsLoading(false);
    }
  }, [setEvents, addToast]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  }, [handleFile]);

  const handleButtonClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  return (
    <div className="file-upload">
      <input
        ref={inputRef}
        type="file"
        accept=".json"
        onChange={handleInputChange}
        className="file-upload__input"
        id="file-upload"
      />
      
      <div
        className={`file-upload__dropzone ${isDragging ? 'file-upload__dropzone--dragging' : ''} ${isLoading ? 'file-upload__dropzone--loading' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleButtonClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleButtonClick();
          }
        }}
      >
        {isLoading ? (
          <>
            <div className="file-upload__spinner"></div>
            <span className="file-upload__text">Parsing...</span>
          </>
        ) : (
          <>
            <div className="file-upload__icon">📁</div>
            <span className="file-upload__text">
              Drop a session file here or click to browse
            </span>
            <span className="file-upload__hint">
              Supports .json format
            </span>
          </>
        )}
      </div>
    </div>
  );
}
