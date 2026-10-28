import React, { Component } from 'react';
import apiClient from '../utils/axiosConfig';
import './VideoProgress.css';

/**
 * Registra el progreso de un vídeo mientras se reproduce.
 * Props: videoId, getVideoTime() -> { currentTime, totalDuration }, onProgressUpdate(progress, videoId),
 * onVideoCompleted(progress, videoId), onSessionStart(), onSessionEnd().
 * Los eventos de reproducción los llama el padre: handleVideoPlay, handleVideoPause, handleVideoEnded.
 * El cliente solo informa del tiempo; el servidor decide si el vídeo está completado (umbral 90%).
 */
class VideoProgressTracker extends Component {
  state = {
    progress: {
      progressPercentage: 0,
      isCompleted: false,
      watchTime: 0,
      status: 'not_started'
    },
    sessionActive: false,
    sessionStartTime: null,
    lastUpdateTime: null,
    updateInterval: null
  };

  // true mientras el vídeo está reproduciéndose (fuente de verdad para no iniciar sesiones duplicadas)
  playing = false;

  componentDidMount() {
    if (this.props.videoId) {
      this.loadVideoProgress();
    }
  }

  componentWillUnmount() {
    this.playing = false;
    this.endSession();
  }

  loadVideoProgress = async () => {
    try {
      const response = await apiClient.get(`/video-progress/videos/${this.props.videoId}/progress`);
      this.setState({
        progress: response.data.data
      });
    } catch (error) {
      console.error('Error loading video progress:', error);
    }
  };

  startSession = async () => {
    try {
      await apiClient.post(`/video-progress/videos/${this.props.videoId}/start`);

      // Si se pausó mientras se abría la sesión, no empezar a contar tiempo
      if (!this.playing) return;

      this.setState({
        sessionActive: true,
        sessionStartTime: Date.now(),
        lastUpdateTime: Date.now()
      });

      // Actualizar progreso cada 5 segundos para que la barra se actualice al reproducir
      const interval = setInterval(this.updateProgress, 5000);
      this.setState({ updateInterval: interval });

      if (this.props.onSessionStart) {
        this.props.onSessionStart();
      }
    } catch (error) {
      console.error('Error starting video session:', error);
    }
  };

  endSession = () => {
    if (this.state.updateInterval) {
      clearInterval(this.state.updateInterval);
    }

    if (this.state.sessionActive) {
      this.updateProgress(true); // Actualización final
    }

    this.setState({
      sessionActive: false,
      sessionStartTime: null,
      lastUpdateTime: null,
      updateInterval: null
    });

    if (this.props.onSessionEnd) {
      this.props.onSessionEnd();
    }
  };

  updateProgress = async (isFinalUpdate = false) => {
    if (!this.state.sessionActive && !isFinalUpdate) return;

    try {
      // La posición se lee al momento de la petición; en la actualización final el reproductor aún existe
      const { currentTime, totalDuration } = this.props.getVideoTime();

      const now = Date.now();
      const watchedSeconds = this.state.lastUpdateTime
        ? Math.floor((now - this.state.lastUpdateTime) / 1000)
        : 0;

      // Actualizar siempre que sea final o cada intervalo para que la posición se guarde
      if (watchedSeconds > 0 || isFinalUpdate) {
        const response = await apiClient.post(`/video-progress/videos/${this.props.videoId}/progress`, {
          currentTime,
          watchedSeconds,
          totalDuration: totalDuration || undefined
        });

        const newProgress = response.data.data;
        const wasCompleted = this.state.progress.isCompleted;

        this.setState({
          progress: newProgress,
          lastUpdateTime: now
        });

        if (this.props.onProgressUpdate) {
          this.props.onProgressUpdate(newProgress, this.props.videoId);
        }

        if (newProgress.isCompleted && !wasCompleted && this.props.onVideoCompleted) {
          this.props.onVideoCompleted(newProgress, this.props.videoId);
        }
      }
    } catch (error) {
      console.error('Error updating video progress:', error);
    }
  };

  handleVideoPlay = () => {
    if (this.playing) return;
    this.playing = true;
    this.startSession();
  };

  // Pausar cierra la sesión para no contar el tiempo parado; al reanudar se abre una nueva
  handleVideoPause = () => {
    this.playing = false;
    this.endSession();
  };

  handleVideoEnded = () => {
    this.playing = false;
    this.endSession();
  };

  render() {
    const { progress } = this.state;
    const { showProgress = true, showCompletionBadge = true } = this.props;

    if (!showProgress) return null;

    return (
      <div className="video-progress-tracker">
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
              <span>⏱️ Tiempo visto: {this.formatTime(progress.watchTime)}</span>
            </div>
          )}
        </div>

        {showCompletionBadge && progress.isCompleted && (
          <div className="completion-badge">
            <span className="badge-icon">✅</span>
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

  formatTime = (seconds) => {
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
