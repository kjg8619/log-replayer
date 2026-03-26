import type { Session } from '../types';

const API_BASE = '/api';

export interface UploadProgress {
  loaded: number;
  total: number;
  percent: number;
}

export interface SessionsResponse {
  sessions: Session[];
  total: number;
}

export interface SessionStats {
  event_count: number;
  duration_ms: number;
  event_types: string[];
}

/**
 * Upload a log file and create a session using XMLHttpRequest for progress tracking
 */
export function uploadLogFile(
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<Session> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress({
          loaded: event.loaded,
          total: event.total,
          percent: Math.round((event.loaded / event.total) * 100),
        });
      }
    };
    
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          resolve(response.session);
        } catch {
          reject(new Error('Invalid response format'));
        }
      } else {
        reject(new Error(`Upload failed: ${xhr.statusText}`));
      }
    };
    
    xhr.onerror = () => {
      reject(new Error('Network error during upload'));
    };
    
    xhr.open('POST', `${API_BASE}/sessions/upload`);
    xhr.send(file);
  });
}

/**
 * Fetch all sessions
 */
export async function fetchSessions(): Promise<SessionsResponse> {
  const response = await fetch(`${API_BASE}/sessions`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch sessions: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Fetch a single session by ID
 */
export async function fetchSession(id: string): Promise<{ session: Session }> {
  const response = await fetch(`${API_BASE}/sessions/${id}`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch session: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Delete a session
 */
export async function deleteSession(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/sessions/${id}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    throw new Error(`Failed to delete session: ${response.statusText}`);
  }
}

/**
 * Search sessions by query
 */
export async function searchSessions(query: string): Promise<Session[]> {
  const response = await fetch(`${API_BASE}/sessions/search?q=${encodeURIComponent(query)}`);
  
  if (!response.ok) {
    throw new Error(`Failed to search sessions: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.sessions;
}

/**
 * Update session properties
 */
export async function updateSession(
  id: string,
  updates: Partial<Pick<Session, 'name'>>
): Promise<Session> {
  const response = await fetch(`${API_BASE}/sessions/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to update session: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.session;
}

/**
 * Export session data as a blob
 */
export async function exportSession(id: string): Promise<Blob> {
  const response = await fetch(`${API_BASE}/sessions/${id}/export`);
  
  if (!response.ok) {
    throw new Error(`Failed to export session: ${response.statusText}`);
  }
  
  return response.blob();
}

/**
 * Get session statistics
 */
export async function getSessionStats(id: string): Promise<SessionStats> {
  const response = await fetch(`${API_BASE}/sessions/${id}/stats`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch session stats: ${response.statusText}`);
  }
  
  return response.json();
}
