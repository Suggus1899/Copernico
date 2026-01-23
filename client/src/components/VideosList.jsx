import React, { Component } from 'react';
import apiClient from '../utils/axiosConfig';

class VideosList extends Component {
  state = {
    videos: [],
    loading: false,
    selectedVideo: null,
    filters: {
      subject: '',
      search: ''
    },
    likedVideos: new Set()
  };

  componentDidMount() {
    this.loadVideos();
  }

  loadVideos = async () => {
    try {
      this.setState({ loading: true });
      const response = await apiClient.get('/videos');
      this.setState({
        videos: response.data.data,
        loading: false
      });
    } catch (error) {
      console.error('Error loading videos:', error);
      this.setState({ loading: false });
    }
  };

  handleVideoSelect = async (video) => {
    try {
      // Incrementar vistas cuando se selecciona un video
      await apiClient.get(`/videos/${video._id}`);
      this.setState({ selectedVideo: video });
    } catch (error) {
      console.error('Error selecting video:', error);
      this.setState({ selectedVideo: video });
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
      this.loadVideos();
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

  getFilteredVideos = () => {
    const { videos, filters } = this.state;
    return videos.filter(video => {
      const matchesSubject = !filters.subject || video.subject.toLowerCase().includes(filters.subject.toLowerCase());
      const matchesSearch = !filters.search ||
        video.title.toLowerCase().includes(filters.search.toLowerCase()) ||
        video.description?.toLowerCase().includes(filters.search.toLowerCase()) ||
        video.topic?.toLowerCase().includes(filters.search.toLowerCase());
      return matchesSubject && matchesSearch;
    });
  };

  getUniqueSubjects = () => {
    const subjects = [...new Set(this.state.videos.map(video => video.subject))];
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
    const { loading, selectedVideo, filters } = this.state;
    const filteredVideos = this.getFilteredVideos();
    const uniqueSubjects = this.getUniqueSubjects();

    return (
      <div className="videos-list-page">
        <div className="videos-header">
          <h2>🎥 Videos de Clases</h2>
          <p>Accede a los videos de clases subidos por tus tutores</p>
        </div>

        {/* Filtros */}
        <div className="videos-filters">
          <div className="filter-group">
            <input
              type="text"
              name="search"
              value={filters.search}
              onChange={this.handleFilterChange}
              placeholder="Buscar videos..."
              className="search-input"
            />
          </div>
          <div className="filter-group">
            <select
              name="subject"
              value={filters.subject}
              onChange={this.handleFilterChange}
              className="subject-select"
            >
              <option value="">Todas las materias</option>
              {uniqueSubjects.map(subject => (
                <option key={subject} value={subject}>{subject}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="videos-content">
          {/* Lista de videos */}
          <div className="videos-sidebar">
            {loading ? (
              <div className="loading">Cargando videos...</div>
            ) : filteredVideos.length === 0 ? (
              <div className="empty-state">
                <p>🎬 No se encontraron videos.</p>
                {this.state.videos.length === 0 && (
                  <p>Los tutores aún no han subido videos de clases.</p>
                )}
              </div>
            ) : (
              <div className="videos-list">
                {filteredVideos.map(video => (
                  <div
                    key={video._id}
                    className={`video-item ${selectedVideo?._id === video._id ? 'active' : ''}`}
                    onClick={() => this.handleVideoSelect(video)}
                  >
                    <div className="video-item-thumbnail">
                      {video.thumbnailUrl ? (
                        <img src={video.thumbnailUrl} alt={video.title} />
                      ) : (
                        <div className="thumbnail-placeholder">
                          <span>🎥</span>
                        </div>
                      )}
                      {video.duration && (
                        <div className="video-duration-small">
                          {this.formatDuration(video.duration)}
                        </div>
                      )}
                    </div>

                    <div className="video-item-info">
                      <h4>{video.title}</h4>
                      <p className="video-subject">{video.subject}</p>
                      {video.topic && <p className="video-topic">{video.topic}</p>}
                      <div className="video-stats-small">
                        <span>👁️ {video.views}</span>
                        <span>❤️ {video.likes}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Reproductor de video */}
          <div className="video-player-section">
            {selectedVideo ? (
              <div className="video-player">
                <div className="video-player-header">
                  <h3>{selectedVideo.title}</h3>
                  <div className="video-actions">
                    <button
                      className="btn-like"
                      onClick={() => this.handleLike(selectedVideo._id)}
                    >
                      ❤️ {selectedVideo.likes}
                    </button>
                  </div>
                </div>

                <div className="video-player-content">
                  <div className="video-iframe-container">
                    {/* Para videos locales del servidor */}
                    {selectedVideo.videoUrl.includes('/uploads/videos/') ? (
                      <video
                        controls
                        src={selectedVideo.videoUrl}
                        poster={selectedVideo.thumbnailUrl}
                        className="video-element"
                        preload="metadata"
                      >
                        Tu navegador no soporta la reproducción de video.
                      </video>
                    ) :
                    /* Para videos de YouTube */
                    selectedVideo.videoUrl.includes('youtube.com') ||
                    selectedVideo.videoUrl.includes('youtu.be') ? (
                      <iframe
                        src={`https://www.youtube.com/embed/${this.getYouTubeVideoId(selectedVideo.videoUrl)}`}
                        title={selectedVideo.title}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      ></iframe>
                    ) :
                    /* Para videos de Vimeo */
                    selectedVideo.videoUrl.includes('vimeo.com') ? (
                      <iframe
                        src={`https://player.vimeo.com/video/${this.getVimeoVideoId(selectedVideo.videoUrl)}`}
                        title={selectedVideo.title}
                        frameBorder="0"
                        allow="autoplay; fullscreen; picture-in-picture"
                        allowFullScreen
                      ></iframe>
                    ) : (
                      /* Para otros URLs externos */
                      <video
                        controls
                        src={selectedVideo.videoUrl}
                        poster={selectedVideo.thumbnailUrl}
                        className="video-element"
                      >
                        Tu navegador no soporta la reproducción de video.
                      </video>
                    )}
                  </div>

                  <div className="video-details">
                    <div className="video-meta">
                      <span className="subject-badge">{selectedVideo.subject}</span>
                      {selectedVideo.topic && (
                        <span className="topic-badge">{selectedVideo.topic}</span>
                      )}
                      {selectedVideo.grade && (
                        <span className="grade-badge">{selectedVideo.grade}</span>
                      )}
                      {selectedVideo.duration && (
                        <span className="duration-badge">
                          ⏱️ {this.formatDuration(selectedVideo.duration)}
                        </span>
                      )}
                    </div>

                    {selectedVideo.description && (
                      <div className="video-description">
                        <h4>Descripción</h4>
                        <p>{selectedVideo.description}</p>
                      </div>
                    )}

                    <div className="video-uploader">
                      <h4>Subido por</h4>
                      <p>{selectedVideo.uploadedBy?.personalInfo?.firstName} {selectedVideo.uploadedBy?.personalInfo?.lastName}</p>
                      <p className="uploader-role">
                        {selectedVideo.uploadedBy?.role === 'tutor' ? 'Tutor' : 'Asesor'}
                      </p>
                    </div>

                    {selectedVideo.tags && selectedVideo.tags.length > 0 && (
                      <div className="video-tags">
                        <h4>Etiquetas</h4>
                        <div className="tags-list">
                          {selectedVideo.tags.map((tag, index) => (
                            <span key={index} className="tag">{tag}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="video-placeholder">
                <div className="placeholder-content">
                  <span className="placeholder-icon">🎥</span>
                  <h3>Selecciona un video</h3>
                  <p>Haz clic en un video de la lista para comenzar a verlo</p>
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
}

export default VideosList;
