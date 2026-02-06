import React, { Component } from 'react';
import apiClient from '../utils/axiosConfig';
import VideoProgressTracker from './VideoProgressTracker';
import './Dashboard.css';
import './VideoProgress.css';

class VideosList extends Component {
  state = {
    videos: [],
    loading: false,
    selectedItem: null,
    selectedType: 'video',
    activeTab: 'videos',
    filters: {
      subject: '',
      search: ''
    },
    likedVideos: new Set(),
    // Nuevos estados para seguimiento de progreso
    videoProgress: new Map(),
    currentVideoTime: 0,
    videoDuration: 0,
    videoElement: null
  };

  componentDidMount() {
    this.loadContent();
  }

  loadContent = async () => {
    try {
      this.setState({ loading: true });
      
      // Obtener el perfil del usuario para saber su ID
      const profileResponse = await apiClient.get('/auth/profile');
      const currentUserId = profileResponse.data.data._id;
      
      // Cargar videos
      const videosResponse = await apiClient.get('/videos').catch(err => {
        console.warn('Error loading videos:', err);
        return { data: { data: [] } };
      });
      
      // Filtrar videos dirigidos al estudiante actual o públicos
      const filteredVideos = (videosResponse.data.data || []).filter(video => {
        return !video.targetStudentId || // Videos sin destinatario específico
               video.targetStudentId === currentUserId || // Videos dirigidos a este estudiante
               video.visibility === 'public'; // Videos públicos
      });
      
      this.setState({
        videos: filteredVideos,
        loading: false
      });
    } catch (error) {
      console.error('Error loading content:', error);
      this.setState({ 
        videos: [],
        loading: false 
      });
    }
  };

  handleItemSelect = async (item, type) => {
    try {
      // Incrementar vistas cuando se selecciona un video
      const response = await apiClient.get(`/videos/${item._id}`);
      // Actualizar el item con la información de progreso si está disponible
      if (response.data.data.progress) {
        const progressMap = new Map(this.state.videoProgress);
        progressMap.set(item._id, response.data.data.progress);
        this.setState({ videoProgress: progressMap });
      }
      this.setState({ 
        selectedItem: item, 
        selectedType: type 
      });
    } catch (error) {
      console.error('Error selecting item:', error);
      this.setState({ 
        selectedItem: item, 
        selectedType: type 
      });
    }
  };

