import type { ApiResponse } from '../types/api';
import type { ClassVideo } from '../types/progress';
import type { UserSummary } from '../types/auth';
import React, { Component } from 'react';
import apiClient from '../utils/axiosConfig';
import { getApiErrorMessage } from '../utils/apiError';
import TutorSidebarMenu from './TutorSidebarMenu';
import './Dashboard.css';

interface TutorVideosState {
  videos: ClassVideo<string>[]; students: UserSummary[]; loading: boolean; uploading: boolean; showForm: boolean;
  formData: Omit<typeof EMPTY_FORM, 'duration'> & { duration: string | number }; editMode: boolean; editingId: string | null;
}
interface VideoPayload {
  title: string; description: string; subject: string; topic: string; grade: string;
  visibility: string; tags: string[]; duration?: number; youtubeUrl?: string; allowedStudents?: string[];
}

// Los vídeos se reproducen desde YouTube: el tutor solo guarda la URL o el ID del vídeo.
const EMPTY_FORM = {
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
};

class TutorVideos extends Component<Record<string, never>, TutorVideosState> {
  state: TutorVideosState = {
    videos: [],
    students: [], // Estudiantes con citas confirmadas con el tutor
    loading: false,
    uploading: false,
    showForm: false,
    formData: EMPTY_FORM,
    editMode: false,
    editingId: null
  };

  componentDidMount() {
    this.loadVideos();
    this.loadStudents();
  }

  loadStudents = async () => {
    try {
      const response = await apiClient.get<ApiResponse<UserSummary[]>>('/appointments/my-students');
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
      const response = await apiClient.get<ApiResponse<ClassVideo<string>[]>>('/videos/my/videos');
      this.setState({
        videos: response.data.data,
        loading: false
      });
    } catch (error) {
      console.error('Error loading videos:', error);
      this.setState({ loading: false });
    }
  };

  handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    this.setState(prevState => ({
      formData: {
        ...prevState.formData,
        [name]: value
      }
    }));
  };

  // Contrato de la API: JSON con youtubeUrl, tags como array y allowedStudents como lista de IDs.
  buildPayload = () => {
    const { formData, editMode } = this.state;
    const payload: VideoPayload = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      subject: formData.subject.trim(),
      topic: formData.topic.trim(),
      grade: formData.grade.trim(),
      visibility: formData.visibility,
      tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean)
    };
    if (formData.duration !== '') {
      payload.duration = Number(formData.duration);
    }
    if (formData.videoUrl.trim()) {
      payload.youtubeUrl = formData.videoUrl.trim();
    }
    if (formData.targetStudentId) {
      payload.allowedStudents = [formData.targetStudentId];
    } else if (!editMode) {
      payload.allowedStudents = [];
    }
    return payload;
  };

  handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const { editMode, editingId, formData } = this.state;

    if (!editMode && !formData.videoUrl.trim()) {
      alert('Introduce la URL de YouTube del vídeo.');
      return;
    }

    try {
      this.setState({ uploading: true });
      if (editMode) {
        await apiClient.put(`/videos/${editingId}`, this.buildPayload());
      } else {
        await apiClient.post('/videos', this.buildPayload());
      }

      this.setState({
        showForm: false,
        editMode: false,
        editingId: null,
        formData: EMPTY_FORM
      });
      this.loadVideos();
      alert('Video guardado correctamente');
    } catch (error) {
      alert(getApiErrorMessage(error, 'Error al guardar el video.'));
    } finally {
      this.setState({ uploading: false });
    }
  };

  handleEdit = (video: ClassVideo<string>) => {
    this.setState({
      showForm: true,
      editMode: true,
      editingId: video._id,
      formData: {
        ...EMPTY_FORM,
        title: video.title,
        description: video.description || '',
        subject: video.subject,
        topic: video.topic || '',
        grade: video.grade || '',
        duration: video.duration || '',
        visibility: video.visibility,
        tags: video.tags ? video.tags.join(', ') : ''
      }
    });
  };

  handleDelete = async (videoId: string) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este video?')) {
      return;
    }

    try {
      await apiClient.delete(`/videos/${videoId}`);
      this.loadVideos();
    } catch (error) {
      alert(getApiErrorMessage(error, 'No se pudo eliminar el video.'));
    }
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
                onClick={() => this.setState({ showForm: !showForm, editMode: false, editingId: null, formData: EMPTY_FORM })}
              >
                {showForm ? '✕ Cancelar' : '+ Añadir video'}
              </button>
            </header>

            {showForm && (
              <div className="video-form-container">
                <form onSubmit={this.handleSubmit} className="video-form">
                  <h3>{editMode ? 'Editar Video' : 'Añadir nuevo video'}</h3>

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
                      <label>👨‍🎓 Estudiante destinatario{editMode ? '' : ' *'}</label>
                      <select
                        name="targetStudentId"
                        value={formData.targetStudentId}
                        onChange={this.handleInputChange}
                        required={!editMode}
                      >
                        <option value="">{editMode ? 'Mantener destinatarios actuales' : 'Seleccionar estudiante'}</option>
                        {this.state.students.map(student => {
                          const studentName = `${student.personalInfo?.firstName || ''} ${student.personalInfo?.lastName || ''}`.trim() || student.email;
                          return (
                            <option key={student._id} value={student._id}>
                              {studentName}
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
                        <option value="private">Solo el estudiante seleccionado</option>
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
                      rows={3}
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
                        min="0"
                        max="1440"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>URL del video de YouTube{editMode ? '' : ' *'}</label>
                      <input
                        type="text"
                        name="videoUrl"
                        value={formData.videoUrl}
                        onChange={this.handleInputChange}
                        required={!editMode}
                        placeholder={editMode ? 'Déjalo vacío para mantener el video actual' : 'https://www.youtube.com/watch?v=...'}
                      />
                      <small>El video se reproduce desde YouTube; no se sube ningún archivo.</small>
                    </div>
                  </div>

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
                      {uploading ? '⏳ Guardando...' : (editMode ? '💾 Actualizar' : '📤 Añadir video')}
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
                  <p>🎬 No has añadido ningún video aún.</p>
                  <p>Haz clic en "Añadir video" para comenzar.</p>
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
