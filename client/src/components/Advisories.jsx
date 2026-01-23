import React, { useEffect, useState } from 'react';
import apiClient from '../utils/axiosConfig';
import SidebarMenu from './SidebarMenu';
import './Dashboard.css';

const Advisories = () => {
  const [appointments, setAppointments] = useState([]);
  const [tutors, setTutors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [selectedTutor, setSelectedTutor] = useState(null);
  const [requestForm, setRequestForm] = useState({
    tutorId: '',
    subject: '',
    topic: '',
    date: '',
    time: '',
    duration: 60,
    message: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch user's appointments and available tutors
        const [appointmentsRes, tutorsRes] = await Promise.all([
          apiClient.get('/appointments'),
          apiClient.get('/users', { params: { role: 'tutor' } })
        ]);

        setAppointments(appointmentsRes.data.data || []);
        setTutors(tutorsRes.data.data || []);
      } catch (err) {
        setError('No se pudieron cargar los datos');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleRequestSubmit = async (e) => {
    e.preventDefault();
    try {
      const appointmentData = {
        ...requestForm,
        type: 'advisory',
        status: 'pending'
      };

      await apiClient.post('/appointments', appointmentData);
      alert('Solicitud de asesoría enviada exitosamente');

      setShowRequestForm(false);
      setRequestForm({
        tutorId: '',
        subject: '',
        topic: '',
        date: '',
        time: '',
        duration: 60,
        message: ''
      });

      // Refresh appointments
      const appointmentsRes = await apiClient.get('/appointments');
      setAppointments(appointmentsRes.data.data || []);
    } catch (error) {
      console.error('Error creating appointment:', error);
      alert('Error al enviar la solicitud. Inténtalo nuevamente.');
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setRequestForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { label: 'Pendiente', class: 'status-pending' },
      confirmed: { label: 'Confirmada', class: 'status-confirmed' },
      completed: { label: 'Completada', class: 'status-completed' },
      cancelled: { label: 'Cancelada', class: 'status-cancelled' }
    };
    return statusConfig[status] || { label: 'Desconocido', class: 'status-unknown' };
  };

  const upcomingAppointments = appointments.filter(apt =>
    new Date(apt.date) >= new Date() && apt.status !== 'cancelled'
  );

  const pastAppointments = appointments.filter(apt =>
    new Date(apt.date) < new Date() || apt.status === 'completed'
  );

  return (
    <div className="dashboard-container">
      <SidebarMenu />
      <div className="dashboard-content">
        <div className="advisories-header">
          <h2>💬 Mis Asesorías</h2>
          <p>Gestiona tus sesiones de asesoramiento académico</p>
          <button
            className="btn btn-primary"
            onClick={() => setShowRequestForm(!showRequestForm)}
          >
            {showRequestForm ? '✕ Cancelar' : '+ Solicitar Asesoría'}
          </button>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}

        {/* Formulario de solicitud */}
        {showRequestForm && (
          <div className="request-form-container">
            <div className="request-form">
              <h3>📝 Solicitar Nueva Asesoría</h3>
              <form onSubmit={handleRequestSubmit}>
                <div className="form-row">
                  <div className="form-group">
                    <label>Tutor/Asesor *</label>
                    <select
                      name="tutorId"
                      value={requestForm.tutorId}
                      onChange={handleFormChange}
                      required
                    >
                      <option value="">Seleccionar educador</option>
                      {tutors.map(tutor => (
                        <option key={tutor._id} value={tutor._id}>
                          {tutor.personalInfo?.firstName} {tutor.personalInfo?.lastName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Materia *</label>
                    <input
                      type="text"
                      name="subject"
                      value={requestForm.subject}
                      onChange={handleFormChange}
                      placeholder="Ej: Matemáticas, Física"
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Tema específico</label>
                  <input
                    type="text"
                    name="topic"
                    value={requestForm.topic}
                    onChange={handleFormChange}
                    placeholder="Tema particular que necesitas ayuda"
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Fecha *</label>
                    <input
                      type="date"
                      name="date"
                      value={requestForm.date}
                      onChange={handleFormChange}
                      min={new Date().toISOString().split('T')[0]}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Hora *</label>
                    <input
                      type="time"
                      name="time"
                      value={requestForm.time}
                      onChange={handleFormChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Duración (min)</label>
                    <select
                      name="duration"
                      value={requestForm.duration}
                      onChange={handleFormChange}
                    >
                      <option value={30}>30 minutos</option>
                      <option value={60}>1 hora</option>
                      <option value={90}>1.5 horas</option>
                      <option value={120}>2 horas</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Mensaje para el educador</label>
                  <textarea
                    name="message"
                    value={requestForm.message}
                    onChange={handleFormChange}
                    placeholder="Describe qué necesitas ayuda específicamente..."
                    rows="4"
                  />
                </div>

                <div className="form-actions">
                  <button type="submit" className="btn btn-primary">
                    📤 Enviar Solicitud
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Cargando asesorías...</p>
          </div>
        ) : (
          <>
            {/* Estadísticas */}
            <div className="advisories-stats">
              <div className="stat-item">
                <span className="stat-number">{upcomingAppointments.length}</span>
                <span className="stat-label">Próximas asesorías</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{pastAppointments.length}</span>
                <span className="stat-label">Asesorías completadas</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{appointments.filter(a => a.status === 'pending').length}</span>
                <span className="stat-label">Pendientes</span>
              </div>
            </div>

            {/* Próximas asesorías */}
            {upcomingAppointments.length > 0 && (
              <div className="advisories-section">
                <h3>📅 Próximas Asesorías</h3>
                <div className="appointments-grid">
                  {upcomingAppointments.map(appointment => {
                    const statusBadge = getStatusBadge(appointment.status);
                    return (
                      <div key={appointment._id} className="appointment-card">
                        <div className="appointment-header">
                          <div className="appointment-title">
                            <h4>{appointment.subject}</h4>
                            <span className={`status-badge ${statusBadge.class}`}>
                              {statusBadge.label}
                            </span>
                          </div>
                          <div className="appointment-tutor">
                            <span>👨‍🏫 {appointment.tutorId?.personalInfo?.firstName} {appointment.tutorId?.personalInfo?.lastName}</span>
                          </div>
                        </div>

                        <div className="appointment-details">
                          {appointment.topic && (
                            <div className="detail-item">
                              <strong>Tema:</strong> {appointment.topic}
                            </div>
                          )}
                          <div className="detail-item">
                            <strong>Fecha:</strong> {new Date(appointment.date).toLocaleDateString('es-ES')}
                          </div>
                          <div className="detail-item">
                            <strong>Hora:</strong> {appointment.time}
                          </div>
                          <div className="detail-item">
                            <strong>Duración:</strong> {appointment.duration} minutos
                          </div>
                        </div>

                        {appointment.message && (
                          <div className="appointment-message">
                            <strong>Mensaje:</strong> {appointment.message}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Historial */}
            {pastAppointments.length > 0 && (
              <div className="advisories-section">
                <h3>📚 Historial de Asesorías</h3>
                <div className="appointments-grid">
                  {pastAppointments.slice(0, 10).map(appointment => {
                    const statusBadge = getStatusBadge(appointment.status);
                    return (
                      <div key={appointment._id} className="appointment-card past">
                        <div className="appointment-header">
                          <div className="appointment-title">
                            <h4>{appointment.subject}</h4>
                            <span className={`status-badge ${statusBadge.class}`}>
                              {statusBadge.label}
                            </span>
                          </div>
                          <div className="appointment-tutor">
                            <span>👨‍🏫 {appointment.tutorId?.personalInfo?.firstName} {appointment.tutorId?.personalInfo?.lastName}</span>
                          </div>
                        </div>

                        <div className="appointment-details">
                          <div className="detail-item">
                            <strong>Fecha:</strong> {new Date(appointment.date).toLocaleDateString('es-ES')}
                          </div>
                          {appointment.rating && (
                            <div className="detail-item">
                              <strong>Calificación:</strong> {'⭐'.repeat(appointment.rating)}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {appointments.length === 0 && !showRequestForm && (
              <div className="empty-state">
                <div className="empty-icon">💬</div>
                <h3>No tienes asesorías aún</h3>
                <p>Solicita tu primera sesión de asesoramiento académico</p>
                <button
                  className="btn btn-primary"
                  onClick={() => setShowRequestForm(true)}
                >
                  📝 Solicitar Asesoría
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Advisories;
