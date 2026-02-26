import React, { Component } from 'react';
import apiClient from '../utils/axiosConfig';
import TutorSidebarMenu from './TutorSidebarMenu';
import './Dashboard.css';

class TutorVideos extends Component {
  state = {
    videos: [],
    students: [], // Lista de estudiantes del tutor
    loading: false,
    uploading: false,
    showForm: false,
    formData: {
      title: '',
      description: '',
      subject: '',
      topic: '',
      grade: '',
      duration: '',
      visibility: 'students',
      tags: '',
      videoUrl: '',
      targetStudentId: '' // Nuevo campo para el estudiante específico
    },
    selectedVideoFile: null,
    selectedThumbnailFile: null,
    editMode: false,
    editingId: null,
    uploadMethod: 'file' // 'file' o 'url'
  };

  componentDidMount() {
    this.loadVideos();
    this.loadStudents();
  }

  loadStudents = async () => {
    try {
      const response = await apiClient.get('/appointments/my-students');
      this.setState({
        students: response.data.data || []
      });
    } catch (error) {
      console.error('Error loading students:', error);
    }
  };

  loadVideos = async () => {
    try {
      this.setState({ loading: true });

      // Cargar los videos del tutor/asesor
      const response = await apiClient.get('/videos/my/videos');
      this.setState({
        videos: response.data.data,
        loading: false
      });
    } catch (error) {
      console.error('Error loading videos:', error);
      console.error('Error details:', error.response);
      this.setState({ loading: false });
    }
  };

  handleInputChange = (e) => {
    const { name, value } = e.target;
    this.setState(prevState => ({
      formData: {
        ...prevState.formData,
        [name]: value
      }
    }));
  };

  handleFileChange = (e) => {
    const { name, files } = e.target;
    if (files && files[0]) {
      if (name === 'videoFile') {
        this.setState({ selectedVideoFile: files[0] });
      } else if (name === 'thumbnailFile') {
        this.setState({ selectedThumbnailFile: files[0] });
      }
    }
  };

  handleSubmit = async (e) => {
    e.preventDefault();

    // Validar que se haya proporcionado un video (archivo o URL)
    if (!this.state.editMode) {
      if (this.state.uploadMethod === 'file' && !this.state.selectedVideoFile) {
        alert('Por favor selecciona un archivo de video');
        return;
      }
      if (this.state.uploadMethod === 'url' && !this.state.formData.videoUrl.trim()) {
        alert('Por favor proporciona una URL de video');
        return;
      }
    }

    try {
      this.setState({ uploading: true });

      console.log('Iniciando subida de video...');
      console.log('Método de subida:', this.state.uploadMethod);
      console.log('Archivo de video:', this.state.selectedVideoFile);
      console.log('URL de video:', this.state.formData.videoUrl);

      const formDataToSend = new FormData();

      // Agregar datos del formulario
      Object.keys(this.state.formData).forEach(key => {
        if (key === 'tags') {
          const tags = this.state.formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
          formDataToSend.append(key, JSON.stringify(tags));
          console.log('Tags procesadas:', tags);
        } else if (key === 'videoUrl' && this.state.uploadMethod === 'url') {
          // Solo agregar videoUrl si se está usando el método URL
          formDataToSend.append(key, this.state.formData[key]);
        } else if (key !== 'videoUrl') {
          // Agregar todos los otros campos excepto videoUrl cuando se usa archivo
          formDataToSend.append(key, this.state.formData[key]);
        }
      });

      // Agregar archivos solo si se está usando el método de archivo
      if (this.state.uploadMethod === 'file' || this.state.editMode) {
        if (this.state.selectedVideoFile) {
          formDataToSend.append('videoFile', this.state.selectedVideoFile);
          console.log('Agregando archivo de video:', this.state.selectedVideoFile.name);
        }
      }
      
      if (this.state.selectedThumbnailFile) {
        formDataToSend.append('thumbnailFile', this.state.selectedThumbnailFile);
        console.log('Agregando archivo de miniatura:', this.state.selectedThumbnailFile.name);
      }

      console.log('FormData preparado, enviando...');

      const config = {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      };

      let response;
      if (this.state.editMode) {
        console.log('Enviando PUT request...');
        response = await apiClient.put(`/videos/${this.state.editingId}`, formDataToSend, config);
      } else {
        console.log('Enviando POST request...');
        response = await apiClient.post('/videos', formDataToSend, config);
      }

      console.log('Respuesta del servidor:', response);

      this.setState({
        showForm: false,
        editMode: false,
        editingId: null,
        selectedVideoFile: null,
        selectedThumbnailFile: null,
        uploadMethod: 'file',
        formData: {
          title: '',
          description: '',
          subject: '',
          topic: '',
          grade: '',
          duration: '',
          visibility: 'students',
          tags: '',
          videoUrl: '',
          targetStudentId: ''
        }
      });

      console.log('Estado reseteado, cargando videos...');
      this.loadVideos();
      alert('Video subido exitosamente');
    } catch (error) {
      console.error('Error completo:', error);
      console.error('Error response:', error.response);
      console.error('Error message:', error.message);

      let errorMessage = 'Error al subir el video. ';
      if (error.response) {
        console.error('Error status:', error.response.status);
        console.error('Error data:', error.response.data);
        errorMessage += error.response.data?.message || error.response.data?.error || 'Error del servidor.';
      } else if (error.request) {
        errorMessage += 'No se pudo conectar con el servidor.';
      } else {
        errorMessage += error.message || 'Error desconocido.';
      }

      alert(errorMessage);
    } finally {
      this.setState({ uploading: false });
    }
  };

