import type { Appointment } from '../types/appointments';
import type { ApiResponse } from '../types/api';
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../utils/axiosConfig';
import './Dashboard.css';
import './MyCourses.css';
interface CourseGroup {
  id: string; subject: string; studentId: string | undefined; studentName: string; studentEmail: string | undefined;
  appointments: Appointment[]; totalSessions: number; completedSessions: number; upcomingSessions: number; topics: Set<string>;
}
type CourseView = Omit<CourseGroup, 'topics'> & { topics: string[]; progress: number; nextAppointment?: Appointment; lastAppointment?: Appointment; status: string };


const TutorCourses = () => {
  const [courses, setCourses] = useState<CourseView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchTutorCourses();
  }, []);

  const fetchTutorCourses = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Obtener todas las citas del tutor/asesor
      const appointmentsResponse = await apiClient.get<ApiResponse<Appointment[]>>('/appointments');
      const appointments = appointmentsResponse.data.data || [];
      
      // Filtrar solo citas confirmadas o completadas
      const confirmedAppointments = appointments.filter(apt => 
        ['confirmed', 'completed'].includes(apt.status)
      );
      
      // Agrupar por estudiante y materia para crear "cursos"
      const coursesMap = new Map<string, CourseGroup>();
      
      confirmedAppointments.forEach(appointment => {
        const studentId = appointment.studentId?._id;
        const studentName = appointment.studentId?.personalInfo 
          ? `${appointment.studentId.personalInfo.firstName || ''} ${appointment.studentId.personalInfo.lastName || ''}`.trim()
          : appointment.studentId?.email || 'Estudiante';
        
        const subject = appointment.courseId?.title || 'Sin curso';
        const courseKey = `${studentId}-${subject}`;
        
        if (!coursesMap.has(courseKey)) {
          coursesMap.set(courseKey, {
            id: courseKey,
            subject: subject,
            studentId: studentId,
            studentName: studentName,
            studentEmail: appointment.studentId?.email,
            appointments: [],
            totalSessions: 0,
            completedSessions: 0,
            upcomingSessions: 0,
            topics: new Set<string>()
          });
        }
        
        const course = coursesMap.get(courseKey);
        if (!course) return;
        course.appointments.push(appointment);
        course.totalSessions++;
        
        if (appointment.status === 'completed') {
          course.completedSessions++;
        } else if (appointment.status === 'confirmed') {
          course.upcomingSessions++;
        }
        
        if (appointment.topic) {
          course.topics.add(appointment.topic);
        }
      });
      
      // Convertir Map a Array y calcular estadísticas
      const coursesArray = Array.from(coursesMap.values()).map(course => {
        const progress = course.totalSessions > 0 
          ? Math.round((course.completedSessions / course.totalSessions) * 100)
          : 0;
        
        const nextAppointment = course.appointments
          .filter(apt => apt.status === 'confirmed' && new Date(apt.startsAt) > new Date())
          .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())[0];
        
        const lastAppointment = course.appointments
          .filter(apt => apt.status === 'completed')
          .sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime())[0];
        
        return {
          ...course,
          progress,
          nextAppointment,
          lastAppointment,
          topics: Array.from(course.topics),
          status: course.upcomingSessions > 0 ? 'active' : 'completed'
        };
      });
      
      setCourses(coursesArray);
      setError('');
    } catch (err) {
      console.error('Error fetching tutor courses:', err);
      setError('No se pudieron cargar tus cursos');
    } finally {
      setLoading(false);
    }
  };

  const getFilteredCourses = () => {
    let filtered = courses;

    if (filterStatus !== 'all') {
      filtered = filtered.filter(course => course.status === filterStatus);
    }

    if (searchTerm) {
      filtered = filtered.filter(course =>
        course.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.topics.some(topic => topic.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    return filtered;
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'No programada';
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const isTomorrow = date.toDateString() === new Date(now.getTime() + 86400000).toDateString();
    
    if (isToday) {
      return `Hoy a las ${date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (isTomorrow) {
      return `Mañana a las ${date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return date.toLocaleDateString('es-ES', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; class: string; icon: string }> = {
      active: { label: 'Activo', class: 'status-active', icon: '🟢' },
      completed: { label: 'Completado', class: 'status-completed', icon: '✅' }
    };
    return statusConfig[status] || { label: 'Desconocido', class: 'status-unknown', icon: '❓' };
  };

  const filteredCourses = getFilteredCourses();

  if (loading) {
    return (
      <div className="loading-container" role="status">
        <div className="loading-spinner"></div>
        <p>Cargando tus cursos...</p>
      </div>
    );
  }

  return (
    <div className="cursos-page">
          <header className="cursos-page__header">
            <h1 className="cursos-page__title">Mis Cursos</h1>
            <p className="cursos-page__subtitle">Cursos en progreso con tus estudiantes</p>
          </header>

          {error && (
            <div className="cursos-page__alert" role="alert">
              {error}
              <button type="button" onClick={fetchTutorCourses}>Reintentar</button>
            </div>
          )}

          {courses.length > 0 && (
            <div className="cursos-page__toolbar">
              <div className="cursos-page__filters">
                <input
                  type="text"
                  placeholder="Buscar por materia, estudiante o tema..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="cursos-page__search"
                  aria-label="Buscar cursos"
                />
                <div className="cursos-page__filter-btns">
                  <button
                    type="button"
                    className={`cursos-page__filter-btn ${filterStatus === 'all' ? 'cursos-page__filter-btn--active' : ''}`}
                    onClick={() => setFilterStatus('all')}
                    aria-pressed={filterStatus === 'all'}
                  >
                    Todos ({courses.length})
                  </button>
                  <button
                    type="button"
                    className={`cursos-page__filter-btn ${filterStatus === 'active' ? 'cursos-page__filter-btn--active' : ''}`}
                    onClick={() => setFilterStatus('active')}
                    aria-pressed={filterStatus === 'active'}
                  >
                    Activos ({courses.filter(c => c.status === 'active').length})
                  </button>
                  <button
                    type="button"
                    className={`cursos-page__filter-btn ${filterStatus === 'completed' ? 'cursos-page__filter-btn--active' : ''}`}
                    onClick={() => setFilterStatus('completed')}
                    aria-pressed={filterStatus === 'completed'}
                  >
                    Completados ({courses.filter(c => c.status === 'completed').length})
                  </button>
                </div>
              </div>
              <div className="cursos-page__stats">
                <div className="cursos-page__stat">
                  <span className="cursos-page__stat-num">{courses.filter(c => c.status === 'active').length}</span>
                  <span className="cursos-page__stat-label">Activos</span>
                </div>
                <div className="cursos-page__stat">
                  <span className="cursos-page__stat-num">{courses.reduce((acc, c) => acc + c.completedSessions, 0)}</span>
                  <span className="cursos-page__stat-label">Sesiones completadas</span>
                </div>
                <div className="cursos-page__stat">
                  <span className="cursos-page__stat-num">{courses.reduce((acc, c) => acc + c.upcomingSessions, 0)}</span>
                  <span className="cursos-page__stat-label">Programadas</span>
                </div>
                <div className="cursos-page__stat">
                  <span className="cursos-page__stat-num">{Math.round(courses.reduce((acc, c) => acc + c.progress, 0) / courses.length) || 0}%</span>
                  <span className="cursos-page__stat-label">Progreso promedio</span>
                </div>
              </div>
            </div>
          )}

          {filteredCourses.length === 0 ? error ? null : (
            <div className="cursos-page__empty">
              <span className="cursos-page__empty-icon" aria-hidden>📚</span>
              <h3>
                {courses.length === 0
                  ? 'Aún no tienes cursos'
                  : 'No hay resultados con los filtros aplicados'}
              </h3>
              <p>
                {courses.length === 0
                  ? 'Los cursos se crean cuando aceptas solicitudes de asesoría de los estudiantes.'
                  : 'Prueba con otra búsqueda o quita filtros.'}
              </p>
              {courses.length === 0 && (
                <div className="cursos-page__help">
                  <h4>¿Cómo funcionan los cursos?</h4>
                  <ul>
                    <li>Los estudiantes te solicitan asesorías desde la sección Tutores</li>
                    <li>Cuando aceptas una solicitud, se crea un curso por materia y estudiante</li>
                    <li>Aquí ves el progreso de las sesiones con cada estudiante</li>
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="cursos-page__grid">
              {filteredCourses.map((course) => {
                const statusBadge = getStatusBadge(course.status);
                return (
                  <article key={course.id} className="cursos-page__card">
                    <div className="cursos-page__card-header">
                      <h3 className="cursos-page__card-title">{course.subject}</h3>
                      <span className={`cursos-page__card-status cursos-page__card-status--${course.status}`}>
                        {statusBadge.icon} {statusBadge.label}
                      </span>
                    </div>
                    <div className="cursos-page__card-tutor">
                      <span>{course.studentName}</span>
                      {course.studentEmail && (
                        <span className="cursos-page__card-email">({course.studentEmail})</span>
                      )}
                    </div>

                    {course.topics.length > 0 && (
                      <div className="cursos-page__card-topics">
                        {course.topics.slice(0, 3).map((topic, index) => (
                          <span key={index} className="cursos-page__card-tag">{topic}</span>
                        ))}
                        {course.topics.length > 3 && (
                          <span className="cursos-page__card-tag cursos-page__card-tag--more">+{course.topics.length - 3}</span>
                        )}
                      </div>
                    )}

                    <div className="cursos-page__card-progress">
                      <div className="cursos-page__card-progress-head">
                        <span>{course.progress}%</span>
                        <span>{course.completedSessions}/{course.totalSessions} sesiones</span>
                      </div>
                      <div className="cursos-page__card-progress-bar">
                        <div
                          className="cursos-page__card-progress-fill"
                          style={{ width: `${course.progress}%` }}
                        />
                      </div>
                    </div>

                    <dl className="cursos-page__card-details">
                      <div className="cursos-page__card-detail">
                        <dt>Total sesiones</dt>
                        <dd>{course.totalSessions}</dd>
                      </div>
                      <div className="cursos-page__card-detail">
                        <dt>Completadas</dt>
                        <dd>{course.completedSessions}</dd>
                      </div>
                      <div className="cursos-page__card-detail">
                        <dt>Programadas</dt>
                        <dd>{course.upcomingSessions}</dd>
                      </div>
                      {course.nextAppointment && (
                        <div className="cursos-page__card-detail cursos-page__card-detail--next">
                          <dt>Próxima sesión</dt>
                          <dd>{formatDate(course.nextAppointment.startsAt)}</dd>
                        </div>
                      )}
                      {course.lastAppointment && !course.nextAppointment && (
                        <div className="cursos-page__card-detail">
                          <dt>Última sesión</dt>
                          <dd>{formatDate(course.lastAppointment.startsAt)}</dd>
                        </div>
                      )}
                    </dl>

                    <div className="cursos-page__card-actions">
                      <Link
                        className="cursos-page__btn-outline"
                        to={`/dashboard/mensajes?userId=${encodeURIComponent(course.studentId || '')}`}
                      >
                        Enviar mensaje
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
    </div>
  );
}

export default TutorCourses;
