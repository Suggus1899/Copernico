import type { ApiResponse } from '../types/api';
import type { VideoDashboard } from '../types/progress';
import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../utils/axiosConfig';
import { getApiErrorMessage } from '../utils/apiError';
import './Dashboard.css';
import './VideoProgress.css';
interface VideoProgressDashboardState { loading: boolean; dashboardData: VideoDashboard; error: string | null }

class VideoProgressDashboard extends Component<Record<string, never>, VideoProgressDashboardState> {
  state: VideoProgressDashboardState = {
    loading: true,
    dashboardData: {
      subjectStats: [],
      mostWatched: [],
      recentProgress: [],
      recentlyCompleted: []
    },
    error: null
  };

  componentDidMount() {
    console.log('VideoProgressDashboard mounted');
    this.loadDashboardData();
  }

  loadDashboardData = async () => {
    try {
      console.log('Loading dashboard data...');
      this.setState({ loading: true, error: null });
      
      const response = await apiClient.get<ApiResponse<VideoDashboard>>('/video-progress/my-dashboard');
      console.log('Dashboard data loaded:', response.data);
      
      this.setState({
        dashboardData: response.data.data,
        loading: false
      });
    } catch (error) {
      console.error('Error loading video progress dashboard:', error);
      this.setState({
        error: getApiErrorMessage(error, 'No se pudo cargar el dashboard de progreso de videos.'),
        loading: false
      });
    }
  };

  calculateOverallStats = () => {
    const { subjectStats } = this.state.dashboardData;
    
    if (!subjectStats || subjectStats.length === 0) {
      return {
        totalVideos: 0,
        completedVideos: 0,
        totalWatchTime: 0,
        averageCompletion: 0
      };
    }

    const totals = subjectStats.reduce((acc, stat) => {
      acc.totalVideos += stat.totalVideos || 0;
      acc.completedVideos += stat.completedVideos || 0;
      acc.totalWatchTime += stat.totalWatchTimeHours || 0;
      return acc;
    }, { totalVideos: 0, completedVideos: 0, totalWatchTime: 0 });

    // Calcular promedio ponderado de progreso
    const totalProgress = subjectStats.reduce((sum, stat) => {
      return sum + ((stat.averageProgress || 0) * (stat.totalVideos || 0));
    }, 0);
    
    const averageCompletion = totals.totalVideos > 0 
      ? Math.round((totalProgress / totals.totalVideos) * 10) / 10
      : 0;

    return {
      ...totals,
      averageCompletion
    };
  };