  handleEdit = (video) => {
    this.setState({
      showForm: true,
      editMode: true,
      editingId: video._id,
      formData: {
        title: video.title,
        description: video.description || '',
        subject: video.subject,
        topic: video.topic || '',
        grade: video.grade || '',
        duration: video.duration || '',
        visibility: video.visibility,
        tags: video.tags ? video.tags.join(', ') : '',
        targetStudentId: video.targetStudentId || ''
      }
    });
  };

  handleDelete = async (videoId) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este video?')) {
      return;
    }

    try {
      await apiClient.delete(`/videos/${videoId}`);
      this.loadVideos();
    } catch (error) {
      console.error('Error deleting video:', error);
    }
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
    const { videos, loading, uploading, showForm, formData, editMode } = this.state;

    return (
      <div className="dashboard-container">
        <TutorSidebarMenu />
        <div className="dashboard-content">
          <div className="tutor-videos">
            <header className="videos-header">
              <div>
                <h2>🎥 Videos de Clases</h2>
                <p className="videos-subtitle">
                  Gestiona los videos de tus clases y compártelos con tus estudiantes
                </p>
              </div>
              <button
                type="button"
                className="btn-primary"
                onClick={() => this.setState({ showForm: !showForm, editMode: false, editingId: null })}
              >
                {showForm ? '✕ Cancelar' : '+ Subir Video'}
              </button>
            </header>

            {showForm && (
              <div className="video-form-container">
                <form onSubmit={this.handleSubmit} className="video-form">
                  <h3>{editMode ? 'Editar Video' : 'Subir Nuevo Video'}</h3>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Título *</label>
                      <input
                        type="text"
                        name="title"
                        value={formData.title}
                        onChange={this.handleInputChange}
                        required
                        placeholder="Título del video"
                      />
                    </div>
                    <div className="form-group">
                      <label>Materia *</label>
                      <input
                        type="text"
                        name="subject"
                        value={formData.subject}
                        onChange={this.handleInputChange}
                        required
                        placeholder="Ej: Matemáticas, Física"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>👨‍🎓 Estudiante Destinatario *</label>
                      <select
                        name="targetStudentId"
                        value={formData.targetStudentId}
                        onChange={this.handleInputChange}
                        required
                      >
                        <option value="">Seleccionar estudiante</option>
                        {this.state.students.map(student => {
                          const studentName = `${student.personalInfo?.firstName || ''} ${student.personalInfo?.lastName || ''}`.trim() || student.email;
                          return (
                            <option key={student._id} value={student._id}>
                              {studentName} - {student.stats.subjects.join(', ')}
                            </option>
                          );
                        })}
                      </select>
                      <small style={{ color: '#666', fontSize: '0.8rem' }}>
                        Solo aparecen estudiantes con citas confirmadas contigo
                      </small>
                    </div>
                    <div className="form-group">
                      <label>Visibilidad</label>
                      <select
                        name="visibility"
                        value={formData.visibility}
                        onChange={this.handleInputChange}
                      >
                        <option value="private">Privado</option>
                        <option value="student">Solo el estudiante seleccionado</option>
                        <option value="students">Todos mis estudiantes</option>
                        <option value="public">Público</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Descripción</label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={this.handleInputChange}
                      placeholder="Descripción del video"
                      rows="3"
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Tema</label>
                      <input
                        type="text"
                        name="topic"
                        value={formData.topic}
                        onChange={this.handleInputChange}
                        placeholder="Tema específico"
                      />
                    </div>
                    <div className="form-group">
                      <label>Grado/Nivel</label>
                      <input
                        type="text"
                        name="grade"
                        value={formData.grade}
                        onChange={this.handleInputChange}
                        placeholder="Ej: 10mo grado, Universidad"
                      />
                    </div>
                    <div className="form-group">
                      <label>Duración (minutos)</label>
                      <input
                        type="number"
                        name="duration"
                        value={formData.duration}
                        onChange={this.handleInputChange}
                        placeholder="60"
                        min="1"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Método de subida</label>
                      <div className="upload-method-selector">
                        <label className="radio-option">
                          <input
                            type="radio"
                            name="uploadMethod"
                            value="file"
                            checked={this.state.uploadMethod === 'file'}
                            onChange={(e) => this.setState({ uploadMethod: e.target.value })}
                          />
                          📁 Subir archivo
                        </label>
                        <label className="radio-option">
                          <input
                            type="radio"
                            name="uploadMethod"
                            value="url"
                            checked={this.state.uploadMethod === 'url'}
                            onChange={(e) => this.setState({ uploadMethod: e.target.value })}
                          />
                          🔗 URL de video
                        </label>
                      </div>
                    </div>
                  </div>

                  {this.state.uploadMethod === 'file' ? (
                    <div className="form-row">
                      <div className="form-group">
                        <label>Archivo de Video *</label>
                        <input
                          type="file"
                          name="videoFile"
                          onChange={this.handleFileChange}
                          accept="video/*"
                          required={!this.state.editMode}
                        />
                        {this.state.selectedVideoFile && (
                          <small>Seleccionado: {this.state.selectedVideoFile.name}</small>
                        )}
                      </div>
                      <div className="form-group">
                        <label>Imagen de Portada (opcional)</label>
                        <input
                          type="file"
                          name="thumbnailFile"
                          onChange={this.handleFileChange}
                          accept="image/*"
                        />
                        {this.state.selectedThumbnailFile && (
                          <small>Seleccionado: {this.state.selectedThumbnailFile.name}</small>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="form-row">
                      <div className="form-group">
                        <label>URL del Video *</label>
                        <input
                          type="url"
                          name="videoUrl"
                          value={this.state.formData.videoUrl}
                          onChange={this.handleInputChange}
                          placeholder="https://www.youtube.com/watch?v=... o https://vimeo.com/..."
                          required
                        />
                        <small>Soporta YouTube, Vimeo y enlaces directos a archivos de video</small>
                      </div>
                      <div className="form-group">
                        <label>Imagen de Portada (opcional)</label>
                        <input
                          type="file"
                          name="thumbnailFile"
                          onChange={this.handleFileChange}
                          accept="image/*"
                        />
                        {this.state.selectedThumbnailFile && (
                          <small>Seleccionado: {this.state.selectedThumbnailFile.name}</small>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="form-row">
                    <div className="form-group">
                      <label>Etiquetas</label>
                      <input
                        type="text"
                        name="tags"
                        value={formData.tags}
                        onChange={this.handleInputChange}
                        placeholder="matemáticas, álgebra, ecuaciones (separadas por coma)"
                      />
                    </div>
                  </div>

                  <div className="form-actions">
                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={uploading}
                    >
                      {uploading ? '⏳ Guardando...' : (editMode ? '💾 Actualizar' : '📤 Subir Video')}
                    </button>
                  </div>
                </form>
              </div>
            )}

            <section className="videos-list-section">
              {loading ? (
                <div className="loading">Cargando videos...</div>
              ) : videos.length === 0 ? (
                <div className="empty-state">
                  <p>🎬 No has subido ningún video aún.</p>
                  <p>Haz clic en "Subir Video" para comenzar.</p>
                </div>
              ) : (
                <div className="videos-grid">
                  {videos.map(video => (
                    <div key={video._id} className="video-card">
                      <div className="video-thumbnail">
                        {video.thumbnailUrl ? (
                          <img src={video.thumbnailUrl} alt={video.title} />
                        ) : (
                          <div className="thumbnail-placeholder">
                            <span>🎥</span>
                          </div>
                        )}
                        {video.duration && (
                          <div className="video-duration">
                            {this.formatDuration(video.duration)}
                          </div>
                        )}
                      </div>

                      <div className="video-info">
                        <h4>{video.title}</h4>
                        <p className="video-subject">{video.subject}</p>
                        {video.topic && <p className="video-topic">{video.topic}</p>}

                        <div className="video-stats">
                          <span>👁️ {video.views} vistas</span>
                          <span>❤️ {video.likes} likes</span>
                        </div>

                        <div className="video-actions">
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => this.handleEdit(video)}
                          >
                            ✏️ Editar
                          </button>
                          <button
                            type="button"
                            className="btn-danger"
                            onClick={() => this.handleDelete(video._id)}
                          >
                            🗑️ Eliminar
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    );
  }
}

export default TutorVideos;
