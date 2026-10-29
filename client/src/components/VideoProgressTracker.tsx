import type { ApiResponse } from '../types/api';
import type { VideoProgress } from '../types/progress';
import React, { Component } from 'react';
import apiClient from '../utils/axiosConfig';
import {
  enqueueVideoProgress,
  syncPendingVideoProgress,
  VIDEO_PROGRESS_SYNC_EVENT,
  type VideoProgressSyncResult,
} from '../utils/videoProgressQueue';
import './VideoProgress.css';
interface VideoProgressTrackerProps {
  videoId: string; userId: string; getVideoTime: () => { currentTime: number; totalDuration: number };
  onProgressUpdate?: (progress: VideoProgress, videoId: string) => void;
  onVideoCompleted?: (progress: VideoProgress, videoId: string) => void;
  onSessionStart?: () => void; onSessionEnd?: () => void; onResume?: (position: number) => void;
  showProgress?: boolean; showCompletionBadge?: boolean;
}
interface VideoProgressTrackerState {
  progress: VideoProgress; sessionActive: boolean; sessionStartTime: number | null; syncMessage: string;
}

/**
 * Registra el progreso de un vídeo mientras se reproduce.
 * Props: videoId, getVideoTime() -> { currentTime, totalDuration }, onProgressUpdate(progress, videoId),
 * onVideoCompleted(progress, videoId), onSessionStart(), onSessionEnd().
 * Los eventos de reproducción los llama el padre: handleVideoPlay, handleVideoPause, handleVideoEnded.
 * El cliente solo informa del tiempo; el servidor decide si el vídeo está completado (umbral 90%).
 */
class VideoProgressTracker extends Component<VideoProgressTrackerProps, VideoProgressTrackerState> {
  state: VideoProgressTrackerState = {
    progress: {
      progressPercentage: 0,
      isCompleted: false,
      watchTime: 0,
      status: 'not_started'
    },
    sessionActive: false,
    sessionStartTime: null,
    syncMessage: '',
  };

  // true mientras el vídeo está reproduciéndose (fuente de verdad para no iniciar sesiones duplicadas)
  playing = false;
  mounted = false;
  generation = 0;
  updateInterval: ReturnType<typeof setInterval> | null = null;
  lastUpdateTime: number | null = null;
  pendingSeconds = 0;
  sendQueue: Promise<void> = Promise.resolve();
  startQueue: Promise<void> = Promise.resolve();
  resumeApplied = false;
  resumePosition: number | null = null;

  componentDidMount() {
    this.mounted = true;
    window.addEventListener(VIDEO_PROGRESS_SYNC_EVENT, this.handleProgressSync);
    if (this.props.videoId) {
      this.loadVideoProgress();
    }
  }

  componentWillUnmount() {
    this.playing = false;
    this.generation += 1;
    this.endSession();
    this.mounted = false;
    window.removeEventListener(VIDEO_PROGRESS_SYNC_EVENT, this.handleProgressSync);
  }

  handleProgressSync = (event: Event) => {
    const { userId, result } = (event as CustomEvent<{ userId: string; result: VideoProgressSyncResult }>).detail;
    if (userId !== this.props.userId) return;

    const latest = result.confirmed.filter((entry) => entry.videoId === this.props.videoId).at(-1);
    if (latest) {
      const wasCompleted = this.state.progress.isCompleted;
      this.setState({ progress: latest.progress });
      this.props.onProgressUpdate?.(latest.progress, this.props.videoId);
      if (latest.progress.isCompleted && !wasCompleted) {
        this.props.onVideoCompleted?.(latest.progress, this.props.videoId);
      }
    }

    const syncMessage = result.storageError
      ? 'No se pudo leer la cola local de progreso.'
      : result.expiredCount > 0
        ? `${result.expiredCount} intervalo(s) de reproducción no se pudo/pudieron recuperar porque venció el plazo de 24 horas.`
        : result.failedCount > 0
          ? 'Un envío de progreso no se pudo sincronizar y se descartó.'
          : result.hasPending
            ? 'Progreso guardado en este dispositivo; pendiente de sincronizar.'
            : '';
    this.setState({ syncMessage });
  };

