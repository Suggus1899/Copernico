import React, { Component } from 'react';
import apiClient from '../utils/axiosConfig';
import './VideoProgress.css';

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

  componentDidMount() {
    if (this.props.videoId) {
      this.loadVideoProgress();
    }
  }

  componentDidUpdate(prevProps) {
    if (prevProps.videoId !== this.props.videoId && this.props.videoId) {
      this.loadVideoProgress();
    }
  }

  componentWillUnmount() {
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
      // Usar tiempo actual del video en el momento de la petición (getVideoTime si existe)
      const { currentTime: rawCurrent = 0, totalDuration: rawDuration } = this.props.getVideoTime
        ? this.props.getVideoTime()
        : { currentTime: this.props.currentTime, totalDuration: this.props.totalDuration };
      const currentTime = Number(rawCurrent) || 0;
      const totalDuration = Number(rawDuration) || this.props.totalDuration || 0;

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
        console.log('Progress updated:', newProgress);
        
        this.setState({
          progress: newProgress,
          lastUpdateTime: now
        });

        // Notificar al componente padre sobre el progreso
        if (this.props.onProgressUpdate) {
          this.props.onProgressUpdate(newProgress);
        }

        // Si se completó el video, notificar
        if (newProgress.isCompleted && !this.state.progress.isCompleted) {
          console.log('Video completed!');
          if (this.props.onVideoCompleted) {
            this.props.onVideoCompleted(newProgress);
          }
        }
      }
    } catch (error) {
      console.error('Error updating video progress:', error);
    }
  };

  handleVideoPlay = () => {
    if (!this.state.sessionActive) {
      this.startSession();
    }
  };

  handleVideoPause = () => {
    this.updateProgress();
  };

  handleVideoEnded = () => {
    this.updateProgress(true);
    this.endSession();
  };

  render() {
    const { progress } = this.state;
    const { showProgress = true, showCompletionBadge = true, currentTime = 0, totalDuration = 0 } = this.props;

    if (!showProgress) return null;

    // Mostrar el mayor entre el progreso guardado y la posición actual para que la barra avance al reproducir
    const positionPct = totalDuration > 0 ? Math.min(100, (currentTime / totalDuration) * 100) : 0;
    const displayPercentage = Math.round(Math.max(progress.progressPercentage, positionPct));

    return (
      <div className="video-progress-tracker">
        {showProgress && (
          <div className="progress-info">
            <div className="progress-bar-container">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${displayPercentage}%` }}
                />
              </div>
              <span className="progress-text">
                {displayPercentage}% completado
              </span>
            </div>
            
            {progress.watchTime > 0 && (
              <div className="watch-time">
                <span>⏱️ Tiempo visto: {this.formatTime(progress.watchTime)}</span>
              </div>
            )}
          </div>
        )}

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

        {/* Eventos del video - estos deben ser conectados por el componente padre */}
        <div style={{ display: 'none' }}>
          <button onClick={this.handleVideoPlay}>Play</button>
          <button onClick={this.handleVideoPause}>Pause</button>
          <button onClick={this.handleVideoEnded}>Ended</button>
        </div>
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