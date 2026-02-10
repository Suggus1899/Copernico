import React, { Component } from 'react';
import apiClient from '../utils/axiosConfig';
import VideoProgressTracker from './VideoProgressTracker';
import './Dashboard.css';
import './VideoProgress.css';
import './VideosList.css';

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

  // Objeto mutable con el tiempo actual del video (actualizado en cada timeupdate) para que el progreso use el valor real
  videoTimeRef = { current: { currentTime: 0, duration: 0 } };

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
      if (this.videoTimeRef.current) {
        this.videoTimeRef.current.currentTime = 0;
        this.videoTimeRef.current.duration = 0;
      }
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
      <div className="clases-page">
        <header className="clases-page__header">
          <h1 className="clases-page__title">Clases</h1>
          <p className="clases-page__subtitle">Videos educativos de tus tutores</p>
        </header>

        <div className="clases-page__toolbar">
          <div className="clases-page__filters">
            <input
              type="text"
              name="search"
              value={filters.search}
              onChange={this.handleFilterChange}
              placeholder="Buscar por título, tema..."
              className="clases-page__search"
              aria-label="Buscar videos"
            />
            <select
              name="subject"
              value={filters.subject}
              onChange={this.handleFilterChange}
              className="clases-page__select"
              aria-label="Filtrar por materia"
            >
              <option value="">Todas las materias</option>
              {uniqueSubjects.map(subject => (
                <option key={subject} value={subject}>{subject}</option>
              ))}
            </select>
          </div>
          <div className="clases-page__stats">
            <div className="clases-page__stat">
              <span className="clases-page__stat-num">{filteredContent.length}</span>
              <span className="clases-page__stat-label">Videos</span>
            </div>
            <div className="clases-page__stat">
              <span className="clases-page__stat-num">{uniqueSubjects.length}</span>
              <span className="clases-page__stat-label">Materias</span>
            </div>
          </div>
        </div>

        <div className="clases-page__main">
          <aside className="clases-page__sidebar">
            {loading ? (
              <div className="clases-page__loading">
                <div className="clases-page__spinner" />
                <p>Cargando clases...</p>
              </div>
            ) : filteredContent.length === 0 ? (
              <div className="clases-page__empty">
                <span className="clases-page__empty-icon" aria-hidden>🎥</span>
                <h3>No hay videos</h3>
                <p>
                  {this.state.videos.length === 0
                    ? 'Los tutores aún no han subido videos.'
                    : 'Prueba con otra búsqueda o quita filtros.'}
                </p>
              </div>
            ) : (
              <ul className="clases-page__list" role="list">
                {filteredContent.map(item => (
                  <li key={`${item.contentType}-${item._id}`}>
                    <button
                      type="button"
                      className={`clases-page__card ${selectedItem?._id === item._id && selectedType === item.contentType ? 'clases-page__card--active' : ''}`}
                      onClick={() => this.handleItemSelect(item, item.contentType)}
                    >
                      <div className="clases-page__card-thumb">
                        {item.thumbnailUrl ? (
                          <img src={item.thumbnailUrl} alt="" />
                        ) : (
                          <span className="clases-page__card-placeholder">🎥</span>
                        )}
                        {item.duration && (
                          <span className="clases-page__card-duration">
                            {this.formatDuration(item.duration)}
                          </span>
                        )}
                      </div>
                      <div className="clases-page__card-body">
                        <h4 className="clases-page__card-title">{item.title}</h4>
                        <span className="clases-page__card-subject">{item.subject}</span>
                        {item.topic && (
                          <span className="clases-page__card-topic">{item.topic}</span>
                        )}
                        <div className="clases-page__card-meta">
                          <span>👁️ {item.views || 0}</span>
                          <span>❤️ {item.likes || 0}</span>
                          {this.state.videoProgress.has(item._id) && (
                            <span className="clases-page__card-progress">
                              {this.state.videoProgress.get(item._id).progressPercentage}%
                            </span>
                          )}
                          {this.state.videoProgress.has(item._id) &&
                            this.state.videoProgress.get(item._id).isCompleted && (
                            <span className="clases-page__card-done">✅</span>
                          )}
                        </div>
                        <span className="clases-page__card-tutor">
                          {item.uploadedBy?.personalInfo?.firstName || item.createdBy?.personalInfo?.firstName}{' '}
                          {item.uploadedBy?.personalInfo?.lastName || item.createdBy?.personalInfo?.lastName}
                        </span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </aside>

          <section className="clases-page__player" aria-label="Reproductor">
            {selectedItem ? (
              <div className="clases-page__player-inner">
                <div className="clases-page__player-header">
                  <h2 className="clases-page__player-title">{selectedItem.title}</h2>
                  <div className="clases-page__player-actions">
                    <button
                      type="button"
                      className={`clases-page__btn-like ${this.state.likedVideos.has(selectedItem._id) ? 'clases-page__btn-like--active' : ''}`}
                      onClick={() => this.handleLike(selectedItem._id)}
                      aria-label="Me gusta"
                    >
                      ❤️ {selectedItem.likes || 0}
                    </button>
                  </div>
                </div>

                <div className="clases-page__player-content">
                  <div className="clases-page__video-wrap">
                    <VideoProgressTracker
                      ref={(ref) => { this.videoProgressTracker = ref; }}
                      videoId={selectedItem._id}
                      currentTime={this.state.currentVideoTime}
                      totalDuration={this.state.videoDuration}
                      getVideoTime={() => (this.videoTimeRef.current ? {
                        currentTime: this.videoTimeRef.current.currentTime,
                        totalDuration: this.videoTimeRef.current.duration || this.state.videoDuration
                      } : { currentTime: this.state.currentVideoTime, totalDuration: this.state.videoDuration })}
                      onProgressUpdate={this.handleProgressUpdate}
                      onVideoCompleted={this.handleVideoCompleted}
                      showProgress={true}
                      showCompletionBadge={true}
                    />
                    <div className="clases-page__video-box">
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
                  </div>

                  <div className="clases-page__details">
                    <div className="clases-page__badges">
                      <span className="clases-page__badge">{selectedItem.subject}</span>
                      {selectedItem.topic && (
                        <span className="clases-page__badge clases-page__badge--secondary">{selectedItem.topic}</span>
                      )}
                      {selectedItem.duration && (
                        <span className="clases-page__badge">⏱️ {this.formatDuration(selectedItem.duration)}</span>
                      )}
                      <span className="clases-page__badge clases-page__badge--muted">
                        👁️ {selectedItem.views || 0} vistas
                      </span>
                    </div>

                    {selectedItem.description && (
                      <div className="clases-page__description">
                        <h4>Descripción</h4>
                        <p>{selectedItem.description}</p>
                      </div>
                    )}

                    <div className="clases-page__instructor">
                      <div className="clases-page__instructor-avatar">
                        <span>
                          {(selectedItem.uploadedBy?.personalInfo?.firstName || selectedItem.createdBy?.personalInfo?.firstName)?.[0]}
                          {(selectedItem.uploadedBy?.personalInfo?.lastName || selectedItem.createdBy?.personalInfo?.lastName)?.[0]}
                        </span>
                      </div>
                      <div>
                        <p className="clases-page__instructor-name">
                          {selectedItem.uploadedBy?.personalInfo?.firstName || selectedItem.createdBy?.personalInfo?.firstName}{' '}
                          {selectedItem.uploadedBy?.personalInfo?.lastName || selectedItem.createdBy?.personalInfo?.lastName}
                        </p>
                        <p className="clases-page__instructor-role">Tutor</p>
                      </div>
                    </div>

                    <div className="clases-page__meta">
                      <span>Subido: {selectedItem.createdAt ? new Date(selectedItem.createdAt).toLocaleDateString('es-ES') : '—'}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="clases-page__placeholder">
                <span className="clases-page__placeholder-icon" aria-hidden>🎥</span>
                <h3>Elige una clase</h3>
                <p>Selecciona un video en la lista para reproducirlo</p>
                <ul className="clases-page__placeholder-tips">
                  <li>Usa la búsqueda o el filtro por materia</li>
                  <li>Tu progreso se guarda automáticamente</li>
                </ul>
              </div>
            )}
          </section>
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
    if (this.videoTimeRef.current) {
      this.videoTimeRef.current.duration = duration;
    }
    this.setState({
      videoDuration: duration
    });
  };

  handleVideoTimeUpdate = (event) => {
    const currentTime = event.target.currentTime;
    if (this.videoTimeRef.current) {
      this.videoTimeRef.current.currentTime = currentTime;
      this.videoTimeRef.current.duration = event.target.duration;
    }
    this.setState({
      currentVideoTime: currentTime
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
