import React, { Component } from 'react';
import apiClient from '../utils/axiosConfig';
import TutorSidebarMenu from './TutorSidebarMenu';
import './Dashboard.css';

class TutorMaterials extends Component {
  state = {
    materials: [],
    loading: false,
    uploading: false,
    showForm: false,
    selectedFile: null,
    filter: {
      subject: '',
      type: '',
      status: ''
    },
    formData: {
      title: '',
      description: '',
      subject: '',
      topic: '',
      type: 'document',
      difficulty: 'intermediate',
      tags: '',
      visibility: 'students'
    },
    editMode: false,
    editingId: null
  };

  componentDidMount() {
    this.loadMaterials();
  }

  loadMaterials = async () => {
    try {
      this.setState({ loading: true });
      const response = await apiClient.get('/materials/my/materials');
      this.setState({
        materials: response.data.data || [],
        loading: false
      });
    } catch (error) {
      console.error('Error loading materials:', error);
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
    const file = e.target.files[0];
    if (file) {
      this.setState({ selectedFile: file });
    }
  };

  handleFilterChange = (e) => {
    const { name, value } = e.target;
    this.setState(prevState => ({
      filter: {
        ...prevState.filter,
        [name]: value
      }
    }));
  };

  handleSubmit = async (e) => {
    e.preventDefault();

    if (!this.state.selectedFile && !this.state.editMode) {
      alert('Por favor selecciona un archivo');
      return;
    }

    try {
      this.setState({ uploading: true });

      const materialData = {
        ...this.state.formData,
        tags: this.state.formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
      };

      const formDataToSend = new FormData();

      // Agregar datos del formulario
      Object.keys(materialData).forEach(key => {
        if (key === 'tags') {
          formDataToSend.append(key, JSON.stringify(materialData[key]));
        } else {
          formDataToSend.append(key, materialData[key]);
        }
      });

      // Agregar archivo si existe
      if (this.state.selectedFile) {
        formDataToSend.append('file', this.state.selectedFile);
      }

      const config = {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      };

      if (this.state.editMode) {
        await apiClient.put(`/materials/${this.state.editingId}`, formDataToSend, config);
      } else {
        await apiClient.post('/materials', formDataToSend, config);
      }

      this.setState({
        showForm: false,
        editMode: false,
        editingId: null,
        selectedFile: null,
        formData: {
          title: '',
          description: '',
          subject: '',
          topic: '',
          type: 'document',
          difficulty: 'intermediate',
          tags: '',
          visibility: 'students'
        }
      });

      this.loadMaterials();
    } catch (error) {
      console.error('Error saving material:', error);
      alert('Error al subir el material. Por favor intenta nuevamente.');
    } finally {
      this.setState({ uploading: false });
    }
  };

  handleEdit = (material) => {
    this.setState({
      showForm: true,
      editMode: true,
      editingId: material._id,
      formData: {
        title: material.title,
        description: material.description || '',
        subject: material.subject,
        topic: material.topic || '',
        type: material.type,
        difficulty: material.difficulty,
        tags: material.tags ? material.tags.join(', ') : '',
        visibility: material.visibility
      }
    });
  };

  handleDelete = async (materialId) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este material?')) {
      return;
    }

