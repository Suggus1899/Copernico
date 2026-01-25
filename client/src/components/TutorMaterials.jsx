import React, { Component } from 'react';
import apiClient from '../utils/axiosConfig';
import TutorSidebarMenu from './TutorSidebarMenu';
import './Dashboard.css';

class TutorMaterials extends Component {
  state = {
    materials: [],
    students: [], // Lista de estudiantes del tutor
    loading: false,
    uploading: false,
    showForm: false,
    selectedFile: null,
    userRole: 'tutor', // Agregar rol del usuario
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
      visibility: 'students', // Automáticamente dirigido al estudiante seleccionado
      targetStudentId: ''
    },
    editMode: false,
    editingId: null
  };

  componentDidMount() {
    this.loadUserProfile();
    this.loadMaterials();
    this.loadStudents();
  }

  loadUserProfile = async () => {
    try {
      const response = await apiClient.get('/auth/profile');
      const userData = response.data.data || response.data;
      this.setState({ userRole: userData.role });
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

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

    console.log('=== FRONTEND: Iniciando envío ===');
    console.log('Estado del formulario:', this.state.formData);
    console.log('Archivo seleccionado:', this.state.selectedFile);

    if (!this.state.selectedFile && !this.state.editMode) {
      alert('Por favor selecciona un archivo');
      return;
    }

    if (!this.state.formData.title || !this.state.formData.subject || !this.state.formData.targetStudentId) {
      alert('Por favor completa todos los campos requeridos (Título, Materia, Estudiante)');
      return;
    }

    try {
      this.setState({ uploading: true });

      // Crear FormData de manera más simple
      const formData = new FormData();
      
      // Agregar campos básicos
      formData.append('title', this.state.formData.title);
      formData.append('subject', this.state.formData.subject);
      formData.append('type', this.state.formData.type);
      formData.append('difficulty', this.state.formData.difficulty);
      formData.append('targetStudentId', this.state.formData.targetStudentId);
      
      // Agregar campos opcionales solo si tienen valor
      if (this.state.formData.description) {
        formData.append('description', this.state.formData.description);
      }
      if (this.state.formData.topic) {
        formData.append('topic', this.state.formData.topic);
      }
      if (this.state.formData.tags) {
        formData.append('tags', this.state.formData.tags);
      }

      // Agregar archivo
      if (this.state.selectedFile) {
        formData.append('file', this.state.selectedFile);
      }

      console.log('=== FRONTEND: FormData preparado ===');
      for (let [key, value] of formData.entries()) {
        console.log(`${key}:`, value);
      }

      console.log('=== FRONTEND: Enviando petición ===');
      
      const response = await apiClient.post('/materials', formData, {
        headers: {
          // Dejar que el navegador establezca el Content-Type automáticamente
        }
      });

      console.log('=== FRONTEND: Respuesta recibida ===');
      console.log('Response:', response.data);

      alert('Material subido exitosamente!');

      // Limpiar formulario
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
          visibility: 'students', // Fixed: should be 'students' not 'student'
          targetStudentId: ''
        }
      });

      this.loadMaterials();

    } catch (error) {
      console.error('=== FRONTEND: Error completo ===');
      console.error('Error:', error);
      console.error('Response data:', error.response?.data);
      console.error('Response status:', error.response?.status);
      console.error('Response headers:', error.response?.headers);
      
      const errorMessage = error.response?.data?.error || 
                          error.response?.data?.message || 
                          error.message || 
                          'Error desconocido al subir el material';
      
      alert(`Error al subir el material: ${errorMessage}`);
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
        visibility: material.visibility,
        targetStudentId: material.targetStudentId || ''
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
      document: '📄',
      image: '🖼️',
      // Mantener compatibilidad con tipos específicos de archivo
      pdf: '📄',
      docx: '📝',
      doc: '📝',
      txt: '📝',
      jpg: '🖼️',
      jpeg: '🖼️',
      png: '🖼️',
      gif: '🖼️',
      webp: '🖼️'
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
    const { loading, uploading, showForm, formData, editMode, filter, userRole } = this.state;
    const filteredMaterials = this.getFilteredMaterials();
    const uniqueSubjects = this.getUniqueSubjects();

    return (
      <div className="dashboard-container">
        <TutorSidebarMenu userRole={userRole} />
        <div className="dashboard-content">
          <div className="materials-header">
            <h2>📄 Gestión de Materiales</h2>
            <p>Sube documentos e imágenes educativas para tus estudiantes</p>
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
                      <label>Tipo de Material</label>
                      <select
                        name="type"
                        value={formData.type}
                        onChange={this.handleInputChange}
                      >
                        <option value="document">📄 Documento</option>
                        <option value="image">🖼️ Imagen</option>
                      </select>
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
                      <label>Dificultad</label>
                      <select
                        name="difficulty"
                        value={formData.difficulty}
                        onChange={this.handleInputChange}
                      >
                        <option value="beginner">🟢 Principiante</option>
                        <option value="intermediate">🟡 Intermedio</option>
                        <option value="advanced">🔴 Avanzado</option>
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
                        accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.webp"
                        required={!editMode}
                      />
                      <small style={{ color: '#666', fontSize: '0.8rem' }}>
                        Documentos: PDF, Word, TXT | Imágenes: JPG, PNG, GIF, WebP
                      </small>
                      {this.state.selectedFile && (
                        <small style={{ color: '#28a745', display: 'block', marginTop: '5px' }}>
                          ✅ Seleccionado: {this.state.selectedFile.name}
                        </small>
                      )}
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
                <option value="document">📄 Documentos</option>
                <option value="image">🖼️ Imágenes</option>
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
              <span className="stat-label">Total Materiales</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{filteredMaterials.reduce((sum, m) => sum + (m.downloads || 0), 0)}</span>
              <span className="stat-label">Descargas Totales</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{filteredMaterials.filter(m => m.type === 'document').length}</span>
              <span className="stat-label">📄 Documentos</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{filteredMaterials.filter(m => m.type === 'image').length}</span>
              <span className="stat-label">🖼️ Imágenes</span>
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
                  'Aún no has subido ningún material educativo para tus estudiantes.' :
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
