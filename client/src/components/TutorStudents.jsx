import React, { Component } from 'react';
import apiClient from '../utils/axiosConfig';
import TutorSidebarMenu from './TutorSidebarMenu';
import './Dashboard.css';

class TutorStudents extends Component {
  state = {
    students: [],
    loading: false
  };

  componentDidMount() {
    this.loadUserProfile();
  }

  loadUserProfile = async () => {
    try {
      const response = await apiClient.get('/auth/profile');
      this.setState({ user: response.data.data });
    } catch (error) {
      console.error('Error loading user profile:', error);
    }

    // TODO: Load tutor's students from API
    this.setState({
      students: [
        {
          id: 1,
          name: 'Ana García López',
          email: 'ana.garcia@email.com',
          course: 'Matemáticas Avanzadas',
          progress: 85,
          lastActivity: 'Hace 2 horas',
          status: 'active'
        },
        {
          id: 2,
          name: 'Carlos Rodríguez',
          email: 'carlos.rodriguez@email.com',
          course: 'Física Cuántica',
          progress: 92,
          lastActivity: 'Hace 1 día',
          status: 'active'
        },
        {
          id: 3,
          name: 'María López',
          email: 'maria.lopez@email.com',
          course: 'Química Orgánica',
          progress: 78,
          lastActivity: 'Hace 3 días',
          status: 'active'
        },
        {
          id: 4,
          name: 'Juan Pérez',
          email: 'juan.perez@email.com',
          course: 'Matemáticas Avanzadas',
          progress: 65,
          lastActivity: 'Hace 1 semana',
          status: 'inactive'
        }
      ]
    });
  };

  render() {
    const { user, students, loading } = this.state;

    return (
      <div className="dashboard-container">
        <TutorSidebarMenu userRole={user?.role} />
        <div className="dashboard-content">
          <div className="dashboard-header">
            <h1>Mis Estudiantes</h1>
            <p>Gestiona y sigue el progreso de tus estudiantes</p>
          </div>

          <div className="dashboard-main">
            <div className="action-buttons">
              <button className="btn-primary">Agregar Estudiante</button>
              <button className="btn-secondary">Importar Lista</button>
            </div>

            <div className="students-table">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Curso</th>
                    <th>Progreso</th>
                    <th>Última Actividad</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student.id}>
                      <td>
                        <div className="student-info">
                          <div className="student-name">{student.name}</div>
                          <div className="student-email">{student.email}</div>
                        </div>
                      </td>
                      <td>{student.course}</td>
                      <td>
                        <div className="progress-bar">
                          <div
                            className="progress-fill"
                            style={{ width: `${student.progress}%` }}
                          ></div>
                          <span className="progress-text">{student.progress}%</span>
                        </div>
                      </td>
                      <td>{student.lastActivity}</td>
                      <td>
                        <span className={`status-badge ${student.status}`}>
                          {student.status === 'active' ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button className="btn-outline small">Ver Perfil</button>
                          <button className="btn-outline small">Mensaje</button>
                          <button className="btn-outline small">Progreso</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {students.length === 0 && (
              <div className="empty-state">
                <h3>No tienes estudiantes asignados</h3>
                <p>Cuando aceptes solicitudes de tutoría, aparecerán aquí</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
}

export default TutorStudents;
