import React, { useEffect, useState } from 'react';
import apiClient from '../utils/axiosConfig';
import './Dashboard.css';

const Advisories = () => {
  const [appointments, setAppointments] = useState([]);
  const [tutors, setTutors] = useState([]);
  const [advisors, setAdvisors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch user's appointments, tutors and advisors for reference
        const [appointmentsRes, tutorsRes, advisorsRes] = await Promise.all([
          apiClient.get('/appointments'),
          apiClient.get('/users', { params: { role: 'tutor' } }),
          apiClient.get('/users', { params: { role: 'advisor' } })
        ]);

        setAppointments(appointmentsRes.data.data || []);
        setTutors(tutorsRes.data.data || []);
        setAdvisors(advisorsRes.data.data || []);
      } catch (err) {
        setError('No se pudieron cargar los datos');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleCancelAppointment = async (appointmentId) => {
    if (window.confirm('¿Estás seguro de que deseas cancelar esta sesión?')) {
      try {
        await apiClient.patch(`/appointments/${appointmentId}`, { status: 'cancelled' });
        // Refresh appointments
        const appointmentsRes = await apiClient.get('/appointments');
        setAppointments(appointmentsRes.data.data || []);
        alert('Sesión cancelada exitosamente');
      } catch (error) {
        console.error('Error cancelling appointment:', error);
        alert('Error al cancelar la sesión');
      }
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { label: 'Pendiente', class: 'status-pending', icon: '⏳' },
      confirmed: { label: 'Confirmada', class: 'status-confirmed', icon: '✅' },
      completed: { label: 'Completada', class: 'status-completed', icon: '🎓' },
      cancelled: { label: 'Cancelada', class: 'status-cancelled', icon: '❌' }
    };
    return statusConfig[status] || { label: 'Desconocido', class: 'status-unknown', icon: '❓' };
  };

  const upcomingAppointments = appointments.filter(apt =>
    new Date(apt.date) >= new Date() && apt.status !== 'cancelled'
  );

  const pastAppointments = appointments.filter(apt =>
    new Date(apt.date) < new Date() || apt.status === 'completed'
  );

  const pendingAppointments = appointments.filter(apt => apt.status === 'pending');

  // Combine tutors and advisors for reference
  const allEducators = [...tutors, ...advisors];

  return (
    <div className="advisories-page">
      <div className="advisories-header">
        <h2>📅 Mis Sesiones</h2>
        <p>Gestiona tus tutorías y asesorías programadas</p>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Cargando sesiones...</p>
        </div>
      ) : (
        <>
          {/* Estadísticas */}
          <div className="advisories-stats">
            <div className="stat-item">
              <span className="stat-number">{upcomingAppointments.length}</span>
              <span className="stat-label">Próximas sesiones</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{pastAppointments.length}</span>
              <span className="stat-label">Sesiones completadas</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{pendingAppointments.length}</span>
              <span className="stat-label">Pendientes de confirmación</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{appointments.filter(a => a.status === 'confirmed').length}</span>
              <span className="stat-label">Confirmadas</span>
            </div>
          </div>

          {/* Enlaces rápidos para solicitar sesiones */}
          <div className="quick-links">
            <h3>🔗 Solicitar nuevas sesiones</h3>
            <div className="quick-links-grid">
              <div className="quick-link-card">
                <h4>👨‍🏫 Solicitar Tutoría</h4>
                <p>Refuerzo académico en materias específicas con tutores especializados</p>
                <a href="/dashboard/tutores" className="btn btn-primary">
                  Ver Tutores ({tutors.length})
                </a>
              </div>
              <div className="quick-link-card">
                <h4>🎓 Solicitar Asesoría</h4>
                <p>Orientación académica y profesional con asesores expertos</p>
                <a href="/dashboard/asesores" className="btn btn-primary">
                  Ver Asesores ({advisors.length})
                </a>
              </div>
            </div>
          </div>

          {/* Próximas sesiones */}
          {upcomingAppointments.length > 0 && (
            <div className="advisories-section">
              <h3>📅 Próximas Sesiones</h3>
              <div className="appointments-grid">
                {upcomingAppointments.map(appointment => {
                  const statusBadge = getStatusBadge(appointment.status);
                  const appointmentDate = new Date(appointment.date);
                  const isToday = appointmentDate.toDateString() === new Date().toDateString();
                  const isTomorrow = appointmentDate.toDateString() === new Date(Date.now() + 86400000).toDateString();
                  const educator = allEducators.find(e => e._id === appointment.tutorId);
                  const sessionType = appointment.type === 'tutoring' ? 'Tutoría' : 
                                    appointment.type === 'advisory' ? 'Asesoría' : 'Consulta';
                  
                  return (
                    <div key={appointment._id} className={`appointment-card ${isToday ? 'today' : ''}`}>
                      <div className="appointment-header">
                        <div className="appointment-title">
                          <h4>{appointment.subject}</h4>
                          <span className={`status-badge ${statusBadge.class}`}>
                            {statusBadge.icon} {statusBadge.label}
                          </span>
                        </div>
                        <div className="appointment-tutor">
                          <span>
                            {educator?.role === 'tutor' ? '👨‍🏫' : '🎓'} {educator?.personalInfo?.firstName} {educator?.personalInfo?.lastName}
                          </span>
                          <small>({sessionType})</small>
                        </div>
                      </div>

                      <div className="appointment-details">
                        {appointment.topic && (
                          <div className="detail-item">
                            <strong>🎯 Tema:</strong> {appointment.topic}
                          </div>
                        )}
                        <div className="detail-item">
                          <strong>📅 Fecha:</strong> 
                          <span className={isToday ? 'highlight-today' : isTomorrow ? 'highlight-tomorrow' : ''}>
                            {isToday ? ' Hoy' : isTomorrow ? ' Mañana' : ` ${appointmentDate.toLocaleDateString('es-ES')}`}
                          </span>
                        </div>
                        <div className="detail-item">
                          <strong>🕐 Hora:</strong> {appointment.time}
                        </div>
                        <div className="detail-item">
                          <strong>⏱️ Duración:</strong> {appointment.duration} minutos
                        </div>
                      </div>

                      {appointment.message && (
                        <div className="appointment-message">
                          <strong>💬 Mensaje:</strong> {appointment.message}
                        </div>
                      )}

                      <div className="appointment-actions">
                        {appointment.status === 'confirmed' && (
                          <button className="btn btn-primary">
                            🎥 Unirse a la sesión
                          </button>
                        )}
                        {appointment.status === 'pending' && (
                          <button 
                            className="btn btn-secondary"
                            onClick={() => handleCancelAppointment(appointment._id)}
                          >
                            ❌ Cancelar solicitud
                          </button>
                        )}
                        <button className="btn btn-outline">
                          ✏️ Editar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Historial */}
          {pastAppointments.length > 0 && (
            <div className="advisories-section">
              <h3>📚 Historial de Sesiones</h3>
              <div className="appointments-grid">
                {pastAppointments.slice(0, 10).map(appointment => {
                  const statusBadge = getStatusBadge(appointment.status);
                  const educator = allEducators.find(e => e._id === appointment.tutorId);
                  const sessionType = appointment.type === 'tutoring' ? 'Tutoría' : 
                                    appointment.type === 'advisory' ? 'Asesoría' : 'Consulta';
                  
                  return (
                    <div key={appointment._id} className="appointment-card past">
                      <div className="appointment-header">
                        <div className="appointment-title">
                          <h4>{appointment.subject}</h4>
                          <span className={`status-badge ${statusBadge.class}`}>
                            {statusBadge.icon} {statusBadge.label}
                          </span>
                        </div>
                        <div className="appointment-tutor">
                          <span>
                            {educator?.role === 'tutor' ? '👨‍🏫' : '🎓'} {educator?.personalInfo?.firstName} {educator?.personalInfo?.lastName}
                          </span>
                          <small>({sessionType})</small>
                        </div>
                      </div>

                      <div className="appointment-details">
                        <div className="detail-item">
                          <strong>📅 Fecha:</strong> {new Date(appointment.date).toLocaleDateString('es-ES')}
                        </div>
                        <div className="detail-item">
                          <strong>⏱️ Duración:</strong> {appointment.duration} minutos
                        </div>
                        {appointment.rating && (
                          <div className="detail-item">
                            <strong>⭐ Calificación:</strong> {'⭐'.repeat(appointment.rating)} ({appointment.rating}/5)
                          </div>
                        )}
                      </div>

                      {appointment.status === 'completed' && (
                        <div className="appointment-actions">
                          <button className="btn btn-outline">
                            📝 Dejar reseña
                          </button>
                          <button className="btn btn-outline">
                            🔄 Solicitar nueva sesión
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              
              {pastAppointments.length > 10 && (
                <div className="show-more">
                  <button className="btn btn-secondary">
                    Ver más sesiones anteriores
                  </button>
                </div>
              )}
            </div>
          )}

          {appointments.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">📅</div>
              <h3>No tienes sesiones programadas</h3>
              <p>Aquí aparecerán todas tus tutorías y asesorías una vez que las solicites</p>
              <div className="empty-benefits">
                <h4>✨ Tipos de sesiones disponibles:</h4>
                <ul>
                  <li>🎯 <strong>Tutorías:</strong> Refuerzo académico en materias específicas</li>
                  <li>💡 <strong>Asesorías:</strong> Orientación académica y profesional</li>
                  <li>⏰ <strong>Horarios flexibles</strong> que se adaptan a ti</li>
                  <li>👨‍🏫 <strong>Educadores especializados</strong> en diferentes áreas</li>
                </ul>
              </div>
              <div className="empty-actions">
                <a href="/dashboard/tutores" className="btn btn-primary">
                  👨‍🏫 Ver Tutores
                </a>
                <a href="/dashboard/asesores" className="btn btn-primary">
                  🎓 Ver Asesores
                </a>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Advisories;
