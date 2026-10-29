import type { ApiResponse } from '../types/api';
import type { ClassVideo, VideoProgress } from '../types/progress';
import React, { Component } from 'react';
import apiClient from '../utils/axiosConfig';
import VideoProgressTracker from './VideoProgressTracker';
import YouTubePlayer from './YouTubePlayer';
import './Dashboard.css';
import './VideoProgress.css';
import './VideosList.css';
interface VideosListState {
  videos: ClassVideo[]; loading: boolean; selectedItem: ClassVideo | null; selectedType: string; activeTab: string;
  filters: { subject: string; search: string }; likedVideos: Set<string>; videoProgress: Map<string, VideoProgress>; completionMessage: string; error: string;
}

class VideosList extends Component<Record<string, never>, VideosListState> {
  state: VideosListState = {
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
    videoProgress: new Map(),
    completionMessage: '',
    error: ''
  };

  // Reproductor de YouTube del vídeo seleccionado; YouTubePlayer lo entrega cuando está listo
  youtubePlayer: YT.Player | null = null;
  videoProgressTracker: VideoProgressTracker | null = null;

  componentDidMount() {
    this.loadContent();
  }

  loadContent = async () => {
    try {
      this.setState({ loading: true, error: '' });

      // El backend ya filtra los vídeos visibles para el usuario actual
      const videosResponse = await apiClient.get<ApiResponse<ClassVideo[]>>('/videos');

      this.setState({
        videos: videosResponse.data.data || [],
        loading: false,
        error: ''
      });
    } catch (error) {
      console.error('Error loading content:', error);
      this.setState({
        videos: [],
        loading: false,
        error: 'No se pudieron cargar las clases. Inténtalo de nuevo.'
      });
    }
  };

  handleItemSelect = async (item: ClassVideo, type: string) => {
    try {
      // Incrementar vistas cuando se selecciona un video
      const response = await apiClient.get<ApiResponse<ClassVideo>>(`/videos/${item._id}`);
      // Actualizar el item con la información de progreso si está disponible
      if (response.data.data.progress) {
        const progressMap = new Map(this.state.videoProgress);
        progressMap.set(item._id, response.data.data.progress);
        this.setState({ videoProgress: progressMap });
      }
      this.setState({
        selectedItem: item,
        selectedType: type,
        completionMessage: ''
      });
    } catch (error) {
      console.error('Error selecting item:', error);
      this.setState({
        selectedItem: item,
        selectedType: type,
        completionMessage: ''
      });
    }
  };

  handleLike = async (videoId: string) => {
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

  handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
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
    return filteredVideos.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  };

  getUniqueSubjects = () => {
    const { videos } = this.state;
    const videoSubjects = videos.map(video => video.subject);
    const subjects = [...new Set(videoSubjects)];
    return subjects.sort();
  };

  formatDuration = (minutes: number | undefined) => {
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
        {this.state.completionMessage && <p className="clases-page__feedback" role="status">{this.state.completionMessage}</p>}
        {this.state.error && <p className="clases-page__error" role="alert">{this.state.error} <button type="button" onClick={() => void this.loadContent()}>Reintentar</button></p>}

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
            ) : this.state.error ? null : filteredContent.length === 0 ? (
              <div className="clases-page__empty">
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
                          <span className="clases-page__card-placeholder">Video</span>
                        )}
                        {(item.duration || 0) > 0 && (
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
                          <span>{item.views || 0} vistas</span>
                          <span>{item.likes || 0} me gusta</span>
                          {this.state.videoProgress.has(item._id) && (
                            <span className="clases-page__card-progress">
                              {this.state.videoProgress.get(item._id)?.progressPercentage}%
                            </span>
                          )}
                          {this.state.videoProgress.has(item._id) &&
                            this.state.videoProgress.get(item._id)?.isCompleted && (
                            <span className="clases-page__card-done">Completado</span>
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
                      aria-pressed={this.state.likedVideos.has(selectedItem._id)}
                    >
                      Me gusta · {selectedItem.likes || 0}
                    </button>
                  </div>
                </div>

                <div className="clases-page__player-content">
                  <div className="clases-page__video-wrap">
                    <VideoProgressTracker
                      key={selectedItem._id}
                      ref={(ref) => { this.videoProgressTracker = ref; }}
                      videoId={selectedItem._id}
                      getVideoTime={this.getVideoTime}
                      onProgressUpdate={this.handleProgressUpdate}
                      onVideoCompleted={this.handleVideoCompleted}
                    />
                    <div className="clases-page__video-box">
                      {selectedItem.youtubeId ? (
                        <YouTubePlayer
                          videoId={selectedItem.youtubeId}
                          title={selectedItem.title}
                          onPlayerChange={this.handlePlayerChange}
                          onPlay={this.handleVideoPlay}
                          onPause={this.handleVideoPause}
                          onEnded={this.handleVideoEnded}
                        />
                      ) : (
                        <p className="clases-page__video-missing">Este video no tiene un enlace de YouTube válido.</p>
                      )}
                    </div>
                  </div>

                  <div className="clases-page__details">
                    <div className="clases-page__badges">
                      <span className="clases-page__badge">{selectedItem.subject}</span>
                      {selectedItem.topic && (
                        <span className="clases-page__badge clases-page__badge--secondary">{selectedItem.topic}</span>
                      )}
                      {(selectedItem.duration || 0) > 0 && (
                        <span className="clases-page__badge">{this.formatDuration(selectedItem.duration)}</span>
                      )}
                      <span className="clases-page__badge clases-page__badge--muted">
                        {selectedItem.views || 0} vistas
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
                <h3>Elige una clase</h3>
                <p>Selecciona un video de la lista para comenzar a reproducirlo</p>
                <ul className="clases-page__placeholder-tips">
                  <li>Usa la búsqueda o el filtro por materia para encontrar contenido</li>
                  <li>Tu progreso se guarda automáticamente mientras ves los videos</li>
                </ul>
              </div>
            )}
          </section>
        </div>
      </div>
    );
  }

  // Tiempo del reproductor de YouTube para el seguimiento de progreso
  getVideoTime = () => {
    const player = this.youtubePlayer;
    if (!player) return { currentTime: 0, totalDuration: 0 };
    return {
      currentTime: player.getCurrentTime(),
      totalDuration: player.getDuration()
    };
  };

  handlePlayerChange = (player: YT.Player | null) => {
    this.youtubePlayer = player;
  };

  // Eventos de reproducción del reproductor de YouTube, reenviados al seguimiento de progreso
  handleVideoPlay = () => this.videoProgressTracker?.handleVideoPlay();

  handleVideoPause = () => this.videoProgressTracker?.handleVideoPause();

  handleVideoEnded = () => this.videoProgressTracker?.handleVideoEnded();

  handleProgressUpdate = (progress: VideoProgress, videoId: string) => {
    this.setState(prevState => ({
      videoProgress: new Map(prevState.videoProgress).set(videoId, progress)
    }));
  };

  handleVideoCompleted = (_progress: VideoProgress, videoId: string) => {
    const video = this.state.videos.find(item => item._id === videoId);
    this.setState({ completionMessage: `Has completado el video «${video?.title || ''}».` });
  };
}

export default VideosList;
