import React, { Component } from 'react';
import apiClient from '../utils/axiosConfig';
import './Dashboard.css';

class VideosList extends Component {
  state = {
    videos: [],
    materials: [],
    loading: false,
    selectedItem: null,
    selectedType: null, // 'video' or 'material'
    activeTab: 'all', // 'all', 'videos', 'materials'
    filters: {
      subject: '',
      search: ''
    },
    likedVideos: new Set()
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
      
      // Cargar videos y materiales en paralelo
      const [videosResponse, materialsResponse] = await Promise.all([
        apiClient.get('/videos').catch(err => {
          console.warn('Error loading videos:', err);
          return { data: { data: [] } };
        }),
        apiClient.get('/materials').catch(err => {
          console.warn('Error loading materials:', err);
          return { data: { data: [] } };
        })
      ]);
      
      // Filtrar videos dirigidos al estudiante actual o públicos
      const filteredVideos = (videosResponse.data.data || []).filter(video => {
        return !video.targetStudentId || // Videos sin destinatario específico
               video.targetStudentId === currentUserId || // Videos dirigidos a este estudiante
               video.visibility === 'public'; // Videos públicos
      });

      // Filtrar materiales dirigidos al estudiante actual o públicos
      const filteredMaterials = (materialsResponse.data.data || []).filter(material => {
        return !material.targetStudentId || // Materiales sin destinatario específico
               material.targetStudentId === currentUserId || // Materiales dirigidos a este estudiante
               material.visibility === 'public'; // Materiales públicos
      });
      
      this.setState({
        videos: filteredVideos,
        materials: filteredMaterials,
        loading: false
      });
    } catch (error) {
      console.error('Error loading content:', error);
      this.setState({ 
        videos: [],
        materials: [],
        loading: false 
      });
    }
  };

  handleItemSelect = async (item, type) => {
    try {
      if (type === 'video') {
        // Incrementar vistas cuando se selecciona un video
        await apiClient.get(`/videos/${item._id}`);
      } else if (type === 'material') {
        // Incrementar vistas cuando se selecciona un material
        await apiClient.get(`/materials/${item._id}`);
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

  handleDownload = async (materialId) => {
    try {
      await apiClient.patch(`/materials/${materialId}/download`);
      // Recargar materiales para actualizar los contadores
      this.loadContent();
    } catch (error) {
      console.error('Error incrementing download:', error);
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
    const { videos, materials, filters, activeTab } = this.state;
    
    let allContent = [];
    
    if (activeTab === 'all' || activeTab === 'videos') {
      const filteredVideos = videos.filter(video => {
        const matchesSubject = !filters.subject || video.subject.toLowerCase().includes(filters.subject.toLowerCase());
        const matchesSearch = !filters.search ||
          video.title.toLowerCase().includes(filters.search.toLowerCase()) ||
          video.description?.toLowerCase().includes(filters.search.toLowerCase()) ||
          video.topic?.toLowerCase().includes(filters.search.toLowerCase());
        return matchesSubject && matchesSearch;
      }).map(video => ({ ...video, contentType: 'video' }));
      
      if (activeTab === 'videos') return filteredVideos;
      allContent = [...allContent, ...filteredVideos];
    }
    
    if (activeTab === 'all' || activeTab === 'materials') {
      const filteredMaterials = materials.filter(material => {
        const matchesSubject = !filters.subject || material.subject.toLowerCase().includes(filters.subject.toLowerCase());
        const matchesSearch = !filters.search ||
          material.title.toLowerCase().includes(filters.search.toLowerCase()) ||
          material.description?.toLowerCase().includes(filters.search.toLowerCase()) ||
          material.topic?.toLowerCase().includes(filters.search.toLowerCase());
        return matchesSubject && matchesSearch;
      }).map(material => ({ ...material, contentType: 'material' }));
      
      if (activeTab === 'materials') return filteredMaterials;
      allContent = [...allContent, ...filteredMaterials];
    }
    
    // Ordenar por fecha de creación (más recientes primero)
    return allContent.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  };

  getUniqueSubjects = () => {
    const { videos, materials } = this.state;
    const videoSubjects = videos.map(video => video.subject);
    const materialSubjects = materials.map(material => material.subject);
    const subjects = [...new Set([...videoSubjects, ...materialSubjects])];
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

  getFileIcon = (type, fileUrl) => {
    if (type === 'video' || fileUrl?.includes('video')) return '🎥';
    if (type === 'document' || fileUrl?.includes('.pdf')) return '📄';
    if (type === 'presentation' || fileUrl?.includes('.ppt')) return '📊';
    if (fileUrl?.includes('.doc')) return '📝';
    if (fileUrl?.includes('.xls')) return '📈';
    if (fileUrl?.includes('image')) return '🖼️';
    return '📁';
  };

  getTypeLabel = (type) => {
    const labels = {
      video: 'Video',
      document: 'Documento',
      presentation: 'Presentación',
      exercise: 'Ejercicio',
      worksheet: 'Hoja de trabajo',
      quiz: 'Quiz',
      link: 'Enlace'
    };
    return labels[type] || type;
  };

render() {
    const { loading, selectedItem, selectedType, filters, activeTab } = this.state;
    const filteredContent = this.getFilteredContent();
    const uniqueSubjects = this.getUniqueSubjects();

    return (
      <div className="videos-list-page">
        <div className="videos-header">
          <h2>📚 Clases y Materiales</h2>
          <p>Accede a videos de clases y materiales educativos subidos por tus tutores y asesores</p>
        </div>

        {/* Tabs para filtrar contenido */}
        <div className="content-tabs" style={{position:'relative', top:'150px'}}>
          <button 
            className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => this.setState({ activeTab: 'all', selectedItem: null })}
          >
            📚 Todo
          </button>
          <button 
            className={`tab-btn ${activeTab === 'videos' ? 'active' : ''}`}
            onClick={() => this.setState({ activeTab: 'videos', selectedItem: null })}
          >
            🎥 Videos
          </button>
          <button 
            className={`tab-btn ${activeTab === 'materials' ? 'active' : ''}`}
            onClick={() => this.setState({ activeTab: 'materials', selectedItem: null })}
          >
            📄 Materiales
          </button>
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
            <span className="stat-label">Contenidos disponibles</span>
          </div>
          <div className="stat-item" style={{position: 'relative', width: '250px', height: '90px', left: '110px'}}>
            <span className="stat-number">{filteredContent.filter(item => item.contentType === 'video').length}</span>
            <span className="stat-label">Videos</span>
          </div>
          <div className="stat-item" style={{position: 'relative', width: '250px', height: '90px', left: '110px', top: '10px'}}>
            <span className="stat-number">{filteredContent.filter(item => item.contentType === 'material').length}</span>
            <span className="stat-label">Materiales</span>
          </div>
          <div className="stat-item" style={{position: 'relative', width: '250px', height: '90px', left: '110px', top: '20px'}}>
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
                <div className="empty-icon">📚</div>
                <h3>No se encontró contenido</h3>
                {this.state.videos.length === 0 && this.state.materials.length === 0 ? (
                  <p>Los tutores y asesores aún no han subido contenido.</p>
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
                      {item.contentType === 'video' && item.thumbnailUrl ? (
                        <img src={item.thumbnailUrl} alt={item.title} />
                      ) : (
                        <div className="thumbnail-placeholder">
                          <span>{this.getFileIcon(item.type || item.contentType, item.fileUrl || item.videoUrl)}</span>
                        </div>
                      )}
                      {item.contentType === 'video' && item.duration && (
                        <div className="video-duration-small">
                          {this.formatDuration(item.duration)}
                        </div>
                      )}
                      <div className="content-type-badge">
                        {item.contentType === 'video' ? '🎥' : this.getFileIcon(item.type, item.fileUrl)}
                      </div>
                    </div>

                    <div className="video-item-info">
                      <h4>{item.title}</h4>
                      <p className="video-subject">{item.subject}</p>
                      {item.topic && <p className="video-topic">{item.topic}</p>}
                      {item.contentType === 'material' && (
                        <p className="material-type">{this.getTypeLabel(item.type)}</p>
                      )}
                      <div className="video-stats-small">
                        <span>👁️ {item.views || 0}</span>
                        {item.contentType === 'video' && <span>❤️ {item.likes || 0}</span>}
                        {item.contentType === 'material' && <span>⬇️ {item.downloads || 0}</span>}
                        {item.contentType === 'material' && item.averageRating > 0 && (
                          <span>⭐ {item.averageRating.toFixed(1)}</span>
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
                    {selectedType === 'video' && (
                      <button
                        className={`btn-like ${this.state.likedVideos.has(selectedItem._id) ? 'liked' : ''}`}
                        onClick={() => this.handleLike(selectedItem._id)}
                      >
                        ❤️ {selectedItem.likes || 0}
                      </button>
                    )}
                    {selectedType === 'material' && selectedItem.fileUrl && (
                      <button
                        className="btn-download"
                        onClick={() => {
                          this.handleDownload(selectedItem._id);
                          window.open(selectedItem.fileUrl, '_blank');
                        }}
                      >
                        ⬇️ Descargar
                      </button>
                    )}
                    <button className="btn-share">
                      📤 Compartir
                    </button>
                  </div>
                </div>

                <div className="video-player-content">
                  {selectedType === 'video' ? (
                    <div className="video-iframe-container">
                      {selectedItem.videoUrl.includes('/uploads/videos/') ? (
                        <video
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
                          controls
                          src={selectedItem.videoUrl}
                          poster={selectedItem.thumbnailUrl}
                          className="video-element"
                        >
                          Tu navegador no soporta la reproducción de video.
                        </video>
                      )}
                    </div>
                  ) : (
                    <div className="material-preview">
                      {selectedItem.fileUrl ? (
                        selectedItem.fileUrl.includes('.pdf') ? (
                          <iframe
                            src={selectedItem.fileUrl}
                            title={selectedItem.title}
                            className="pdf-viewer"
                          >
                            <p>Tu navegador no soporta la visualización de PDF. 
                              <a href={selectedItem.fileUrl} target="_blank" rel="noopener noreferrer">
                                Haz clic aquí para descargar
                              </a>
                            </p>
                          </iframe>
                        ) : selectedItem.fileUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                          <img 
                            src={selectedItem.fileUrl} 
                            alt={selectedItem.title}
                            className="image-preview"
                          />
                        ) : (
                          <div className="file-preview">
                            <div className="file-icon-large">
                              {this.getFileIcon(selectedItem.type, selectedItem.fileUrl)}
                            </div>
                            <h4>{selectedItem.title}</h4>
                            <p>Tipo: {this.getTypeLabel(selectedItem.type)}</p>
                            <a 
                              href={selectedItem.fileUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="btn btn-primary"
                              onClick={() => this.handleDownload(selectedItem._id)}
                            >
                              ⬇️ Descargar archivo
                            </a>
                          </div>
                        )
                      ) : selectedItem.externalLink ? (
                        <div className="external-link-preview">
                          <div className="link-icon">🔗</div>
                          <h4>{selectedItem.title}</h4>
                          <p>Enlace externo</p>
                          <a 
                            href={selectedItem.externalLink} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="btn btn-primary"
                          >
                            🌐 Abrir enlace
                          </a>
                        </div>
                      ) : selectedItem.content ? (
                        <div className="content-preview">
                          <div dangerouslySetInnerHTML={{ __html: selectedItem.content }} />
                        </div>
                      ) : (
                        <div className="no-preview">
                          <p>Vista previa no disponible</p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="video-details">
                    <div className="video-meta">
                      <span className="subject-badge">{selectedItem.subject}</span>
                      {selectedItem.topic && (
                        <span className="topic-badge">{selectedItem.topic}</span>
                      )}
                      {selectedItem.grade && (
                        <span className="grade-badge">{selectedItem.grade}</span>
                      )}
                      {selectedType === 'video' && selectedItem.duration && (
                        <span className="duration-badge">
                          ⏱️ {this.formatDuration(selectedItem.duration)}
                        </span>
                      )}
                      {selectedType === 'material' && (
                        <span className="type-badge">
                          {this.getFileIcon(selectedItem.type, selectedItem.fileUrl)} {this.getTypeLabel(selectedItem.type)}
                        </span>
                      )}
                      <span className="views-badge">
                        👁️ {selectedItem.views || 0} visualizaciones
                      </span>
                      {selectedType === 'material' && selectedItem.downloads > 0 && (
                        <span className="downloads-badge">
                          ⬇️ {selectedItem.downloads} descargas
                        </span>
                      )}
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
                            {(selectedItem.uploadedBy?.role || selectedItem.createdBy?.role) === 'tutor' ? '👨‍🏫 Tutor' : '🎓 Asesor'}
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

                    {selectedType === 'material' && selectedItem.averageRating > 0 && (
                      <div className="material-rating">
                        <h4>⭐ Calificación</h4>
                        <div className="rating-info">
                          <span className="rating-value">{selectedItem.averageRating.toFixed(1)}/5</span>
                          <span className="rating-count">({selectedItem.ratingsCount} calificaciones)</span>
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
                  <span className="placeholder-icon">📚</span>
                  <h3>Selecciona contenido</h3>
                  <p>Haz clic en un video o material de la lista para comenzar a verlo</p>
                  <div className="placeholder-tips">
                    <h4>💡 Consejos:</h4>
                    <ul>
                      <li>Usa las pestañas para filtrar entre videos y materiales</li>
                      <li>Usa los filtros para encontrar contenido específico</li>
                      <li>El contenido se organiza por materia y tema</li>
                      <li>Puedes dar "me gusta" a videos y descargar materiales</li>
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
}

export default VideosList;
