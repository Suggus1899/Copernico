import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../utils/axiosConfig';

class TutorHome extends Component {
  state = {
    user: null,
    stats: {
      todayClasses: 0,
      upcomingClasses: 0,
      totalStudents: 0,
      pendingMaterials: 0
    },
    recentActivities: [],
    upcomingClasses: [],
    notifications: [],
    loading: true,
    error: null
  };

  componentDidMount() {
    this.loadDashboardData();
  }

  loadDashboardData = async () => {
    try {
      const [profileRes, appointmentsRes] = await Promise.all([
        apiClient.get('/auth/profile'),
        apiClient.get('/appointments')
      ]);

      const user = profileRes.data.data;
      const appointments = appointmentsRes.data.data || [];
      
      // Filtrar citas confirmadas y programadas
      const confirmedAppointments = appointments.filter(apt => 
        ['confirmed', 'scheduled'].includes(apt.status)
      );
      
      // Calcular estadísticas reales
      const today = new Date().toISOString().split('T')[0];
      const todayAppointments = confirmedAppointments.filter(apt => {
        const appointmentDate = new Date(apt.startsAt).toISOString().split('T')[0];
        return appointmentDate === today;
      });
      
      // Obtener estudiantes únicos
      const uniqueStudents = new Set();
      confirmedAppointments.forEach(apt => {
        if (apt.studentId?._id) {
          uniqueStudents.add(apt.studentId._id);
        }
      });
      
      // Preparar próximas citas (próximos 3 días)
      const upcomingAppointments = confirmedAppointments
        .filter(apt => new Date(apt.startsAt) > new Date())
        .sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt))
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
          totalStudents: uniqueStudents.size,
          pendingMaterials: 0 // TODO: Implementar cuando tengamos endpoint de materiales pendientes
        },
        upcomingClasses: upcomingAppointments,
        loading: false
      });

      // Actividades recientes basadas en citas completadas recientes
      const recentCompletedAppointments = appointments
        .filter(apt => apt.status === 'completed')
        .sort((a, b) => new Date(b.startsAt) - new Date(a.startsAt))
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

  getTimeAgo = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    
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
    const { user, stats, recentActivities, upcomingClasses, notifications, loading, error } = this.state;
    const isAdvisor = user?.role === 'advisor';

    if (loading) {
      return <div className="loading-spinner">Cargando dashboard...</div>;
    }

    if (error) {
      return <div className="error-message">{error}</div>;
    }

    return (
      <>
        {/* Estadísticas rápidas */}
        <div className="stats-grid" style={{ display: 'grid', gap: '20px', marginBottom: '600px', position: 'relative',top: '150px' }}>
          <div className="stat-card" style={{ background: 'white', height: '100px', padding: '20px', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)', display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div className="stat-icon" style={{ fontSize: '2rem' }}>📅</div>
            <div className="stat-content">
              <h3 style={{ margin: '0', fontSize: '2rem', fontWeight: '700', color: '#2c3e50' }}>{stats.todayClasses}</h3>
              <p style={{ margin: '0', color: '#666' }}>{isAdvisor ? 'Asesorías hoy' : 'Clases hoy'}</p>
            </div>
          </div>
          <div className="stat-card" style={{ background: 'white', height: '100px' , padding: '20px', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)', display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div className="stat-icon" style={{ fontSize: '2rem' }}>📚</div>
            <div className="stat-content">
              <h3 style={{ margin: '0', fontSize: '2rem', fontWeight: '700', color: '#2c3e50' }}>{stats.upcomingClasses}</h3>
              <p style={{ margin: '0', color: '#666' }}>{isAdvisor ? 'Próximas asesorías' : 'Próximas clases'}</p>
            </div>
          </div>
          <div className="stat-card" style={{ background: 'white', height: '100px', padding: '20px', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)', display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div className="stat-icon" style={{ fontSize: '2rem' }}>👨‍🎓</div>
            <div className="stat-content">
              <h3 style={{ margin: '0', fontSize: '2rem', fontWeight: '700', color: '#2c3e50' }}>{stats.totalStudents}</h3>
              <p style={{ margin: '0', color: '#666' }}>Mis estudiantes</p>
            </div>
          </div>
          <div className="stat-card" style={{ background: 'white', height: '100px', padding: '20px', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)', display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div className="stat-icon" style={{ fontSize: '2rem' }}>📄</div>
            <div className="stat-content">
              <h3 style={{ margin: '0', fontSize: '2rem', fontWeight: '700', color: '#2c3e50' }}>{stats.pendingMaterials}</h3>
              <p style={{ margin: '0', color: '#666' }}>Materiales pendientes</p>
            </div>
          </div>
        </div>

        <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '30px', position: 'relative',top: '150px' }}>
          {/* Avisos importantes - Mueve esto a la izquierda */}
          <div className="dashboard-card" style={{ background: 'white', height: '160px', padding: '25px', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)' }}>
            <h2 style={{ margin: '0 0 20px 0', color: '#2c3e50', fontSize: '1rem' }}>Avisos Importantes</h2>
            <div className="announcements">
              <div className="announcement-item" style={{ display: 'flex', alignItems: 'flex-start', gap: '15px', padding: '15px 0' }}>
                <div className="announcement-icon" style={{ fontSize: '1.5rem' }}>🎓</div>
                <div className="announcement-content">
                  <h4 style={{ margin: '0 0 5px 0', color: '#2c3e50' }}>Actualización del sistema</h4>
                  <p style={{ margin: '0', color: '#666', fontSize: '0.9rem' }}>Mantenimiento programado para el próximo fin de semana.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Próximas clases/asesorías */}
          <div className="dashboard-card" style={{ background: 'white', height: '140px',padding: '25px', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)',  position: 'relative', top: '-110px' }}>
            <h2 style={{ position: 'relative',bottom: '7px',margin: '0 0 20px 0', color: '#2c3e50', fontSize: '1rem' }}>{isAdvisor ? 'Próximas Asesorías' : 'Próximas Clases'}</h2>
            <div className="upcoming-classes" style={{position: 'relative', bottom: '15px'}}>
              {upcomingClasses.length > 0 ? (
                upcomingClasses.slice(0, 1).map((classItem) => (
                  <div key={classItem.id} className="class-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 0',borderBottom: '1px solid #eee' }}>
                    <div className="class-info">
                      <h4 style={{ margin: '0 0 5px 0', color: '#2c3e50' }}>{classItem.subject}</h4>
                      <p style={{ margin: '0', color: '#666', fontSize: '0.9rem' }}>Estudiante: {classItem.student}</p>
                      <p style={{ margin: '0', color: '#666', fontSize: '0.9rem' }}>{classItem.date} a las {classItem.time}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p>No hay clases programadas próximamente.</p>
              )}
            </div>
            <Link to="/dashboard/agenda" className="view-all-link" style={{ position: 'relative', bottom: '72px', left:'330px',display: 'inline-block', marginTop: '15px', color: '#2c3e50', textDecoration: 'none', fontWeight: '500' }}>Ver agenda completa →</Link>
          </div>

          {/* Actividad reciente */}
          <div className="dashboard-card" style={{ background: 'white',position: 'relative', bottom: '225px', height: '100px', padding: '20px', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)' }}>
            <h2 style={{ margin: '0 0 2px 0', color: '#2c3e50', fontSize: '1rem' }}>Actividad Reciente</h2>
            <div className="recent-activity" style={{position: 'relative', top: '15px'}}>
              {recentActivities.length > 0 ? (
                recentActivities.map((activity) => (
                  <div key={activity.id} className="activity-item" style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '15px 0', borderBottom: '1px solid #eee' }}>
                    <div className="activity-icon" style={{ fontSize: '1rem' }}>
                      {activity.type === 'class' && '📚'}
                      {activity.type === 'material' && '📄'}
                      {activity.type === 'student' && '👨‍🎓'}
                    </div>
                    <div className="activity-content">
                      <p style={{ margin: '0 0 5px 0', color: '#2c3e50' }}>{activity.message}</p>
                      <span className="activity-time" style={{ color: '#666', fontSize: '0.8rem' }}>{activity.time}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p>No hay actividad reciente.</p>
              )}
            </div>
          </div>

          {/* Notificaciones */}
          <div className="dashboard-card" style={{ background: 'white',position: 'relative', bottom: '340px', height: '140px', padding: '20px', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)' }}>
            <h2 style={{ margin: '0 0 20px 0', color: '#2c3e50', fontSize: '1rem' }}>Notificaciones</h2>
            <div className="notifications" style={{position: 'relative', bottom: '5px'}}>
              {notifications.length > 0 ? (
                notifications.slice(0, 4).map((notification) => (
                  <div key={notification.id} className={`notification-item ${notification.unread ? 'unread' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '15px 0', borderBottom: '1px solid #eee', backgroundColor: notification.unread ? '#f8f9fa' : 'transparent' }}>
                    <div className="notification-icon" style={{ fontSize: '1.2rem' }}>
                      {notification.type === 'info' && 'ℹ️'}
                      {notification.type === 'warning' && '⚠️'}
                      {notification.type === 'success' && '✅'}
                    </div>
                    <div className="notification-content">
                      <p style={{ margin: '0', color: '#2c3e50' }}>{notification.message}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p>No hay notificaciones.</p>
              )}
            </div>
            <Link to="/dashboard/notificaciones" className="view-all-link" style={{ position: 'relative', bottom: '7px', left: '285px', display: 'inline-block', marginTop: '15px', color: '#2c3e50', textDecoration: 'none', fontWeight: '500' }}>Ver todas las notificaciones →</Link>
          </div>
        </div>
      </>
    );
  }
}

export default TutorHome;