  formatDate = (dateString: string | null | undefined) => {
    return new Date(dateString === null ? 0 : dateString === undefined ? NaN : dateString).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  render() {
    const { loading, dashboardData, error } = this.state;
    const { subjectStats, mostWatched, recentProgress, recentlyCompleted } = dashboardData;
    const overallStats = this.calculateOverallStats();

    if (loading) {
      return (
        <div className="video-progress-dashboard">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Cargando progreso de videos...</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="video-progress-dashboard">
          <div className="error-container">
            <h3>Error al cargar datos</h3>
            <p>{error}</p>
            <button className="btn btn-primary" onClick={this.loadDashboardData}>
              Reintentar
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="video-progress-dashboard">
        <header className="progress-dashboard-header">
          <div>
            <h2>Mi progreso</h2>
            <p>Seguimiento de tu progreso en videos educativos</p>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={this.loadDashboardData}
            style={{ marginLeft: 'auto' }}
          >
            Actualizar
          </button>
        </header>

        {/* Estadísticas generales */}
        <section className="progress-stats-overview">
          <div className="stat-card">
            <div className="stat-content">
              <h3>{overallStats.totalVideos}</h3>
              <p>Videos vistos</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-content">
              <h3>{overallStats.completedVideos}</h3>
              <p>Videos completados</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-content">
              <h3>{overallStats.totalWatchTime.toFixed(1)}h</h3>
              <p>Tiempo total</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-content">
              <h3>{overallStats.averageCompletion}%</h3>
              <p>Progreso promedio</p>
            </div>
          </div>
        </section>

        {/* Mensaje inicial si no hay datos */}
        {subjectStats.length === 0 && (
          <section className="progress-empty-state">
            <h3>¡Comienza a ver videos!</h3>
            <p>Tu progreso aparecerá aquí cuando empieces a ver videos de clases.</p>
            <div className="getting-started-tips">
              <h4>Para empezar</h4>
              <ol>
                <li>Ve a la sección &quot;Clases&quot; en el menú</li>
                <li>Selecciona un video para reproducir</li>
                <li>Tu progreso se registrará automáticamente</li>
                <li>Regresa aquí para ver tus estadísticas</li>
              </ol>
            </div>
            <div className="progress-empty-actions">
              <Link
                className="btn btn-primary progress-empty-action-btn"
                to="/dashboard/videos"
              >
                Ver videos de clases
              </Link>
              <button
                type="button"
                className="btn btn-secondary progress-empty-action-btn"
                onClick={this.loadDashboardData}
              >
                Actualizar datos
              </button>
            </div>
          </section>
        )}

        {/* Contenido cuando hay datos */}
        {subjectStats.length > 0 && (
          <>
            <div className="progress-dashboard-content">
              {/* Videos más vistos + Actividad reciente en dos columnas */}
              <div className="progress-dashboard-row">
                <section className="progress-dashboard-section">
                  <h3>🔥 Videos Más Vistos</h3>
                  {mostWatched.length === 0 ? (
                    <div className="empty-state">
                      <p>Aún no has visto ningún video</p>
                    </div>
                  ) : (
                    <div className="video-list">
                      {mostWatched.map(progress => (
                        <div key={progress._id} className="video-item-small">
                          <div className="video-thumbnail-small">
                            {progress.videoId?.thumbnailUrl ? (
                              <img src={progress.videoId.thumbnailUrl} alt={progress.videoTitle} />
                            ) : (
                              <div className="thumbnail-placeholder-small">Video</div>
                            )}
                            <div className="progress-overlay">
                              {progress.progressPercentage}%
                            </div>
                          </div>
                          <div className="video-info-small">
                            <h5>{progress.videoTitle}</h5>
                            <p className="video-subject">{progress.videoSubject}</p>
                            <div className="video-stats-small">
                              <span>{this.formatTime(progress.watchTime)} vistos</span>
                              <span>{progress.videoId?.views || 0} vistas</span>
                              {progress.isCompleted && <span className="completed-badge">Completado</span>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section className="progress-dashboard-section">
                  <h3>🕒 Actividad Reciente</h3>
                  {recentProgress.length === 0 ? (
                    <div className="empty-state">
                      <p>No hay actividad reciente</p>
                    </div>
                  ) : (
                    <div className="recent-activity">
                      {recentProgress.slice(0, 5).map(progress => (
                        <div key={progress._id} className="activity-item">
                          <div className="activity-icon">
                            {progress.isCompleted ? 'Completado' : 'En progreso'}
                          </div>
                          <div className="activity-content">
                            <p className="activity-title">
                              {progress.isCompleted ? 'Completaste' : 'Viste'} &quot;{progress.videoTitle}&quot;
                            </p>
                            <p className="activity-details">
                              {progress.videoSubject} • {progress.progressPercentage}% •
                              {' '}{this.formatDate(progress.lastWatchedAt)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>

              {/* Videos completados recientemente */}
              {recentlyCompleted.length > 0 && (
                <section className="progress-dashboard-section">
                  <h3>🎉 Completados Recientemente</h3>
                  <div className="completed-videos">
                    {recentlyCompleted.map(progress => (
                      <div key={progress._id} className="completed-video-card">
                        <div className="completion-icon">🏆</div>
                        <div className="completed-info">
                          <h5>{progress.videoTitle}</h5>
                          <p>{progress.videoSubject}</p>
                          <span className="completion-date">
                            Completado el {this.formatDate(progress.completedAt)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>

            <div className="progress-dashboard-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={this.loadDashboardData}
              >
                Actualizar datos
              </button>
            </div>
          </>
        )}
      </div>
    );
  }
}

export default VideoProgressDashboard;