    try {
      await apiClient.delete(`/materials/${materialId}`);
      this.loadMaterials();
    } catch (error) {
      console.error('Error deleting material:', error);
      alert('Error al eliminar el material.');
    }
  };

  handleDownload = async (material) => {
    try {
      // Trigger download by opening the file URL
      if (material.fileUrl) {
        window.open(material.fileUrl, '_blank');
        // Increment download count
        await apiClient.patch(`/materials/${material._id}/download`);
      }
    } catch (error) {
      console.error('Error downloading material:', error);
    }
  };

  getFilteredMaterials = () => {
    const { materials, filter } = this.state;
    return materials.filter(material => {
      const matchesSubject = !filter.subject || material.subject.toLowerCase().includes(filter.subject.toLowerCase());
      const matchesType = !filter.type || material.type === filter.type;
      const matchesStatus = !filter.status || material.status === filter.status;
      return matchesSubject && matchesType && matchesStatus;
    });
  };

  getFileIcon = (type) => {
    const icons = {
      pdf: '📄',
      docx: '📝',
      doc: '📝',
      xlsx: '📊',
      xls: '📊',
      pptx: '📊',
      ppt: '📊',
      txt: '📝',
      video: '🎥',
      image: '🖼️',
      document: '📄'
    };
    return icons[type] || '📄';
  };

  formatFileSize = (bytes) => {
    if (!bytes) return 'Desconocido';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  getUniqueSubjects = () => {
    const subjects = [...new Set(this.state.materials.map(m => m.subject))];
    return subjects.filter(s => s).sort();
  };

  render() {
    const { loading, uploading, showForm, formData, editMode, filter } = this.state;
    const filteredMaterials = this.getFilteredMaterials();
    const uniqueSubjects = this.getUniqueSubjects();

    return (
      <div className="dashboard-container">
        <TutorSidebarMenu />
        <div className="dashboard-content">
          <div className="materials-header">
            <h2>📄 Gestión de Materiales</h2>
            <p>Sube documentos, PDFs, presentaciones y otros recursos educativos</p>
            <button
              className="btn btn-primary"
              onClick={() => this.setState({ showForm: !showForm, editMode: false, editingId: null })}
            >
              {showForm ? '✕ Cancelar' : '+ Subir Material'}
            </button>
          </div>

          {/* Formulario de subida */}
          {showForm && (
            <div className="material-form-container">
              <div className="material-form">
                <h3>{editMode ? 'Editar Material' : 'Subir Nuevo Material'}</h3>
                <form onSubmit={this.handleSubmit}>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Título *</label>
                      <input
                        type="text"
                        name="title"
                        value={formData.title}
                        onChange={this.handleInputChange}
                        placeholder="Título del material"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Materia *</label>
                      <input
                        type="text"
                        name="subject"
                        value={formData.subject}
                        onChange={this.handleInputChange}
                        placeholder="Ej: Matemáticas, Física"
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Descripción</label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={this.handleInputChange}
                      placeholder="Descripción del material"
                      rows="3"
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Tema específico</label>
                      <input
                        type="text"
                        name="topic"
                        value={formData.topic}
                        onChange={this.handleInputChange}
                        placeholder="Tema particular"
                      />
                    </div>
                    <div className="form-group">
                      <label>Tipo</label>
                      <select
                        name="type"
                        value={formData.type}
                        onChange={this.handleInputChange}
                      >
                        <option value="document">Documento</option>
                        <option value="presentation">Presentación</option>
                        <option value="worksheet">Hoja de Trabajo</option>
                        <option value="exercise">Ejercicio</option>
                        <option value="quiz">Cuestionario</option>
                        <option value="video">Video</option>
                        <option value="image">Imagen</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Dificultad</label>
                      <select
                        name="difficulty"
                        value={formData.difficulty}
                        onChange={this.handleInputChange}
                      >
                        <option value="beginner">Principiante</option>
                        <option value="intermediate">Intermedio</option>
                        <option value="advanced">Avanzado</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Archivo {editMode ? '(opcional)' : '*'}</label>
                      <input
                        type="file"
                        name="file"
                        onChange={this.handleFileChange}
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif,.mp4,.avi,.mov"
                        required={!editMode}
                      />
                      {this.state.selectedFile && (
                        <small>Seleccionado: {this.state.selectedFile.name}</small>
                      )}
                    </div>
                    <div className="form-group">
                      <label>Visibilidad</label>
                      <select
                        name="visibility"
                        value={formData.visibility}
                        onChange={this.handleInputChange}
                      >
                        <option value="private">Privado</option>
                        <option value="students">Estudiantes</option>
                        <option value="public">Público</option>
                      </select>
                    </div>
                  </div>

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

                  <div className="form-actions">
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={uploading}
                    >
                      {uploading ? '⏳ Subiendo...' : (editMode ? '💾 Actualizar' : '📤 Subir Material')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Filtros */}
          <div className="materials-filters">
            <div className="filter-group">
              <input
                type="text"
                name="subject"
                value={filter.subject}
                onChange={this.handleFilterChange}
                placeholder="Buscar por materia..."
                className="search-input"
              />
            </div>
            <div className="filter-group">
              <select
                name="type"
                value={filter.type}
                onChange={this.handleFilterChange}
                className="type-select"
              >
                <option value="">Todos los tipos</option>
                <option value="document">Documentos</option>
                <option value="presentation">Presentaciones</option>
                <option value="worksheet">Hojas de Trabajo</option>
                <option value="exercise">Ejercicios</option>
                <option value="quiz">Cuestionarios</option>
                <option value="video">Videos</option>
                <option value="image">Imágenes</option>
              </select>
            </div>
            <div className="filter-group">
              <select
                name="status"
                value={filter.status}
                onChange={this.handleFilterChange}
                className="status-select"
              >
                <option value="">Todos los estados</option>
                <option value="draft">Borrador</option>
                <option value="published">Publicado</option>
                <option value="archived">Archivado</option>
              </select>
            </div>
          </div>

          {/* Estadísticas */}
          <div className="materials-stats">
            <div className="stat-item">
              <span className="stat-number">{filteredMaterials.length}</span>
              <span className="stat-label">Materiales</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{filteredMaterials.reduce((sum, m) => sum + (m.downloads || 0), 0)}</span>
              <span className="stat-label">Descargas Totales</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{filteredMaterials.filter(m => m.type === 'document').length}</span>
              <span className="stat-label">Documentos</span>
            </div>
          </div>

          {/* Lista de materiales */}
          {loading ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>Cargando materiales...</p>
            </div>
          ) : (
            <div className="materials-grid">
              {filteredMaterials.map((material) => (
                <div key={material._id} className="material-card">
                  <div className="material-header">
                    <div className="material-icon">
                      {this.getFileIcon(material.type)}
                    </div>
                    <div className="material-status">
                      <span className={`status-badge status-${material.status || 'published'}`}>
                        {material.status === 'draft' ? 'Borrador' :
                         material.status === 'archived' ? 'Archivado' : 'Publicado'}
                      </span>
                    </div>
                  </div>

                  <div className="material-info">
                    <h4>{material.title}</h4>
                    <p className="material-subject">📚 {material.subject}</p>
                    {material.topic && <p className="material-topic">🎯 {material.topic}</p>}
                    <div className="material-meta">
                      <span className="meta-item">📄 {material.type}</span>
                      <span className="meta-item">📏 {this.formatFileSize(material.fileSize)}</span>
                      <span className="meta-item">⭐ {material.difficulty}</span>
                    </div>
                    <div className="material-stats">
                      <span>👁️ {material.views || 0} vistas</span>
                      <span>📥 {material.downloads || 0} descargas</span>
                    </div>
                    <div className="material-date">
                      📅 Subido: {new Date(material.createdAt).toLocaleDateString('es-ES')}
                    </div>
                  </div>

                  <div className="material-actions">
                    {material.fileUrl && (
                      <button
                        className="btn btn-secondary"
                        onClick={() => this.handleDownload(material)}
                      >
                        📥 Descargar
                      </button>
                    )}
                    <button
                      className="btn btn-outline"
                      onClick={() => this.handleEdit(material)}
                    >
                      ✏️ Editar
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={() => this.handleDelete(material._id)}
                    >
                      🗑️ Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && filteredMaterials.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">📄</div>
              <h3>No se encontraron materiales</h3>
              <p>{this.state.materials.length === 0 ?
                  'Aún no has subido ningún material educativo.' :
                  'Intenta con otros filtros de búsqueda.'}
              </p>
              <button
                className="btn btn-primary"
                onClick={() => this.setState({ showForm: true })}
              >
                📤 Subir Primer Material
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }
}

export default TutorMaterials;
