import type { Appointment } from '../types/appointments';
import type { User } from '../types/auth';
import type { ApiResponse } from '../types/api';
import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../utils/axiosConfig';
interface TutorHomeState {
  user: User | null; stats: { todayClasses: number; upcomingClasses: number; totalStudents: number };
  recentActivities: { id: string; type: string; message: string; time: string }[];
  upcomingClasses: { id: string; subject: string; student: string; time: string; date: string; scheduledDate: string }[];
  loading: boolean; error: string | null;
}

class TutorHome extends Component<{ user: User }, TutorHomeState> {
  state: TutorHomeState = {
    user: null,
    stats: {
      todayClasses: 0,
      upcomingClasses: 0,
      totalStudents: 0
    },
    recentActivities: [],
    upcomingClasses: [],
    loading: true,
    error: null
  };

  componentDidMount() {
    this.loadDashboardData();
  }

  loadDashboardData = async () => {
    try {
      this.setState({ loading: true, error: null });
      const appointmentsRes = await apiClient.get<ApiResponse<Appointment[]>>('/appointments');
      const user = this.props.user;
      const appointments = appointmentsRes.data.data || [];
      
      // Filtrar citas confirmadas y programadas
      const confirmedAppointments = appointments.filter(apt => 
        ['confirmed', 'scheduled'].includes(apt.status)
      );
      
      // Calcular estadísticas reales
      const today = new Date().toLocaleDateString('sv-SE');
      const todayAppointments = confirmedAppointments.filter(apt => {
        const appointmentDate = new Date(apt.startsAt).toLocaleDateString('sv-SE');
        return appointmentDate === today;
      });
      
      // Obtener estudiantes únicos
      const uniqueStudents = new Set<string>();
      confirmedAppointments.forEach(apt => {
        if (apt.studentId?._id) {
          uniqueStudents.add(apt.studentId._id);
        }
      });
      
      // Preparar próximas citas (próximos 3 días)
      const upcomingAppointments = confirmedAppointments
        .filter(apt => new Date(apt.startsAt) > new Date())
        .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
        .slice(0, 3)
        .map(apt => {
          const appointmentDate = new Date(apt.startsAt);
          const today = new Date();
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          
          let dateLabel = appointmentDate.toLocaleDateString('es-ES');
          if (appointmentDate.toDateString() === today.toDateString()) {
            dateLabel = 'Hoy';
          } else if (appointmentDate.toDateString() === tomorrow.toDateString()) {
            dateLabel = 'Mañana';
          }
          
          const studentName = apt.studentId?.personalInfo 
            ? `${apt.studentId.personalInfo.firstName || ''} ${apt.studentId.personalInfo.lastName || ''}`.trim()
            : apt.studentId?.email || 'Estudiante';
          
          return {
            id: apt._id,
            subject: apt.courseId?.title || 'Sin curso',
            student: studentName,
            time: appointmentDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
            date: dateLabel,
            scheduledDate: apt.startsAt
          };
        });

      this.setState({
        user,
        stats: {
          todayClasses: todayAppointments.length,
          upcomingClasses: confirmedAppointments.filter(apt => new Date(apt.startsAt) > new Date()).length,
          totalStudents: uniqueStudents.size
        },
        upcomingClasses: upcomingAppointments,
        loading: false
      });

      // Actividades recientes basadas en citas completadas recientes
      const recentCompletedAppointments = appointments
        .filter(apt => apt.status === 'completed')
        .sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime())
        .slice(0, 3);
      
      const recentActivities = recentCompletedAppointments.map(apt => {
        const studentName = apt.studentId?.personalInfo 
          ? `${apt.studentId.personalInfo.firstName || ''} ${apt.studentId.personalInfo.lastName || ''}`.trim()
          : apt.studentId?.email || 'Estudiante';
        
        const timeAgo = this.getTimeAgo(apt.startsAt);
        
        return {
          id: apt._id,
          type: 'class',
          message: `Tutoría de ${apt.courseId?.title || 'Sin curso'} completada con ${studentName}`,
          time: timeAgo
        };
      });
      
      this.setState({ recentActivities });

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      this.setState({
        error: 'Error al cargar los datos del dashboard',
        loading: false
      });
    }
  };

  getTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return 'Hace menos de 1 hora';
    } else if (diffInHours < 24) {
      return `Hace ${diffInHours} hora${diffInHours > 1 ? 's' : ''}`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `Hace ${diffInDays} día${diffInDays > 1 ? 's' : ''}`;
    }
  };

  render() {
    const { user, stats, recentActivities, upcomingClasses, loading, error } = this.state;
    const isAdvisor = String(user?.role) === 'advisor';

    if (loading) {
      return <div className="tutor-home__state" role="status">Cargando tu espacio...</div>;
    }

    if (error) {
      return <div className="tutor-home__state" role="alert">{error}<button type="button" onClick={this.loadDashboardData}>Reintentar</button></div>;
    }

    return (
      <div className="tutor-home">
        <header className="tutor-home__header">
          <h1>Inicio</h1>
          <p>Un resumen de tus sesiones y actividad reciente.</p>
        </header>

        <section className="tutor-home__stats" aria-label="Resumen de actividad">
          <article className="tutor-home__stat">
            <span className="tutor-home__stat-value">{stats.todayClasses}</span>
            <span className="tutor-home__stat-label">{isAdvisor ? 'Asesorías hoy' : 'Clases hoy'}</span>
          </article>
          <article className="tutor-home__stat">
            <span className="tutor-home__stat-value">{stats.upcomingClasses}</span>
            <span className="tutor-home__stat-label">{isAdvisor ? 'Próximas asesorías' : 'Próximas clases'}</span>
          </article>
          <article className="tutor-home__stat">
            <span className="tutor-home__stat-value">{stats.totalStudents}</span>
            <span className="tutor-home__stat-label">Estudiantes</span>
          </article>
        </section>

        <div className="tutor-home__grid">
          <section className="tutor-home__panel">
            <div className="tutor-home__panel-header">
              <div>
                <h2>{isAdvisor ? 'Próximas asesorías' : 'Próximas clases'}</h2>
                <p>Las siguientes sesiones confirmadas.</p>
              </div>
              <Link to="/dashboard/agenda">Ver agenda</Link>
            </div>
            {upcomingClasses.length ? (
              <ul className="tutor-home__list">
                {upcomingClasses.map((classItem) => (
                  <li key={classItem.id} className="tutor-home__session">
                    <time dateTime={classItem.scheduledDate}>
                      <strong>{classItem.date}</strong>
                      <span>{classItem.time}</span>
                    </time>
                    <div>
                      <h3>{classItem.subject}</h3>
                      <p>{classItem.student}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="tutor-home__empty">No hay clases programadas próximamente.</p>
            )}
          </section>

          <section className="tutor-home__panel">
            <div className="tutor-home__panel-header">
              <div>
                <h2>Actividad reciente</h2>
                <p>Sesiones completadas más recientes.</p>
              </div>
            </div>
            {recentActivities.length ? (
              <ul className="tutor-home__list">
                {recentActivities.map((activity) => (
                  <li key={activity.id} className="tutor-home__activity">
                    <p>{activity.message}</p>
                    <time>{activity.time}</time>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="tutor-home__empty">Aún no hay sesiones completadas recientes.</p>
            )}
          </section>
        </div>
      </div>
    );
  }
}

export default TutorHome;
