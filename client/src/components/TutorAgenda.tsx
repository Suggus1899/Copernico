import type { UserSummary } from '../types/auth';
import type { Appointment } from '../types/appointments';
import type { ApiResponse } from '../types/api';
import React, { useEffect, useState } from 'react';
import apiClient from '../utils/axiosConfig';
import './Dashboard.css';
import './TutorAgenda.css';
const TutorAgenda = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<ApiResponse<Appointment[]>>('/appointments');
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

  const getAppointmentsForDate = (date: string) => {
    return appointments.filter(apt => {
      const appointmentDate = new Date(apt.startsAt).toISOString().split('T')[0];
      return appointmentDate === date;
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (dateString: string) => {
    // YYYY-MM-DD del input se interpreta como UTC y en zonas detrás de UTC muestra el día anterior.
    // Parsear como fecha local para que el día seleccionado coincida con el mostrado.
    if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const [y, m, d] = dateString.split('-').map(Number);
      return new Date(y, m - 1, d).toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
    return new Date(dateString).toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStudentName = (student: UserSummary | null) => {
    if (!student) return 'Estudiante';
    if (student.personalInfo) {
      const firstName = student.personalInfo.firstName || '';
      const lastName = student.personalInfo.lastName || '';
      return `${firstName} ${lastName}`.trim() || student.email;
    }
    return student.email || 'Estudiante';
  };

  const getAppointmentTypeLabel = (type: string | undefined) => {
    const types: Record<string, string> = {
      'tutoring': 'Tutoría',
      'advising': 'Asesoría',
      'consultation': 'Consulta'
    };
    return types[type || ''] || 'Sesión';
  };

  const todayAppointments = getAppointmentsForDate(selectedDate);

  if (loading) {
    return (
      <div className="agenda-page agenda-page--loading">
        <div className="agenda-page__spinner" />
        <p>Cargando agenda...</p>
      </div>
    );
  }

  return (
    <div className="agenda-page">
          <header className="agenda-page__header">
            <h1 className="agenda-page__title">Agenda de Clases</h1>
            <p className="agenda-page__subtitle">Gestiona tus clases y asesorías programadas</p>
          </header>

          {error && (
            <div className="agenda-page__alert" role="alert">
              {error}
            </div>
          )}

          <div className="agenda-page__toolbar">
            <label className="agenda-page__date-wrap">
              <span className="agenda-page__date-label">Fecha</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="agenda-page__date-input"
                aria-label="Seleccionar fecha"
              />
            </label>
            <div className="agenda-page__stats">
              <div className="agenda-page__stat">
                <span className="agenda-page__stat-num">{appointments.length}</span>
                <span className="agenda-page__stat-label">Total citas</span>
              </div>
              <div className="agenda-page__stat">
                <span className="agenda-page__stat-num">{todayAppointments.length}</span>
                <span className="agenda-page__stat-label">Este día</span>
              </div>
            </div>
          </div>

          <section className="agenda-page__schedule">
            <h2 className="agenda-page__schedule-title">
              Citas del {formatDate(selectedDate)}
            </h2>

            {todayAppointments.length > 0 ? (
              <ul className="agenda-page__list" role="list">
                {todayAppointments
                  .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
                  .map((appointment) => (
                    <li key={appointment._id} className="agenda-page__item">
                      <div className="agenda-page__item-time">
                        <span className="agenda-page__item-hour">
                          {formatTime(appointment.startsAt)}
                        </span>
                        <span className="agenda-page__item-duration">
                          {appointment.durationMinutes || 60} min
                        </span>
                      </div>
                      <div className="agenda-page__item-body">
                        <h4 className="agenda-page__item-subject">{appointment.courseId?.title || 'Sin curso'}</h4>
                        {appointment.topic && (
                          <p className="agenda-page__item-topic">Tema: {appointment.topic}</p>
                        )}
                        <p className="agenda-page__item-student">
                          👨‍🎓 {getStudentName(appointment.studentId)}
                        </p>
                        <div className="agenda-page__item-badges">
                          <span className={`agenda-page__item-type agenda-page__item-type--${appointment.appointmentType || 'tutoring'}`}>
                            {getAppointmentTypeLabel(appointment.appointmentType)}
                          </span>
                          <span className={`agenda-page__item-status agenda-page__item-status--${appointment.status}`}>
                            {appointment.status === 'confirmed' ? 'Confirmada' : 'Programada'}
                          </span>
                        </div>
                      </div>
                    </li>
                  ))}
              </ul>
            ) : (
              <div className="agenda-page__empty">
                <span className="agenda-page__empty-icon" aria-hidden>📅</span>
                <h3>No hay citas para esta fecha</h3>
                <p>Las citas aparecerán aquí cuando aceptes solicitudes de asesoría de los estudiantes.</p>
                <div className="agenda-page__help">
                  <h4>¿Cómo funcionan las citas?</h4>
                  <ul>
                    <li>Los estudiantes solicitan asesorías contigo</li>
                    <li>Recibes notificaciones de las solicitudes</li>
                    <li>Cuando aceptas, la cita aparece en tu agenda</li>
                    <li>Puedes ver todas tus citas confirmadas aquí</li>
                  </ul>
                </div>
              </div>
            )}
          </section>
    </div>
  );
};

export default TutorAgenda;
