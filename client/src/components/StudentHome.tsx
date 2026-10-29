import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Appointment } from '../types/appointments';
import type { ApiResponse } from '../types/api';
import apiClient from '../utils/axiosConfig';
import { getAppointmentTutor } from '../utils/appointments';
import { useSessionUser } from './ProtectedRoute';
import './StudentHome.css';

const quickLinks = [
  { icon: '◫', title: 'Mis tutorías', description: 'Consulta tus sesiones y próximas clases', link: '/dashboard/cursos' },
  { icon: '▷', title: 'Mi aprendizaje', description: 'Continúa con las clases en video', link: '/dashboard/videos' },
  { icon: '⌕', title: 'Encontrar tutor', description: 'Busca apoyo en la materia que necesitas', link: '/dashboard/tutores' },
  { icon: '✎', title: 'Mis notas', description: 'Revisa tus apuntes de estudio', link: '/dashboard/notas' },
];

const StudentHome = () => {
  const user = useSessionUser();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const firstName = user.personalInfo?.firstName?.trim() || 'estudiante';

  const loadAppointments = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiClient.get<ApiResponse<Appointment[]>>('/appointments');
      setAppointments(response.data.data ?? []);
    } catch {
      setError('No se pudieron cargar tus próximas tutorías. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAppointments();
  }, []);

  const nextAppointment = appointments
    .filter((appointment) => appointment.status === 'confirmed' && new Date(appointment.startsAt) > new Date())
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())[0];
  const tutor = nextAppointment ? getAppointmentTutor(nextAppointment) : null;
  const today = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());

  return (
    <div className="student-home">
      <header className="student-home__header">
        <div>
          <p className="student-home__date">{today}</p>
          <h1 className="student-home__title">Un paso más, {firstName}.</h1>
          <p className="student-home__subtitle">Tu próxima sesión y tus herramientas de aprendizaje.</p>
        </div>
        <Link className="student-home__cta" to="/dashboard/tutores">＋ Encontrar tutor</Link>
      </header>

      <section className="student-home__appointment" aria-label="Próxima tutoría">
        {loading ? (
          <p role="status" className="student-home__loading">Cargando tus próximas tutorías…</p>
        ) : error ? (
          <div className="student-home__error" role="alert">
            <p>{error}</p>
            <button type="button" onClick={() => void loadAppointments()}>Reintentar</button>
          </div>
        ) : nextAppointment && tutor ? (
          <>
            <div className="student-home__appointment-date">
              <span>{new Date(nextAppointment.startsAt).toLocaleDateString('es-ES', { weekday: 'short' })}</span>
              <strong>{new Date(nextAppointment.startsAt).getDate()}</strong>
              <small>{new Date(nextAppointment.startsAt).toLocaleDateString('es-ES', { month: 'long' })}</small>
            </div>
            <div className="student-home__appointment-copy">
              <p id="next-appointment-title" className="student-home__eyebrow">Tu próxima tutoría</p>
              <h2>{nextAppointment.courseId?.title || 'Sesión de tutoría'}</h2>
              <p>{tutor.name} · {new Date(nextAppointment.startsAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} · {nextAppointment.durationMinutes} min</p>
            </div>
            <Link className="student-home__appointment-link" to="/dashboard/cursos">Ver tutorías <span aria-hidden="true">→</span></Link>
          </>
        ) : (
          <div className="student-home__appointment-empty">
            <div>
              <p id="next-appointment-title" className="student-home__eyebrow">Tu próxima tutoría</p>
              <h2>Aún no tienes una sesión programada</h2>
              <p>Encuentra un tutor para organizar tu próxima sesión de estudio.</p>
            </div>
            <Link className="student-home__appointment-link" to="/dashboard/tutores">Explorar tutores <span aria-hidden="true">→</span></Link>
          </div>
        )}
      </section>

      <section className="student-home__quick-links" aria-labelledby="student-tools-title">
        <div className="student-home__section-heading">
          <div>
            <p className="student-home__eyebrow">Tu espacio de estudio</p>
            <h2 id="student-tools-title">¿Qué quieres hacer hoy?</h2>
          </div>
        </div>
        <div className="student-home__grid">
          {quickLinks.map((link) => (
            <Link key={link.link} to={link.link} className="student-home__card">
              <span className="student-home__card-icon" aria-hidden="true">{link.icon}</span>
              <span className="student-home__card-title">{link.title}</span>
              <span className="student-home__card-description">{link.description}</span>
              <span className="student-home__card-arrow" aria-hidden="true">→</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
};

export default StudentHome;