  handleLike = async (videoId) => {
    try {
      await apiClient.post(`/videos/${videoId}/like`);
      const { likedVideos } = this.state;
      const newLikedVideos = new Set(likedVideos);

      if (newLikedVideos.has(videoId)) {
        newLikedVideos.delete(videoId);
      } else {
        newLikedVideos.add(videoId);
      }

      this.setState({ likedVideos: newLikedVideos });
      // Recargar videos para actualizar los contadores
      this.loadContent();
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  handleFilterChange = (e) => {
    const { name, value } = e.target;
    this.setState(prevState => ({
      filters: {
        ...prevState.filters,
        [name]: value
      }
    }));
  };

  getFilteredContent = () => {
    const { videos, filters } = this.state;
    
    const filteredVideos = videos.filter(video => {
      const matchesSubject = !filters.subject || video.subject.toLowerCase().includes(filters.subject.toLowerCase());
      const matchesSearch = !filters.search ||
        video.title.toLowerCase().includes(filters.search.toLowerCase()) ||
        video.description?.toLowerCase().includes(filters.search.toLowerCase()) ||
        video.topic?.toLowerCase().includes(filters.search.toLowerCase());
      return matchesSubject && matchesSearch;
    }).map(video => ({ ...video, contentType: 'video' }));
    
    // Ordenar por fecha de creación (más recientes primero)
    return filteredVideos.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  };

  getUniqueSubjects = () => {
    const { videos } = this.state;
    const videoSubjects = videos.map(video => video.subject);
    const subjects = [...new Set(videoSubjects)];
    return subjects.sort();
  };

  formatDuration = (minutes) => {
    if (!minutes) return '';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

render() {
    const { loading, selectedItem, selectedType, filters, activeTab } = this.state;
    const filteredContent = this.getFilteredContent();
    const uniqueSubjects = this.getUniqueSubjects();

    return (
      <div className="videos-list-page">
        <div className="videos-header">
          <h2>🎥 Videos de Clases</h2>
          <p>Accede a videos educativos subidos por tus tutores</p>
        </div>

        {/* Filtros */}
        <div className="videos-filters">
          <div className="filter-group">
            <input
              type="text"
              name="search"
              value={filters.search}
              onChange={this.handleFilterChange}
              placeholder="Buscar contenido..."
              className="search-input"
              style={{position: 'relative', top: '70px', left: '500px'}}
            />
          </div>
          <div className="filter-group">
            <select
              name="subject"
              value={filters.subject}
              onChange={this.handleFilterChange}
              className="subject-select"
              style={{position: 'relative', top: '70px', left: '500px'}}
            >
              <option value="">Todas las materias</option>
              {uniqueSubjects.map(subject => (
                <option key={subject} value={subject}>{subject}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="videos-stats" style={{position: 'relative', height: '100px', top: '70px', left: '800px'}}>
          <div className="stat-item" style={{position: 'relative', width: '250px', height: '90px', left: '110px', top: '-10px'}}>
            <span className="stat-number">{filteredContent.length}</span>
            <span className="stat-label">Videos disponibles</span>
          </div>
          <div className="stat-item" style={{position: 'relative', width: '250px', height: '90px', left: '110px', top: '10px'}}>
            <span className="stat-number">{uniqueSubjects.length}</span>
            <span className="stat-label">Materias</span>
          </div>
        </div>

        <div className="videos-content">
          {/* Lista de contenido */}
          <div className="videos-sidebar">
            {loading ? (
              <div className="loading">
                <div className="loading-spinner"></div>
                <p>Cargando contenido...</p>
              </div>
            ) : filteredContent.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🎥</div>
                <h3>No se encontraron videos</h3>
                {this.state.videos.length === 0 ? (
                  <p>Los tutores aún no han subido videos.</p>
                ) : (
                  <p>Intenta con otros términos de búsqueda o filtros diferentes.</p>
                )}
              </div>
            ) : (
              <div className="videos-list">
                {filteredContent.map(item => (
                  <div
                    key={`${item.contentType}-${item._id}`}
                    className={`video-item ${selectedItem?._id === item._id && selectedType === item.contentType ? 'active' : ''}`}
                    onClick={() => this.handleItemSelect(item, item.contentType)}
                  >
                    <div className="video-item-thumbnail">
                      {item.thumbnailUrl ? (
                        <img src={item.thumbnailUrl} alt={item.title} />
                      ) : (
                        <div className="thumbnail-placeholder">
                          <span>🎥</span>
                        </div>
                      )}
                      {item.duration && (
                        <div className="video-duration-small">
                          {this.formatDuration(item.duration)}
                        </div>
                      )}
                    </div>

                    <div className="video-item-info">
                      <h4>{item.title}</h4>
                      <p className="video-subject">{item.subject}</p>
                      {item.topic && <p className="video-topic">{item.topic}</p>}
                      <div className="video-stats-small">
                        <span>👁️ {item.views || 0}</span>
                        <span>❤️ {item.likes || 0}</span>
                        {/* Mostrar progreso del video si está disponible */}
                        {this.state.videoProgress.has(item._id) && (
                          <span className="progress-indicator">
                            📊 {this.state.videoProgress.get(item._id).progressPercentage}%
                          </span>
                        )}
                        {this.state.videoProgress.has(item._id) && 
                         this.state.videoProgress.get(item._id).isCompleted && (
                          <span className="completed-indicator">✅</span>
                        )}
                      </div>
                      <div className="video-uploader-small">
                        <span>👨‍🏫 {item.uploadedBy?.personalInfo?.firstName || item.createdBy?.personalInfo?.firstName} {item.uploadedBy?.personalInfo?.lastName || item.createdBy?.personalInfo?.lastName}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Visor de contenido */}
          <div className="video-player-section">
            {selectedItem ? (
              <div className="video-player">
                <div className="video-player-header">
                  <h3>{selectedItem.title}</h3>
                  <div className="video-actions">
                    <button
                      className={`btn-like ${this.state.likedVideos.has(selectedItem._id) ? 'liked' : ''}`}
                      onClick={() => this.handleLike(selectedItem._id)}
                    >
                      ❤️ {selectedItem.likes || 0}
                    </button>
                    <button className="btn-share">
                      📤 Compartir
                    </button>
                  </div>
                </div>

                <div className="video-player-content">
                  <div className="video-iframe-container">
                    {/* Componente de seguimiento de progreso */}
                    <VideoProgressTracker
                      ref={(ref) => { this.videoProgressTracker = ref; }}
                      videoId={selectedItem._id}
                      currentTime={this.state.currentVideoTime}
                      totalDuration={this.state.videoDuration}
                      onProgressUpdate={this.handleProgressUpdate}
                      onVideoCompleted={this.handleVideoCompleted}
                      showProgress={true}
                      showCompletionBadge={true}
                    />
                    
                    {selectedItem.videoUrl.includes('/uploads/videos/') ? (
                      <video
                        ref={this.handleVideoRef}
                        controls
                        src={selectedItem.videoUrl}
                        poster={selectedItem.thumbnailUrl}
                        className="video-element"
                        preload="metadata"
                      >
                        Tu navegador no soporta la reproducción de video.
                      </video>
                    ) :
                    selectedItem.videoUrl.includes('youtube.com') ||
                    selectedItem.videoUrl.includes('youtu.be') ? (
                      <iframe
                        src={`https://www.youtube.com/embed/${this.getYouTubeVideoId(selectedItem.videoUrl)}`}
                        title={selectedItem.title}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      ></iframe>
                    ) :
                    selectedItem.videoUrl.includes('vimeo.com') ? (
                      <iframe
                        src={`https://player.vimeo.com/video/${this.getVimeoVideoId(selectedItem.videoUrl)}`}
                        title={selectedItem.title}
                        frameBorder="0"
                        allow="autoplay; fullscreen; picture-in-picture"
                        allowFullScreen
                      ></iframe>
                    ) : (
                      <video
                        ref={this.handleVideoRef}
                        controls
                        src={selectedItem.videoUrl}
                        poster={selectedItem.thumbnailUrl}
                        className="video-element"
                      >
                        Tu navegador no soporta la reproducción de video.
                      </video>
                    )}
                  </div>

                  <div className="video-details">
                    <div className="video-meta">
                      <span className="subject-badge">{selectedItem.subject}</span>
                      {selectedItem.topic && (
                        <span className="topic-badge">{selectedItem.topic}</span>
                      )}
                      {selectedItem.grade && (
                        <span className="grade-badge">{selectedItem.grade}</span>
                      )}
                      {selectedItem.duration && (
                        <span className="duration-badge">
                          ⏱️ {this.formatDuration(selectedItem.duration)}
                        </span>
                      )}
                      <span className="views-badge">
                        👁️ {selectedItem.views || 0} visualizaciones
                      </span>
                    </div>

                    {selectedItem.description && (
                      <div className="video-description">
                        <h4>📝 Descripción</h4>
                        <p>{selectedItem.description}</p>
                      </div>
                    )}

                    <div className="video-uploader">
                      <h4>👨‍🏫 Instructor</h4>
                      <div className="uploader-info">
                        <div className="uploader-avatar">
                          <span>
                            {(selectedItem.uploadedBy?.personalInfo?.firstName || selectedItem.createdBy?.personalInfo?.firstName)?.[0]}
                            {(selectedItem.uploadedBy?.personalInfo?.lastName || selectedItem.createdBy?.personalInfo?.lastName)?.[0]}
                          </span>
                        </div>
                        <div className="uploader-details">
                          <p className="uploader-name">
                            {selectedItem.uploadedBy?.personalInfo?.firstName || selectedItem.createdBy?.personalInfo?.firstName} {selectedItem.uploadedBy?.personalInfo?.lastName || selectedItem.createdBy?.personalInfo?.lastName}
                          </p>
                          <p className="uploader-role">
                            👨‍🏫 Tutor
                          </p>
                        </div>
                      </div>
                    </div>

                    {selectedItem.tags && selectedItem.tags.length > 0 && (
                      <div className="video-tags">
                        <h4>🏷️ Etiquetas</h4>
                        <div className="tags-list">
                          {selectedItem.tags.map((tag, index) => (
                            <span key={index} className="tag">{tag}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="video-stats-detailed">
                      <div className="stat-item">
                        <span className="stat-label">Subido el:</span>
                        <span className="stat-value">
                          {selectedItem.createdAt ? new Date(selectedItem.createdAt).toLocaleDateString('es-ES') : 'Fecha no disponible'}
                        </span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">Última actualización:</span>
                        <span className="stat-value">
                          {selectedItem.updatedAt ? new Date(selectedItem.updatedAt).toLocaleDateString('es-ES') : 'No actualizado'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="video-placeholder">
                <div className="placeholder-content">
                  <span className="placeholder-icon">🎥</span>
                  <h3>Selecciona un video</h3>
                  <p>Haz clic en un video de la lista para comenzar a verlo</p>
                  <div className="placeholder-tips">
                    <h4>💡 Consejos:</h4>
                    <ul>
                      <li>Usa los filtros para encontrar videos específicos</li>
                      <li>Los videos se organizan por materia y tema</li>
                      <li>Puedes dar "me gusta" a tus videos favoritos</li>
                      <li>Tu progreso se guarda automáticamente</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  getYouTubeVideoId = (url) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  getVimeoVideoId = (url) => {
    const regExp = /vimeo\.com\/(\d+)/;
    const match = url.match(regExp);
    return match ? match[1] : null;
  };

  // Métodos para seguimiento de progreso de videos
  handleVideoRef = (videoElement) => {
    if (videoElement && videoElement !== this.state.videoElement) {
      // Limpiar listeners anteriores si existen
      if (this.state.videoElement) {
        const oldVideo = this.state.videoElement;
        oldVideo.removeEventListener('loadedmetadata', this.handleVideoMetadata);
        oldVideo.removeEventListener('timeupdate', this.handleVideoTimeUpdate);
        oldVideo.removeEventListener('play', this.handleVideoPlay);
        oldVideo.removeEventListener('pause', this.handleVideoPause);
        oldVideo.removeEventListener('ended', this.handleVideoEnded);
      }

      this.setState({ videoElement });
      
      // Agregar event listeners para seguimiento de progreso
      videoElement.addEventListener('loadedmetadata', this.handleVideoMetadata);
      videoElement.addEventListener('timeupdate', this.handleVideoTimeUpdate);
      videoElement.addEventListener('play', this.handleVideoPlay);
      videoElement.addEventListener('pause', this.handleVideoPause);
      videoElement.addEventListener('ended', this.handleVideoEnded);
      
      console.log('Video element configured for progress tracking');
    }
  };

  handleVideoMetadata = (event) => {
    const duration = event.target.duration;
    console.log('Video metadata loaded, duration:', duration);
    this.setState({
      videoDuration: duration
    });
  };

  handleVideoTimeUpdate = (event) => {
    this.setState({
      currentVideoTime: event.target.currentTime
    });
  };

  handleVideoPlay = () => {
    console.log('Video play event');
    if (this.videoProgressTracker) {
      this.videoProgressTracker.handleVideoPlay();
    }
  };

  handleVideoPause = () => {
    console.log('Video pause event');
    if (this.videoProgressTracker) {
      this.videoProgressTracker.handleVideoPause();
    }
  };

  handleVideoEnded = () => {
    console.log('Video ended event');
    if (this.videoProgressTracker) {
      this.videoProgressTracker.handleVideoEnded();
    }
  };

  handleProgressUpdate = (progress) => {
    console.log('Progress updated:', progress);
    const progressMap = new Map(this.state.videoProgress);
    progressMap.set(this.state.selectedItem._id, progress);
    this.setState({ videoProgress: progressMap });
  };

  handleVideoCompleted = (progress) => {
    console.log('Video completed!', progress);
    // Mostrar notificación de video completado
    alert(`¡Felicidades! Has completado el video "${this.state.selectedItem.title}"`);
  };

  componentWillUnmount() {
    // Limpiar event listeners
    if (this.state.videoElement) {
      const video = this.state.videoElement;
      video.removeEventListener('loadedmetadata', this.handleVideoMetadata);
      video.removeEventListener('timeupdate', this.handleVideoTimeUpdate);
      video.removeEventListener('play', this.handleVideoPlay);
      video.removeEventListener('pause', this.handleVideoPause);
      video.removeEventListener('ended', this.handleVideoEnded);
    }
  }
}

export default VideosList;
