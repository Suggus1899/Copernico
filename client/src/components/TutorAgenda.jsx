import React, { useEffect, useState } from 'react';
import TutorSidebarMenu from './TutorSidebarMenu';
import apiClient from '../utils/axiosConfig';
import './Dashboard.css';

const TutorAgenda = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/appointments');
      const appointments = response.data.data || [];
      
      // Filtrar solo citas confirmadas y programadas
      const confirmedAppointments = appointments.filter(apt => 
        ['confirmed', 'scheduled'].includes(apt.status)
      );
      
      setAppointments(confirmedAppointments);
      setError('');
    } catch (err) {
      console.error('Error fetching appointments:', err);
      setError('No se pudieron cargar las citas');
    } finally {
      setLoading(false);
    }
  };

  const getAppointmentsForDate = (date) => {
    return appointments.filter(apt => {
      const appointmentDate = new Date(apt.scheduledDate).toISOString().split('T')[0];
      return appointmentDate === date;
    });
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStudentName = (student) => {
    if (!student) return 'Estudiante';
    if (student.personalInfo) {
      const firstName = student.personalInfo.firstName || '';
      const lastName = student.personalInfo.lastName || '';
      return `${firstName} ${lastName}`.trim() || student.email;
    }
    return student.email || 'Estudiante';
  };

  const getAppointmentTypeLabel = (type) => {
    const types = {
      'tutoring': 'Tutoría',
      'advising': 'Asesoría',
      'consultation': 'Consulta'
    };
    return types[type] || 'Sesión';
  };

  const todayAppointments = getAppointmentsForDate(selectedDate);

  if (loading) {
    return (
      <div className="dashboard-container">
        <TutorSidebarMenu />
        <div className="dashboard-content">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Cargando agenda...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <TutorSidebarMenu />
      <div className="dashboard-content">
        <div className="dashboard-header">
          <h1>Agenda de Clases</h1>
          <p>Gestiona tus clases y asesorías programadas</p>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}

        <div className="dashboard-main" style={{position: 'relative', top: '10px'}}>
          <div className="agenda-controls" >
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="date-picker"
              style={{position: 'relative', left: '850px', bottom: '80px',width: '200px'}}
            />
            <div className="agenda-stats" style={{position: 'relative', left: '700px', bottom: '30px'}}>
              <span className="stat-item" style={{position: 'relative', left: '250px', width: '100px', whiteSpace: 'nowrap'}} >
                Total citas: {appointments.length}
              </span>
              <span className="stat-item" style={{width: '100px', whiteSpace: 'nowrap'}} >
                Hoy: {todayAppointments.length}
              </span>
            </div>
          </div>

          <div className="agenda-calendar">
            <div className="today-schedule" style={{position: 'relative', bottom: '22px', right: '250px', width: '800px'}}>
              <h2>📋 Citas del {formatDate(selectedDate)}</h2>
              {todayAppointments.length > 0 ? (
                <div className="schedule-list">
                  {todayAppointments
                    .sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate))
                    .map((appointment) => (
                    <div key={appointment._id} className={`schedule-item ${appointment.appointmentType}`}>
                      <div className="schedule-time">
                        <span className="time">🕐 {formatTime(appointment.scheduledDate)}</span>
                        <span className="duration">({appointment.duration || 60}min)</span>
                      </div>
                      <div className="schedule-info">
                        <h4>📚 {appointment.subject}</h4>
                        {appointment.topic && (
                          <p className="topic">🎯 Tema: {appointment.topic}</p>
                        )}
                        <p className="student">👨‍🎓 {getStudentName(appointment.studentId)}</p>
                        <span className={`type-badge ${appointment.appointmentType}`}>
                          {getAppointmentTypeLabel(appointment.appointmentType)}
                        </span>
                        <span className={`status-badge ${appointment.status}`}>
                          {appointment.status === 'confirmed' ? '✅ Confirmada' : '📋 Programada'}
                        </span>
                      </div>
                      <div className="schedule-actions">
                        <button 
                          className="btn btn-primary small"
                          onClick={() => {
                            // Aquí se podría implementar funcionalidad de unirse a la sesión
                            alert('Funcionalidad de unirse a la sesión por implementar');
                          }}
                        >
                          🎥 Iniciar Sesión
                        </button>
                        <button 
                          className="btn btn-outline small"
                          onClick={() => {
                            // Aquí se podría implementar funcionalidad de editar
                            alert('Funcionalidad de editar por implementar');
                          }}
                        >
                          ✏️ Editar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-classes" style={{position: 'relative', right: '00px'}}>
                  <div className="empty-icon"></div>
                  <h3>📅 No hay citas programadas para esta fecha</h3>
                  <p>Las citas aparecerán aquí cuando los estudiantes soliciten asesorías y tú las aceptes</p>
                  <div className="help-text">
                    <h4>💡 ¿Cómo funcionan las citas?</h4>
                    <ul>
                      <li>Los estudiantes solicitan asesorías contigo</li>
                      <li>Recibes notificaciones de las solicitudes</li>
                      <li>Cuando aceptas, la cita aparece en tu agenda</li>
                      <li>Puedes ver todas tus citas confirmadas aquí</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TutorAgenda;
