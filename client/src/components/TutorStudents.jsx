import React, { Component } from 'react';
import apiClient from '../utils/axiosConfig';
import TutorSidebarMenu from './TutorSidebarMenu';
import './Dashboard.css';

class TutorStudents extends Component {
  state = {
    students: [],
    loading: true,
    error: null,
    user: null
  };

  componentDidMount() {
    this.loadUserProfile();
    this.loadStudents();
  }

  loadUserProfile = async () => {
    try {
      const response = await apiClient.get('/auth/profile');
      this.setState({ user: response.data.data });
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  loadStudents = async () => {
    try {
      this.setState({ loading: true });
      const response = await apiClient.get('/appointments/my-students');
      
      this.setState({
        students: response.data.data || [],
        loading: false
      });
    } catch (error) {
      console.error('Error loading students:', error);
      this.setState({
        error: 'Error al cargar los estudiantes',
        loading: false
      });
    }
  };

  formatLastActivity = (dateString) => {
    if (!dateString) return 'Sin actividad';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return 'Hace unos minutos';
    } else if (diffInHours < 24) {
      return `Hace ${Math.floor(diffInHours)} horas`;
    } else if (diffInHours < 168) { // 7 días
      return `Hace ${Math.floor(diffInHours / 24)} días`;
    } else {
      return date.toLocaleDateString('es-ES');
    }
  };

  getStudentStatus = (student) => {
    if (!student.stats.lastAppointmentDate) return 'inactive';
    
    const lastDate = new Date(student.stats.lastAppointmentDate);
    const now = new Date();
    const diffInDays = (now - lastDate) / (1000 * 60 * 60 * 24);
    
    return diffInDays <= 30 ? 'active' : 'inactive';
  };

  render() {
    const { user, students, loading, error } = this.state;

    return (
      <div className="dashboard-container">
        <TutorSidebarMenu userRole={user?.role} />
        <div className="dashboard-content">
          <div className="dashboard-header">
            <h1>Mis Estudiantes</h1>
            <p>Estudiantes con citas confirmadas o completadas</p>
          </div>

          {error && <div className="alert alert-danger">{error}</div>}

          {loading ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>Cargando estudiantes...</p>
            </div>
          ) : (
            <div className="dashboard-main">
              <div className="students-stats" style={{ 
                position: 'relative',
                top: '190px',
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                gap: '20px', 
                marginBottom: '30px' 
              }}>
                <div className="stat-card" style={{ 
                  background: 'white', 
                  padding: '20px', 
                  width: '450px',
                  borderRadius: '10px', 
                  boxShadow: '0 2px 10px rgba(0,0,0,0.1)' 
                }}>
                  <h3 style={{ margin: '0 0 10px 0', color: '#2c3e50' }}>Total Estudiantes:</h3>
                  <p style={{ fontSize: '2rem', position: 'relative', top: '-5px', fontWeight: 'bold', color: '#3498db', margin: 0 }}>
                    {students.length}
                  </p>
                </div>
                <div className="stat-card" style={{ 
                  background: 'white', 
                  width: '450px',
                  padding: '20px', 
                  borderRadius: '10px', 
                  boxShadow: '0 2px 10px rgba(0,0,0,0.1)' 
                }}>
                  <h3 style={{ margin: '0 0 10px 0', color: '#2c3e50' }}>Estudiantes Activos:</h3>
                  <p style={{ fontSize: '2rem', position: 'relative', top: '-5px',fontWeight: 'bold', color: '#27ae60', margin: 0 }}>
                    {students.filter(s => this.getStudentStatus(s) === 'active').length}
                  </p>
                </div>
                <div className="stat-card" style={{ 
                  background: 'white', 
                  padding: '20px', 
                  width: '450px',
                  borderRadius: '10px', 
                  boxShadow: '0 2px 10px rgba(0,0,0,0.1)' 
                }}>
                  <h3 style={{ margin: '0 0 10px 0', color: '#2c3e50' }}>Total Citas:</h3>
                  <p style={{ fontSize: '2rem', position: 'relative', top: '-5px', fontWeight: 'bold', color: '#e74c3c', margin: 0 }}>
                    {students.reduce((total, s) => total + s.stats.totalAppointments, 0)}
                  </p>
                </div>
              </div>

              {students.length > 0 ? (
                <div className="students-table">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Estudiante</th>
                        <th>Materias</th>
                        <th>Citas Totales</th>
                        <th>Última Actividad</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((student) => {
                        const studentName = `${student.personalInfo?.firstName || ''} ${student.personalInfo?.lastName || ''}`.trim() || 'Sin nombre';
                        const status = this.getStudentStatus(student);
                        
                        return (
                          <tr key={student._id}>
                            <td>
                              <div className="student-info">
                                <div className="student-name" style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                                  {studentName}
                                </div>
                                <div className="student-email" style={{ color: '#666', fontSize: '0.9rem' }}>
                                  {student.email}
                                </div>
                              </div>
                            </td>
                            <td>
                              <div className="subjects-list">
                                {student.stats.subjects.map((subject, index) => (
                                  <span 
                                    key={index}
                                    style={{ 
                                      display: 'inline-block',
                                      background: '#e3f2fd',
                                      color: '#1976d2',
                                      padding: '2px 8px',
                                      borderRadius: '12px',
                                      fontSize: '0.8rem',
                                      margin: '2px',
                                      whiteSpace: 'nowrap'
                                    }}
                                  >
                                    {subject}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td>
                              <div style={{ textAlign: 'center' }}>
                                <div style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>
                                  {student.stats.totalAppointments}
                                </div>
                                <div style={{ fontSize: '0.8rem', color: '#666' }}>
                                  {student.stats.completedAppointments} completadas
                                </div>
                              </div>
                            </td>
                            <td>{this.formatLastActivity(student.stats.lastAppointmentDate)}</td>
                            <td>
                              <span className={`status-badge ${status}`} style={{
                                padding: '4px 12px',
                                borderRadius: '20px',
                                fontSize: '0.8rem',
                                fontWeight: 'bold',
                                backgroundColor: status === 'active' ? '#d4edda' : '#f8d7da',
                                color: status === 'active' ? '#155724' : '#721c24'
                              }}>
                                {status === 'active' ? 'Activo' : 'Inactivo'}
                              </span>
                            </td>
                            <td>
                              <div className="action-buttons" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                <button 
                                  className="btn-outline small"
                                  style={{ fontSize: '0.8rem', padding: '4px 8px' }}
                                >
                                  Ver Perfil
                                </button>
                                <button 
                                  className="btn-outline small"
                                  style={{ fontSize: '0.8rem', padding: '4px 8px' }}
                                >
                                  Historial
                                </button>
                                <button 
                                  className="btn-outline small"
                                  style={{ fontSize: '0.8rem', padding: '4px 8px' }}
                                >
                                  Mensaje
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state" style={{
                  position: 'relative', 
                  left: '300px',
                  top: '175px',
                  width: '600px',
                  height: '380px',
                  textAlign: 'center', 
                  padding: '60px 20px',
                  background: 'white',
                  borderRadius: '10px',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
                }}>
                  <div style={{ fontSize: '4rem',position: 'relative', bottom: '55px', marginBottom: '20px' }}>👨‍🎓</div>
                  <h3 style={{ color: '#2c3e50', position: 'relative', bottom: '55px' ,marginBottom: '10px' }}>No tienes estudiantes aún</h3>
                  <p style={{ color: '#666', marginBottom: '20px', position: 'relative', bottom: '55px' }}>
                    Cuando aceptes solicitudes de asesoría, los estudiantes aparecerán aquí
                  </p>
                  <div style={{ 
                    position: 'relative',
                    bottom: '30px',
                    height: '108px',
                    background: '#f8f9fa', 
                    padding: '20px', 
                    borderRadius: '8px',
                    marginTop: '20px'
                  }}>
                    <h4 style={{ color: '#2c3e50', marginBottom: '10px',position: 'relative', bottom: '60px' }}>💡 ¿Cómo obtener estudiantes?</h4>
                    <ul style={{ textAlign: 'left', color: '#666', lineHeight: '1.6',position: 'relative', bottom: '55px' }}>
                      <li>Los estudiantes envían solicitudes de asesoría</li>
                      <li>Recibes notificaciones de las solicitudes</li>
                      <li>Aceptas las solicitudes que te interesen</li>
                      <li>Los estudiantes aparecen automáticamente aquí</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }
}

export default TutorStudents;
