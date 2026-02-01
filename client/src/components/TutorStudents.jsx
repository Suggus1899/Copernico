import React, { Component } from 'react';
import apiClient from '../utils/axiosConfig';
import TutorSidebarMenu from './TutorSidebarMenu';
import './Dashboard.css';

class TutorStudents extends Component {
  state = {
    students: [],
    loading: true,
    error: null,
    user: null,
    expandedStudentId: null,
    historyStudentId: null
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

  handleViewProfile = (studentId) => {
    this.setState(prevState => ({
      expandedStudentId: prevState.expandedStudentId === studentId ? null : studentId
    }));
  };

  handleViewHistory = (studentId) => {
    this.setState(prevState => ({
      historyStudentId: prevState.historyStudentId === studentId ? null : studentId
    }));
  };

  handleSendMessage = async (student) => {
    const studentName = `${student.personalInfo?.firstName || ''} ${student.personalInfo?.lastName || ''}`.trim() || 'el estudiante';
    const message = window.prompt(`Escribe un mensaje para ${studentName}:`);

    if (!message || !message.trim()) {
      return;
    }

    const tutorName = `${this.state.user?.personalInfo?.firstName || ''} ${this.state.user?.personalInfo?.lastName || ''}`.trim() || 'tu tutor';

    try {
      await apiClient.post('/notifications', {
        userId: student._id,
        title: `Mensaje de ${tutorName}`,
        message: message.trim(),
        type: 'message_received',
        priority: 'medium',
        category: 'communication',
        deliveryMethod: ['in_app'],
        relatedUser: this.state.user?._id || undefined
      });

      alert('Mensaje enviado correctamente.');
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || 'No se pudo enviar el mensaje.';
      alert(errorMessage);
    }
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
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                gap: '20px', 
                marginBottom: '30px' 
              }}>
                <div className="stat-card" style={{ 
                  background: 'white', 
                  padding: '20px', 
                  borderRadius: '10px', 
                  boxShadow: '0 2px 10px rgba(0,0,0,0.1)' 
                }}>
                  <h3 style={{ margin: '0 0 10px 0', color: '#2c3e50' }}>Total Estudiantes</h3>
                  <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#3498db', margin: 0 }}>
                    {students.length}
                  </p>
                </div>
                <div className="stat-card" style={{ 
                  background: 'white', 
                  padding: '20px', 
                  borderRadius: '10px', 
                  boxShadow: '0 2px 10px rgba(0,0,0,0.1)' 
                }}>
                  <h3 style={{ margin: '0 0 10px 0', color: '#2c3e50' }}>Estudiantes Activos</h3>
                  <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#27ae60', margin: 0 }}>
                    {students.filter(s => this.getStudentStatus(s) === 'active').length}
                  </p>
                </div>
                <div className="stat-card" style={{ 
                  background: 'white', 
                  padding: '20px', 
                  borderRadius: '10px', 
                  boxShadow: '0 2px 10px rgba(0,0,0,0.1)' 
                }}>
                  <h3 style={{ margin: '0 0 10px 0', color: '#2c3e50' }}>Total Citas</h3>
                  <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#e74c3c', margin: 0 }}>
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
                        const isProfileOpen = this.state.expandedStudentId === student._id;
                        const isHistoryOpen = this.state.historyStudentId === student._id;
                        
                        return (
                          <React.Fragment key={student._id}>
                            <tr>
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
                                    onClick={() => this.handleViewProfile(student._id)}
                                  >
                                    {isProfileOpen ? 'Ocultar perfil' : 'Ver Perfil'}
                                  </button>
                                  <button 
                                    className="btn-outline small"
                                    style={{ fontSize: '0.8rem', padding: '4px 8px' }}
                                    onClick={() => this.handleViewHistory(student._id)}
                                  >
                                    {isHistoryOpen ? 'Ocultar historial' : 'Historial'}
                                  </button>
                                  <button 
                                    className="btn-outline small"
                                    style={{ fontSize: '0.8rem', padding: '4px 8px' }}
                                    onClick={() => this.handleSendMessage(student)}
                                  >
                                    Mensaje
                                  </button>
                                </div>
                              </td>
                            </tr>
                            {(isProfileOpen || isHistoryOpen) && (
                              <tr>
                                <td colSpan="6" style={{ background: '#f9fafb' }}>
                                  {isProfileOpen && (
                                    <div style={{ padding: '16px', borderBottom: isHistoryOpen ? '1px solid #e5e7eb' : 'none' }}>
                                      <h4 style={{ margin: '0 0 10px 0', color: '#2c3e50' }}>Perfil del estudiante</h4>
                                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                                        <div>
                                          <strong>Nombre:</strong> {studentName}
                                        </div>
                                        <div>
                                          <strong>Email:</strong> {student.personalInfo?.email || student.email || 'No disponible'}
                                        </div>
                                        <div>
                                          <strong>Teléfono:</strong> {student.personalInfo?.phone || 'No disponible'}
                                        </div>
                                        <div>
                                          <strong>Ubicación:</strong> {student.personalInfo?.city ? `${student.personalInfo.city}${student.personalInfo.country ? `, ${student.personalInfo.country}` : ''}` : 'No disponible'}
                                        </div>
                                      </div>
                                      {student.personalInfo?.bio && (
                                        <div style={{ marginTop: '10px' }}>
                                          <strong>Bio:</strong> {student.personalInfo.bio}
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {isHistoryOpen && (
                                    <div style={{ padding: '16px' }}>
                                      <h4 style={{ margin: '0 0 10px 0', color: '#2c3e50' }}>Historial de citas</h4>
                                      {student.appointments?.length ? (
                                        <ul style={{ margin: 0, paddingLeft: '18px', color: '#4b5563' }}>
                                          {student.appointments.map((appointment) => (
                                            <li key={appointment._id} style={{ marginBottom: '6px' }}>
                                              <strong>{appointment.subject}</strong>{appointment.topic ? ` · ${appointment.topic}` : ''} — {new Date(appointment.scheduledDate).toLocaleDateString('es-ES')} ({appointment.status})
                                            </li>
                                          ))}
                                        </ul>
                                      ) : (
                                        <p style={{ margin: 0, color: '#6b7280' }}>No hay citas registradas.</p>
                                      )}
                                    </div>
                                  )}
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state" style={{ 
                  textAlign: 'center', 
                  padding: '60px 20px',
                  background: 'white',
                  borderRadius: '10px',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
                }}>
                  <div style={{ fontSize: '4rem', marginBottom: '20px' }}>👨‍🎓</div>
                  <h3 style={{ color: '#2c3e50', marginBottom: '10px' }}>No tienes estudiantes aún</h3>
                  <p style={{ color: '#666', marginBottom: '20px' }}>
                    Cuando aceptes solicitudes de asesoría, los estudiantes aparecerán aquí
                  </p>
                  <div style={{ 
                    background: '#f8f9fa', 
                    padding: '20px', 
                    borderRadius: '8px',
                    marginTop: '20px'
                  }}>
                    <h4 style={{ color: '#2c3e50', marginBottom: '10px' }}>💡 ¿Cómo obtener estudiantes?</h4>
                    <ul style={{ textAlign: 'left', color: '#666', lineHeight: '1.6' }}>
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
