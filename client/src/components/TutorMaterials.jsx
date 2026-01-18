import React, { Component } from 'react';
import TutorSidebarMenu from './TutorSidebarMenu';
import './Dashboard.css';

class TutorMaterials extends Component {
  state = {
    materials: [],
    courses: ['Matemáticas Avanzadas', 'Física Cuántica', 'Química Orgánica']
  };

  componentDidMount() {
    this.setState({
      materials: [
        { id: 1, title: 'Álgebra Lineal - Guía Completa', course: 'Matemáticas Avanzadas', type: 'pdf', size: '2.5 MB', uploaded: '2024-01-10', downloads: 12 },
        { id: 2, title: 'Ejercicios de Mecánica Cuántica', course: 'Física Cuántica', type: 'docx', size: '1.8 MB', uploaded: '2024-01-12', downloads: 8 },
        { id: 3, title: 'Video: Reacciones Orgánicas', course: 'Química Orgánica', type: 'mp4', size: '45 MB', uploaded: '2024-01-14', downloads: 15 },
        { id: 4, title: 'Tabla Periódica Interactiva', course: 'Química Orgánica', type: 'pdf', size: '800 KB', uploaded: '2024-01-13', downloads: 22 }
      ]
    });
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
              <button className="btn-primary">Subir Nuevo Material</button>
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
                    <button className="btn-outline small">Descargar</button>
                    <button className="btn-outline small">Editar</button>
                    <button className="btn-danger small">Eliminar</button>
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
