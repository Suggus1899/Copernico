import React, { Component } from 'react';
import TutorSidebarMenu from './TutorSidebarMenu';
import apiClient from '../utils/axiosConfig';
import './Dashboard.css';

class TutorMaterials extends Component {
  state = {
    materials: [],
    courses: ['Matemáticas Avanzadas', 'Física Cuántica', 'Química Orgánica']
  };

  componentDidMount() {
    this.fetchMaterials();
  }

  fetchMaterials = async () => {
    try {
      const res = await apiClient.get('/educational-material/my/materials');
      const list = (res.data?.data || []).map(m => ({
        id: m._id,
        title: m.title,
        course: m.course || m.subject || 'General',
        type: (m.type || 'pdf').toLowerCase(),
        size: m.fileSize || '',
        url: m.fileUrl || m.externalLink || '',
        uploaded: m.createdAt,
        downloads: m.downloads || 0
      }));
      this.setState({ materials: list });
    } catch (err) {
      // silencioso por ahora
    }
  }

  handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este material?')) return;
    try {
      await apiClient.delete(`/materials/${id}`);
      await this.fetchMaterials();
    } catch (err) {
      // mostrar error en UI si se desea
    }
  }

  handleEdit = async (material) => {
    const newTitle = window.prompt('Nuevo título', material.title) || material.title;
    const newCourse = window.prompt('Materia/Curso', material.course) || material.course;
    try {
      await apiClient.put(`/materials/${material.id}`, {
        title: newTitle,
        subject: newCourse
      });
      await this.fetchMaterials();
    } catch (err) {
      // mostrar error en UI si se desea
    }
  }

  handleDownload = (material) => {
    if (material.url) {
      window.open(material.url, '_blank');
    }
  }

  render() {
    const { materials, courses } = this.state;

    return (
      <div className="dashboard-container">
        <TutorSidebarMenu />
        <div className="dashboard-content">
          <div className="dashboard-header">
            <h1>Gestión de Materiales</h1>
            <p>Sube, edita y elimina materiales educativos para tus cursos</p>
          </div>

          <div className="dashboard-main">
            <div className="materials-controls">
              <select className="course-filter">
                <option value="">Todos los cursos</option>
                {courses.map(course => (
                  <option key={course} value={course}>{course}</option>
                ))}
              </select>
              <label className="btn-primary" style={{ cursor: 'pointer' }}>
                Subir Nuevo Material
                <input type="file" style={{ display: 'none' }} onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const form = new FormData();
                  form.append('file', file);
                  try {
                    const upRes = await apiClient.post('/materials/upload', form, {
                      headers: { 'Content-Type': 'multipart/form-data' }
                    });
                    const { fileUrl, fileSize } = upRes.data?.data || {};
                    // Prellenar creación rápida de material usando el fileUrl
                    const createRes = await apiClient.post('/materials', {
                      title: file.name,
                      description: '',
                      type: 'document',
                      subject: 'General',
                      fileUrl,
                      fileSize
                    });
                    await this.fetchMaterials();
                  } catch (err) {
                    // podría mostrar error toast
                  }
                }} />
              </label>
            </div>

            <div className="materials-grid">
              {materials.map((material) => (
                <div key={material.id} className="material-card">
                  <div className="material-icon">
                    {material.type === 'pdf' && '📄'}
                    {material.type === 'docx' && '📝'}
                    {material.type === 'mp4' && '🎥'}
                    {material.type === 'pptx' && '📊'}
                  </div>
                  <div className="material-info">
                    <h4>{material.title}</h4>
                    <p><strong>Curso:</strong> {material.course}</p>
                    <p><strong>Tipo:</strong> {material.type.toUpperCase()}</p>
                    <p><strong>Tamaño:</strong> {material.size}</p>
                    <p><strong>Subido:</strong> {new Date(material.uploaded).toLocaleDateString('es-ES')}</p>
                    <p><strong>Descargas:</strong> {material.downloads}</p>
                  </div>
                  <div className="material-actions">
                    <button className="btn-outline small" onClick={() => this.handleDownload(material)}>Descargar</button>
                    <button className="btn-outline small" onClick={() => this.handleEdit(material)}>Editar</button>
                    <button className="btn-danger small" onClick={() => this.handleDelete(material.id)}>Eliminar</button>
                  </div>
                </div>
              ))}
            </div>

            {materials.length === 0 && (
              <div className="empty-state">
                <h3>No has subido materiales aún</h3>
                <p>Comparte recursos educativos con tus estudiantes</p>
                <button className="btn-primary">Subir Primer Material</button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
}

export default TutorMaterials;
