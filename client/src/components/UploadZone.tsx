import { useCallback, useState } from 'react';
import { uploadLogFile } from '../api/sessions';
import { fetchEvents } from '../api/events';
import { useTimelineStore } from '../stores/timelineStore';

const VALID_EXTENSIONS = ['.json', '.jsonl'];
const MAX_FILE_SIZE = 100 * 1024 * 1024;

interface UploadState {
  status: 'idle' | 'uploading' | 'processing' | 'complete' | 'error';
  progress: number;
  message: string;
}

export function UploadZone() {
  const [uploadState, setUploadState] = useState<UploadState>({
    status: 'idle',
    progress: 0,
    message: '',
  });
  const [isDragging, setIsDragging] = useState(false);
  
  const { setSession, setEvents, session } = useTimelineStore();
  
  const validateFile = (file: File): string | null => {
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!VALID_EXTENSIONS.includes(extension)) {
      return `Invalid file type. Please upload ${VALID_EXTENSIONS.join(' or ')} files.`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB.`;
    }
    return null;
  };
  
  const handleUpload = async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setUploadState({
        status: 'error',
        progress: 0,
        message: validationError,
      });
      return;
    }
    
    try {
      setUploadState({
        status: 'uploading',
        progress: 0,
        message: 'Uploading file...',
      });
      
      const uploadedSession = await uploadLogFile(file, (progress) => {
        setUploadState(prev => ({
          ...prev,
          progress: progress.percent,
        }));
      });
      
      setUploadState({
        status: 'processing',
        progress: 50,
        message: 'Processing events...',
      });
      
      const eventsResponse = await fetchEvents(uploadedSession.id, { limit: 1000 });
      
      setSession(uploadedSession);
      setEvents(eventsResponse.events);
      
      setUploadState({
        status: 'complete',
        progress: 100,
        message: `Loaded ${eventsResponse.events.length} events from ${file.name}`,
      });
      
    } catch (error) {
      setUploadState({
        status: 'error',
        progress: 0,
        message: error instanceof Error ? error.message : 'Upload failed',
      });
    }
  };
  
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleUpload(file);
    }
  }, []);
  
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);
  
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);
  
  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUpload(file);
    }
  }, []);
  
  const resetUpload = () => {
    setUploadState({ status: 'idle', progress: 0, message: '' });
  };
  
  if (session) {
    return null;
  }
  
  return (
    <div className="upload-zone-container">
      <div
        className={`upload-zone ${isDragging ? 'dragging' : ''} ${uploadState.status}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {uploadState.status === 'idle' && (
          <>
            <div className="upload-icon">📁</div>
            <h3>Upload Log File</h3>
            <p>Drag and drop your log file here, or click to browse</p>
            <p className="upload-hint">Supports {VALID_EXTENSIONS.join(', ')} files</p>
            <label className="upload-button">
              Select File
              <input
                type="file"
                accept={VALID_EXTENSIONS.join(',')}
                onChange={handleFileInput}
                style={{ display: 'none' }}
              />
            </label>
          </>
        )}
        
        {uploadState.status === 'uploading' && (
          <>
            <div className="upload-icon animate">⏳</div>
            <h3>Uploading...</h3>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${uploadState.progress}%` }}
              />
            </div>
            <p>{uploadState.message}</p>
          </>
        )}
        
        {uploadState.status === 'processing' && (
          <>
            <div className="upload-icon animate">⚙️</div>
            <h3>Processing</h3>
            <div className="progress-bar">
              <div 
                className="progress-fill processing" 
                style={{ width: `${uploadState.progress}%` }}
              />
            </div>
            <p>{uploadState.message}</p>
          </>
        )}
        
        {uploadState.status === 'complete' && (
          <>
            <div className="upload-icon success">✓</div>
            <h3>Upload Complete</h3>
            <p className="success-message">{uploadState.message}</p>
            <button className="upload-button secondary" onClick={resetUpload}>
              Upload Another File
            </button>
          </>
        )}
        
        {uploadState.status === 'error' && (
          <>
            <div className="upload-icon error">✕</div>
            <h3>Upload Failed</h3>
            <p className="error-message">{uploadState.message}</p>
            <button className="upload-button" onClick={resetUpload}>
              Try Again
            </button>
          </>
        )}
      </div>
    </div>
  );
}
