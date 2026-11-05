import axios from 'axios';
import type { ApiResponse } from '../types/api';
import type { VideoProgress } from '../types/progress';
import apiClient from './axiosConfig';

export const VIDEO_PROGRESS_SYNC_EVENT = 'copernico:video-progress-sync';
export const VIDEO_PROGRESS_CLEAR_EVENT = 'copernico:video-progress-clear';
export const MAX_PENDING_PROGRESS_AGE_MS = 24 * 60 * 60 * 1000;

export interface VideoProgressPayload {
  currentTime: number;
  watchedSeconds: number;
  totalDuration?: number;
}

export interface PendingVideoProgress {
  requestId: string;
  videoId: string;
  payload: VideoProgressPayload;
  createdAt: number;
}

export interface SyncedVideoProgress extends PendingVideoProgress {
  progress: VideoProgress;
}

export interface VideoProgressSyncResult {
  confirmed: SyncedVideoProgress[];
  expiredCount: number;
  failedCount: number;
  hasPending: boolean;
  storageError: boolean;
}

const storageKey = (userId: string) => `copernico:video-progress:${userId}`;
const activeSyncs = new Map<string, Promise<VideoProgressSyncResult>>();

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isPendingProgress = (value: unknown): value is PendingVideoProgress => {
  if (!isRecord(value) || !isRecord(value.payload)) return false;
  const payload = value.payload;
  return typeof value.requestId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.requestId) &&
    typeof value.videoId === 'string' && /^[0-9a-f]{24}$/i.test(value.videoId) &&
    Number.isFinite(value.createdAt) &&
    typeof payload.currentTime === 'number' && Number.isFinite(payload.currentTime) && payload.currentTime >= 0 && payload.currentTime <= 86400 &&
    typeof payload.watchedSeconds === 'number' && Number.isFinite(payload.watchedSeconds) && payload.watchedSeconds >= 0 && payload.watchedSeconds <= 3600 &&
    (payload.totalDuration === undefined || (typeof payload.totalDuration === 'number' && Number.isFinite(payload.totalDuration) && payload.totalDuration > 0 && payload.totalDuration <= 86400));
};

const readQueue = (userId: string): { entries: PendingVideoProgress[]; invalidCount: number } => {
  const raw = localStorage.getItem(storageKey(userId));
  if (!raw) return { entries: [], invalidCount: 0 };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return { entries: [], invalidCount: 1 };
    const entries = parsed.filter(isPendingProgress);
    return { entries, invalidCount: parsed.length - entries.length };
  } catch {
    return { entries: [], invalidCount: 1 };
  }
};

const saveQueue = (userId: string, entries: PendingVideoProgress[]) => {
  if (entries.length) localStorage.setItem(storageKey(userId), JSON.stringify(entries));
  else localStorage.removeItem(storageKey(userId));
};

export const enqueueVideoProgress = (
  userId: string,
  videoId: string,
  payload: VideoProgressPayload,
): PendingVideoProgress => {
  if (!/^[0-9a-f]{24}$/i.test(userId) || !/^[0-9a-f]{24}$/i.test(videoId)) {
    throw new Error('No se pudo asociar el progreso con la cuenta y el vídeo');
  }
  const { entries, invalidCount } = readQueue(userId);
  const operation: PendingVideoProgress = {
    requestId: crypto.randomUUID(),
    videoId,
    payload,
    createdAt: Date.now(),
  };
  if (!isPendingProgress(operation)) throw new Error('El progreso del reproductor no es válido');
  entries.push(operation);
  saveQueue(userId, entries);
  if (invalidCount && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(VIDEO_PROGRESS_SYNC_EVENT, {
      detail: { userId, result: { confirmed: [], expiredCount: 0, failedCount: invalidCount, hasPending: true, storageError: false } satisfies VideoProgressSyncResult },
    }));
  }
  return operation;
};

const flushQueue = async (userId: string): Promise<VideoProgressSyncResult> => {
  const result: VideoProgressSyncResult = {
    confirmed: [],
    expiredCount: 0,
    failedCount: 0,
    hasPending: false,
    storageError: false,
  };

  try {
    while (true) {
      const { entries, invalidCount } = readQueue(userId);
      result.failedCount += invalidCount;
      if (invalidCount) saveQueue(userId, entries);
      const operation = entries[0];
      if (!operation) break;

      if (Date.now() - operation.createdAt > MAX_PENDING_PROGRESS_AGE_MS) {
        const current = readQueue(userId).entries;
        saveQueue(userId, current.filter((entry) => entry.requestId !== operation.requestId));
        result.expiredCount += 1;
        continue;
      }

      try {
        const response = await apiClient.post<ApiResponse<VideoProgress>>(
          `/video-progress/videos/${operation.videoId}/progress`,
          { ...operation.payload, requestId: operation.requestId },
        );
        const current = readQueue(userId).entries;
        saveQueue(userId, current.filter((entry) => entry.requestId !== operation.requestId));
        result.confirmed.push({ ...operation, progress: response.data.data });
      } catch (error) {
        const status = axios.isAxiosError(error) ? error.response?.status : undefined;
        if (status && status >= 400 && status < 500 && ![401, 408, 429].includes(status)) {
          const current = readQueue(userId).entries;
          saveQueue(userId, current.filter((entry) => entry.requestId !== operation.requestId));
          result.failedCount += 1;
          continue;
        }
        break;
      }
    }
  } catch {
    result.storageError = true;
  }

  try {
    result.hasPending = readQueue(userId).entries.length > 0;
  } catch {
    result.hasPending = true;
    result.storageError = true;
  }
  return result;
};

export const syncPendingVideoProgress = (userId: string): Promise<VideoProgressSyncResult> => {
  const active = activeSyncs.get(userId);
  if (active) return active;

  const sync = flushQueue(userId).then((result) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(VIDEO_PROGRESS_SYNC_EVENT, { detail: { userId, result } }));
    }
    return result;
  }).finally(() => {
    activeSyncs.delete(userId);
  });
  activeSyncs.set(userId, sync);
  return sync;
};

export const clearPendingVideoProgress = (userId: string) => {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(VIDEO_PROGRESS_CLEAR_EVENT, { detail: { userId } }));
  localStorage.removeItem(storageKey(userId));
};
