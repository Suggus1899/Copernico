import React, { useEffect, useState } from 'react';
import apiClient from '../utils/axiosConfig';
import './Dashboard.css';

const MyCourses = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchMyCourses();
  }, []);

  const fetchMyCourses = async () => {
    try {
      setLoading(true);
      
      // Obtener todas las citas del estudiante
      const appointmentsResponse = await apiClient.get('/appointments');
      const appointments = appointmentsResponse.data.data || [];
      
      // Filtrar solo citas confirmadas o completadas
      const confirmedAppointments = appointments.filter(apt => 
        ['confirmed', 'completed'].includes(apt.status)
      );
      
      // Agrupar por tutor/asesor y materia para crear "cursos"
      const coursesMap = new Map();
      
      confirmedAppointments.forEach(appointment => {
        const tutorId = appointment.professionalId?._id || appointment.tutorId;
        const tutorName = appointment.professionalId?.personalInfo 
          ? `${appointment.professionalId.personalInfo.firstName || ''} ${appointment.professionalId.personalInfo.lastName || ''}`.trim()
          : appointment.professionalId?.email || 'Tutor';
        
        const subject = appointment.subject;
        const courseKey = `${tutorId}-${subject}`;
        
        if (!coursesMap.has(courseKey)) {
          coursesMap.set(courseKey, {
            id: courseKey,
            subject: subject,
            tutorId: tutorId,
            tutorName: tutorName,
            tutorRole: appointment.professionalId?.role || 'tutor',
            appointments: [],
            totalSessions: 0,
            completedSessions: 0,
            upcomingSessions: 0,
            topics: new Set()
          });
        }
        
        const course = coursesMap.get(courseKey);
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
          .filter(apt => apt.status === 'confirmed' && new Date(apt.scheduledDate) > new Date())
          .sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate))[0];
        
        const lastAppointment = course.appointments
          .filter(apt => apt.status === 'completed')
          .sort((a, b) => new Date(b.scheduledDate) - new Date(a.scheduledDate))[0];
        
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
      console.error('Error fetching courses:', err);
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
        course.tutorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.topics.some(topic => topic.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    return filtered;
  };

  const formatDate = (dateString) => {
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

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { label: 'Activo', class: 'status-active', icon: '🟢' },
      completed: { label: 'Completado', class: 'status-completed', icon: '✅' }
    };
    return statusConfig[status] || { label: 'Desconocido', class: 'status-unknown', icon: '❓' };
  };

  const getRoleIcon = (role) => {
    return role === 'advisor' ? '🎯' : '👨‍🏫';
  };

  const filteredCourses = getFilteredCourses();

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Cargando tus cursos...</p>
      </div>
    );
  }

  return (
    <div className="courses-page">
      <div className="courses-header">
        <h2>📚 Mis Cursos</h2>
        <p>Cursos coordinados con tus tutores</p>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {courses.length > 0 && (
        <>
          {/* Filtros y búsqueda */}
          <div className="courses-filters">
            <div className="search-group">
              <input
                type="text"
                placeholder="Buscar por materia, tutor o tema..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
            <div className="filter-buttons">
              <button
                className={`filter-btn ${filterStatus === 'all' ? 'active' : ''}`}
                onClick={() => setFilterStatus('all')}
              >
                Todos ({courses.length})
              </button>
              <button
                className={`filter-btn ${filterStatus === 'active' ? 'active' : ''}`}
                onClick={() => setFilterStatus('active')}
              >
                Activos ({courses.filter(c => c.status === 'active').length})
              </button>
              <button
                className={`filter-btn ${filterStatus === 'completed' ? 'active' : ''}`}
                onClick={() => setFilterStatus('completed')}
              >
                Completados ({courses.filter(c => c.status === 'completed').length})
              </button>
            </div>
          </div>

          {/* Estadísticas */}
          <div className="courses-stats">
            <div className="stat-item">
              <span className="stat-number">{courses.filter(c => c.status === 'active').length}</span>
              <span className="stat-label">Cursos activos</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{courses.reduce((acc, c) => acc + c.completedSessions, 0)}</span>
              <span className="stat-label">Sesiones completadas</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{courses.reduce((acc, c) => acc + c.upcomingSessions, 0)}</span>
              <span className="stat-label">Sesiones programadas</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{Math.round(courses.reduce((acc, c) => acc + c.progress, 0) / courses.length) || 0}%</span>
              <span className="stat-label">Progreso promedio</span>
            </div>
          </div>
        </>
      )}

      {filteredCourses.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📚</div>
          <h3>
            {courses.length === 0 
              ? 'No tienes cursos coordinados aún' 
              : 'No se encontraron cursos con los filtros aplicados'
            }
          </h3>
          <p>
            {courses.length === 0 
              ? 'Los cursos aparecerán aquí cuando tengas citas confirmadas con tutores'
              : 'Intenta con otros términos de búsqueda o filtros diferentes'
            }
          </p>
          {courses.length === 0 && (
            <div className="empty-actions">
              <button className="btn btn-primary" onClick={() => window.location.href = '/student/advisories'}>
                📝 Solicitar Asesoría
              </button>
              <div className="help-text">
                <h4>💡 ¿Cómo funcionan los cursos?</h4>
                <ul>
                  <li>Solicita asesorías con tutores en diferentes materias</li>
                  <li>Cuando el tutor acepta, se crea automáticamente un "curso"</li>
                  <li>Cada materia con un tutor específico forma un curso</li>
                  <li>Aquí verás el progreso de todas tus sesiones</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="courses-grid">
          {filteredCourses.map((course) => {
            const statusBadge = getStatusBadge(course.status);
            return (
              <div key={course.id} className="course-card">
                <div className="course-header">
                  <div className="course-title">
                    <h3>📚 {course.subject}</h3>
                    <span className={`status-badge ${statusBadge.class}`}>
                      {statusBadge.icon} {statusBadge.label}
                    </span>
                  </div>
                  <div className="course-instructor">
                    <span className="instructor-info">
                      {getRoleIcon(course.tutorRole)} {course.tutorName}
                    </span>
                    <span className="role-badge">
                      Tutor
                    </span>
                  </div>
                </div>

                <div className="course-content">
                  {course.topics.length > 0 && (
                    <div className="course-topics">
                      <span className="topics-label">🎯 Temas:</span>
                      <div className="topics-list">
                        {course.topics.slice(0, 3).map((topic, index) => (
                          <span key={index} className="topic-tag">{topic}</span>
                        ))}
                        {course.topics.length > 3 && (
                          <span className="topic-tag more">+{course.topics.length - 3} más</span>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="course-progress">
                    <div className="progress-header">
                      <span>Progreso: {course.progress}%</span>
                      <span>{course.completedSessions}/{course.totalSessions} sesiones</span>
                    </div>
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{ width: `${course.progress}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="course-details">
                    <div className="detail-item">
                      <span className="detail-label">📊 Total sesiones:</span>
                      <span>{course.totalSessions}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">✅ Completadas:</span>
                      <span>{course.completedSessions}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">📅 Programadas:</span>
                      <span>{course.upcomingSessions}</span>
                    </div>
                    
                    {course.nextAppointment && (
                      <div className="detail-item next-session">
                        <span className="detail-label">🕐 Próxima sesión:</span>
                        <span className="next-session-date">
                          {formatDate(course.nextAppointment.scheduledDate)}
                        </span>
                      </div>
                    )}
                    
                    {course.lastAppointment && !course.nextAppointment && (
                      <div className="detail-item">
                        <span className="detail-label">📅 Última sesión:</span>
                        <span>{formatDate(course.lastAppointment.scheduledDate)}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="course-actions">
                  {course.status === 'active' ? (
                    <>
                      <button 
                        className="btn btn-primary"
                        onClick={() => window.location.href = '/student/classes'}
                      >
                        📚 Ver Materiales
                      </button>
                      <button 
                        className="btn btn-secondary"
                        onClick={() => window.location.href = '/student/advisories'}
                      >
                        📅 Nueva Sesión
                      </button>
                    </>
                  ) : (
                    <>
                      <button 
                        className="btn btn-secondary"
                        onClick={() => window.location.href = '/student/classes'}
                      >
                        📚 Ver Materiales
                      </button>
                      <button 
                        className="btn btn-outline"
                        onClick={() => window.location.href = '/student/advisories'}
                      >
                        🔄 Solicitar Más Sesiones
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyCourses;
