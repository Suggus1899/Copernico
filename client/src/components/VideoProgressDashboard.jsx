import React, { Component } from 'react';
import apiClient from '../utils/axiosConfig';
import './Dashboard.css';
import './VideoProgress.css';

class VideoProgressDashboard extends Component {
  state = {
    loading: true,
    dashboardData: {
      subjectStats: [],
      mostWatched: [],
      recentProgress: [],
      recentlyCompleted: []
    },
    selectedSubject: 'all',
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
      
      const response = await apiClient.get('/video-progress/my-dashboard');
      console.log('Dashboard data loaded:', response.data);
      
      this.setState({
        dashboardData: response.data.data,
        loading: false
      });
    } catch (error) {
      console.error('Error loading video progress dashboard:', error);
      this.setState({
        error: 'No se pudo cargar el dashboard de progreso de videos. ' + (error.response?.data?.error?.message || error.message),
        loading: false
      });
    }
  };

  handleSubjectFilter = (subject) => {
    this.setState({ selectedSubject: subject });
  };

  getFilteredStats = () => {
    const { subjectStats } = this.state.dashboardData;
    if (this.state.selectedSubject === 'all') {
      return subjectStats;
    }
    return subjectStats.filter(stat => stat.subject === this.state.selectedSubject);
  };

  calculateOverallStats = () => {
    const { subjectStats } = this.state.dashboardData;
    
    if (subjectStats.length === 0) {
      return {
        totalVideos: 0,
        completedVideos: 0,
        totalWatchTime: 0,
        averageCompletion: 0
      };
    }

    const totals = subjectStats.reduce((acc, stat) => {
      acc.totalVideos += stat.totalVideos;
      acc.completedVideos += stat.completedVideos;
      acc.totalWatchTime += stat.totalWatchTimeHours;
      return acc;
    }, { totalVideos: 0, completedVideos: 0, totalWatchTime: 0 });

    const averageCompletion = subjectStats.reduce((sum, stat) => sum + stat.averageProgress, 0) / subjectStats.length;

    return {
      ...totals,
      averageCompletion: Math.round(averageCompletion * 10) / 10
    };
  };

  formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  render() {
    const { loading, dashboardData, selectedSubject, error } = this.state;
    const { subjectStats, mostWatched, recentProgress, recentlyCompleted } = dashboardData;
    const filteredStats = this.getFilteredStats();
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
            <div className="error-icon">⚠️</div>
            <h3>Error al cargar datos</h3>
            <p>{error}</p>
            <button className="btn btn-primary" onClick={this.loadDashboardData}>
              🔄 Reintentar
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="video-progress-dashboard">
        <div className="dashboard-header">
          <h2>📊 Progreso de Videos</h2>
          <p>Seguimiento de tu progreso en videos educativos</p>
        </div>

        {/* Estadísticas generales */}
        <div className="stats-overview">
          <div className="stat-card">
            <div className="stat-icon">🎥</div>
            <div className="stat-content">
              <h3>{overallStats.totalVideos}</h3>
              <p>Videos vistos</p>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">✅</div>
            <div className="stat-content">
              <h3>{overallStats.completedVideos}</h3>
              <p>Videos completados</p>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">⏱️</div>
            <div className="stat-content">
              <h3>{overallStats.totalWatchTime.toFixed(1)}h</h3>
              <p>Tiempo total</p>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">📈</div>
            <div className="stat-content">
              <h3>{overallStats.averageCompletion}%</h3>
              <p>Progreso promedio</p>
            </div>
          </div>
        </div>

        {/* Mensaje inicial si no hay datos */}
        {subjectStats.length === 0 && (
          <div className="empty-state-initial">
            <div className="empty-icon">🎬</div>
            <h3>¡Comienza a ver videos!</h3>
            <p>Tu progreso aparecerá aquí cuando empieces a ver videos de clases.</p>
            <div className="getting-started-tips">
              <h4>💡 Para empezar:</h4>
              <ol>
                <li>Ve a la sección "Clases" en el menú</li>
                <li>Selecciona un video para reproducir</li>
                <li>Tu progreso se registrará automáticamente</li>
                <li>Regresa aquí para ver tus estadísticas</li>
              </ol>
            </div>
            <button 
              className="btn btn-primary"
              onClick={() => window.location.href = '/dashboard/videos'}
            >
              🎥 Ver Videos de Clases
            </button>
          </div>
        )}

        {/* Filtros por materia */}
        {subjectStats.length > 0 && (
          <div className="subject-filters">
            <button
              className={`filter-btn ${selectedSubject === 'all' ? 'active' : ''}`}
              onClick={() => this.handleSubjectFilter('all')}
            >
              📚 Todas las materias
            </button>
            {subjectStats.map(stat => (
              <button
                key={stat.subject}
                className={`filter-btn ${selectedSubject === stat.subject ? 'active' : ''}`}
                onClick={() => this.handleSubjectFilter(stat.subject)}
              >
                {stat.subject}
              </button>
            ))}
          </div>
        )}

        <div className="dashboard-content">
          {/* Progreso por materia */}
          <div className="dashboard-section">
            <h3>📊 Progreso por Materia</h3>
            {filteredStats.length === 0 ? (
              <div className="empty-state">
                <p>No hay datos de progreso disponibles</p>
              </div>
            ) : (
              <div className="subject-stats-grid">
                {filteredStats.map(stat => (
                  <div key={stat.subject} className="subject-stat-card">
                    <div className="subject-header">
                      <h4>{stat.subject}</h4>
                      <div className="completion-badge">
                        {stat.completionRate}% completado
                      </div>
                    </div>
                    
                    <div className="progress-bar-large">
                      <div 
                        className="progress-fill" 
                        style={{ width: `${stat.completionRate}%` }}
                      ></div>
                    </div>
                    
                    <div className="subject-details">
                      <div className="detail-item">
                        <span className="detail-label">Videos:</span>
                        <span className="detail-value">
                          {stat.completedVideos}/{stat.totalVideos}
                        </span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Tiempo:</span>
                        <span className="detail-value">
                          {stat.totalWatchTimeHours}h
                        </span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Progreso promedio:</span>
                        <span className="detail-value">
                          {stat.averageProgress}%
                        </span>
                      </div>
                      {stat.lastWatched && (
                        <div className="detail-item">
                          <span className="detail-label">Última vez:</span>
                          <span className="detail-value">
                            {this.formatDate(stat.lastWatched)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Videos más vistos */}
          <div className="dashboard-section">
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
                        <div className="thumbnail-placeholder-small">🎥</div>
                      )}
                      <div className="progress-overlay">
                        {progress.progressPercentage}%
                      </div>
                    </div>
                    
                    <div className="video-info-small">
                      <h5>{progress.videoTitle}</h5>
                      <p className="video-subject">{progress.videoSubject}</p>
                      <div className="video-stats-small">
                        <span>⏱️ {this.formatTime(progress.watchTime)}</span>
                        <span>👁️ {progress.videoId?.views || 0}</span>
                        {progress.isCompleted && <span className="completed-badge">✅</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actividad reciente */}
          <div className="dashboard-section">
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
                      {progress.isCompleted ? '✅' : '▶️'}
                    </div>
                    <div className="activity-content">
                      <p className="activity-title">
                        {progress.isCompleted ? 'Completaste' : 'Viste'} "{progress.videoTitle}"
                      </p>
                      <p className="activity-details">
                        {progress.videoSubject} • {progress.progressPercentage}% • 
                        {this.formatDate(progress.lastWatchedAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Videos completados recientemente */}
          {recentlyCompleted.length > 0 && (
            <div className="dashboard-section">
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
            </div>
          )}
        </div>

        {/* Botón para actualizar */}
        <div className="dashboard-actions">
          <button 
            className="btn btn-secondary"
            onClick={this.loadDashboardData}
          >
            🔄 Actualizar datos
          </button>
        </div>
      </div>
    );
  }
}

export default VideoProgressDashboard;