  loadVideoProgress = async () => {
    try {
      const response = await apiClient.get<ApiResponse<VideoProgress>>(`/video-progress/videos/${this.props.videoId}/progress`);
      if (this.mounted) this.setState({ progress: response.data.data });
    } catch (error) {
      console.error('Error loading video progress:', error);
    }
  };

  startSession = async (generation: number) => {
    try {
      if (!this.playing || !this.mounted || generation !== this.generation) return;
      const response = await apiClient.post<ApiResponse<{ lastPosition: number }>>(`/video-progress/videos/${this.props.videoId}/start`);
      if (!this.resumeApplied && this.resumePosition === null) this.resumePosition = response.data.data.lastPosition;
      if (!this.playing || !this.mounted || generation !== this.generation) return;
      if (!this.resumeApplied) {
        this.resumeApplied = true;
        if (this.resumePosition !== null && this.resumePosition > 0) this.props.onResume?.(this.resumePosition);
      }
      if (!this.playing || !this.mounted || generation !== this.generation) return;
      this.lastUpdateTime = Date.now();
      const interval = setInterval(this.updateProgress, 5000);
      this.updateInterval = interval;
      this.setState({ sessionActive: true, sessionStartTime: this.lastUpdateTime });
      this.props.onSessionStart?.();
    } catch (error) {
      console.error('Error starting video session:', error);
    }
  };

  endSession = () => {
    if (this.updateInterval) clearInterval(this.updateInterval);
    this.updateInterval = null;
    if (this.lastUpdateTime !== null) this.updateProgress(true);
    this.lastUpdateTime = null;
    if (this.mounted) this.setState({ sessionActive: false, sessionStartTime: null });
    this.props.onSessionEnd?.();
  };

  updateProgress = (isFinalUpdate = false) => {
    if (this.lastUpdateTime === null) return;
    const now = Date.now();
    const elapsed = Math.max(0, Math.floor((now - this.lastUpdateTime) / 1000));
    this.lastUpdateTime += elapsed * 1000;
    this.pendingSeconds += elapsed;
    const { currentTime, totalDuration } = this.props.getVideoTime();
    if (!this.pendingSeconds && !isFinalUpdate) return;

    this.sendQueue = this.sendQueue.then(async () => {
      const watchedSeconds = this.pendingSeconds;
      this.pendingSeconds = 0;
      if (!watchedSeconds && !isFinalUpdate) return;
      try {
        enqueueVideoProgress(this.props.userId, this.props.videoId, {
          currentTime,
          watchedSeconds,
          totalDuration: totalDuration || undefined,
        });
        await syncPendingVideoProgress(this.props.userId);
      } catch (error) {
        this.pendingSeconds += watchedSeconds;
        if (this.mounted) this.setState({ syncMessage: 'No se pudo guardar el progreso en este dispositivo.' });
        console.error('Error updating video progress:', error);
      }
    });
  };

  handleVideoPlay = () => {
    if (this.playing) return;
    this.playing = true;
    const generation = ++this.generation;
    this.startQueue = this.startQueue.then(() => this.startSession(generation));
  };

  handleVideoPause = () => {
    this.playing = false;
    this.generation += 1;
    this.endSession();
  };

  handleVideoEnded = () => this.handleVideoPause();

  render() {
    const { progress } = this.state;
    const { showProgress = true, showCompletionBadge = true } = this.props;

    if (!showProgress) return null;

    return (
      <div className="video-progress-tracker">
        {this.state.syncMessage && <p role="status">{this.state.syncMessage}</p>}
        <div className="progress-info">
          <div className="progress-bar-container">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${progress.progressPercentage}%` }}
              />
            </div>
            <span className="progress-text">
              {progress.progressPercentage}% completado
            </span>
          </div>

          {progress.watchTime > 0 && (
            <div className="watch-time">
              <span>Tiempo visto: {this.formatTime(progress.watchTime)}</span>
            </div>
          )}
        </div>

        {showCompletionBadge && progress.isCompleted && (
          <div className="completion-badge">
            <span className="badge-text">Video Completado</span>
          </div>
        )}

        {this.state.sessionActive && (
          <div className="session-indicator">
            <span className="session-dot"></span>
            <span>Registrando progreso...</span>
          </div>
        )}
      </div>
    );
  }

  formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };
}

export default VideoProgressTracker;
