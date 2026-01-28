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
        const appointmentDate = new Date(apt.scheduledDate).toISOString().split('T')[0];
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
        .filter(apt => new Date(apt.scheduledDate) > new Date())
        .sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate))
        .slice(0, 3)
        .map(apt => {
          const appointmentDate = new Date(apt.scheduledDate);
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
            subject: apt.subject,
            student: studentName,
            time: appointmentDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
            date: dateLabel,
            scheduledDate: apt.scheduledDate
          };
        });

      this.setState({
        user,
        stats: {
          todayClasses: todayAppointments.length,
          upcomingClasses: confirmedAppointments.filter(apt => new Date(apt.scheduledDate) > new Date()).length,
          totalStudents: uniqueStudents.size,
          pendingMaterials: 0 // TODO: Implementar cuando tengamos endpoint de materiales pendientes
        },
        upcomingClasses: upcomingAppointments,
        loading: false
      });

      // Actividades recientes basadas en citas completadas recientes
      const recentCompletedAppointments = appointments
        .filter(apt => apt.status === 'completed')
        .sort((a, b) => new Date(b.scheduledDate) - new Date(a.scheduledDate))
        .slice(0, 3);
      
      const recentActivities = recentCompletedAppointments.map(apt => {
        const studentName = apt.studentId?.personalInfo 
          ? `${apt.studentId.personalInfo.firstName || ''} ${apt.studentId.personalInfo.lastName || ''}`.trim()
          : apt.studentId?.email || 'Estudiante';
        
        const timeAgo = this.getTimeAgo(apt.scheduledDate);
        
        return {
          id: apt._id,
          type: 'class',
          message: `${apt.appointmentType === 'advising' ? 'Asesoría' : 'Tutoría'} de ${apt.subject} completada con ${studentName}`,
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
    const { user, stats, recentActivities, upcomingClasses, loading, error } = this.state;
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
        <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' }}>
          <div className="stat-card" style={{ background: 'white', padding: '20px', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)', display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div className="stat-icon" style={{ fontSize: '2rem' }}>📅</div>
            <div className="stat-content">
              <h3 style={{ margin: '0', fontSize: '2rem', fontWeight: '700', color: '#2c3e50' }}>{stats.todayClasses}</h3>
              <p style={{ margin: '0', color: '#666' }}>{isAdvisor ? 'Asesorías hoy' : 'Clases hoy'}</p>
            </div>
          </div>
          <div className="stat-card" style={{ background: 'white', padding: '20px', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)', display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div className="stat-icon" style={{ fontSize: '2rem' }}>📚</div>
            <div className="stat-content">
              <h3 style={{ margin: '0', fontSize: '2rem', fontWeight: '700', color: '#2c3e50' }}>{stats.upcomingClasses}</h3>
              <p style={{ margin: '0', color: '#666' }}>{isAdvisor ? 'Próximas asesorías' : 'Próximas clases'}</p>
            </div>
          </div>
          <div className="stat-card" style={{ background: 'white', padding: '20px', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)', display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div className="stat-icon" style={{ fontSize: '2rem' }}>👨‍🎓</div>
            <div className="stat-content">
              <h3 style={{ margin: '0', fontSize: '2rem', fontWeight: '700', color: '#2c3e50' }}>{stats.totalStudents}</h3>
              <p style={{ margin: '0', color: '#666' }}>Mis estudiantes</p>
            </div>
          </div>
          <div className="stat-card" style={{ background: 'white', padding: '20px', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)', display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div className="stat-icon" style={{ fontSize: '2rem' }}>📄</div>
            <div className="stat-content">
              <h3 style={{ margin: '0', fontSize: '2rem', fontWeight: '700', color: '#2c3e50' }}>{stats.pendingMaterials}</h3>
              <p style={{ margin: '0', color: '#666' }}>Materiales pendientes</p>
            </div>
          </div>
        </div>

        <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '30px' }}>
          {/* Próximas clases/asesorías */}
          <div className="dashboard-card" style={{ background: 'white', padding: '25px', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)' }}>
            <h2 style={{ margin: '0 0 20px 0', color: '#2c3e50', fontSize: '1.5rem' }}>{isAdvisor ? 'Próximas Asesorías' : 'Próximas Clases'}</h2>
            <div className="upcoming-classes">
              {upcomingClasses.length > 0 ? (
                upcomingClasses.slice(0, 3).map((classItem) => (
                  <div key={classItem.id} className="class-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 0', borderBottom: '1px solid #eee' }}>
                    <div className="class-info">
                      <h4 style={{ margin: '0 0 5px 0', color: '#2c3e50' }}>{classItem.subject}</h4>
                      <p style={{ margin: '0', color: '#666', fontSize: '0.9rem' }}>Estudiante: {classItem.student}</p>
                      <p style={{ margin: '0', color: '#666', fontSize: '0.9rem' }}>{classItem.date} a las {classItem.time}</p>
                    </div>
                    <button className="btn-primary" style={{ padding: '8px 16px', background: '#2c3e50', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Unirse</button>
                  </div>
                ))
              ) : (
                <p>No hay clases programadas próximamente.</p>
              )}
            </div>
            <Link to="/dashboard/agenda" className="view-all-link" style={{ display: 'inline-block', marginTop: '15px', color: '#2c3e50', textDecoration: 'none', fontWeight: '500' }}>Ver agenda completa →</Link>
          </div>

          {/* Actividad reciente */}
          <div className="dashboard-card" style={{ background: 'white', padding: '25px', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)' }}>
            <h2 style={{ margin: '0 0 20px 0', color: '#2c3e50', fontSize: '1.5rem' }}>Actividad Reciente</h2>
            <div className="recent-activity">
              {recentActivities.length > 0 ? (
                recentActivities.map((activity) => (
                  <div key={activity.id} className="activity-item" style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '15px 0', borderBottom: '1px solid #eee' }}>
                    <div className="activity-icon" style={{ fontSize: '1.5rem' }}>
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

          {/* Avisos importantes */}
          <div className="dashboard-card" style={{ background: 'white', padding: '25px', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)' }}>
            <h2 style={{ margin: '0 0 20px 0', color: '#2c3e50', fontSize: '1.5rem' }}>Avisos Importantes</h2>
            <div className="announcements">
              <div className="announcement-item" style={{ display: 'flex', alignItems: 'flex-start', gap: '15px', padding: '15px 0', borderBottom: '1px solid #eee' }}>
                <div className="announcement-icon" style={{ fontSize: '1.5rem' }}>📢</div>
                <div className="announcement-content">
                  <h4 style={{ margin: '0 0 5px 0', color: '#2c3e50' }}>Nueva política de pagos</h4>
                  <p style={{ margin: '0', color: '#666', fontSize: '0.9rem' }}>Los pagos se procesarán los primeros 5 días de cada mes.</p>
                </div>
              </div>
              <div className="announcement-item" style={{ display: 'flex', alignItems: 'flex-start', gap: '15px', padding: '15px 0' }}>
                <div className="announcement-icon" style={{ fontSize: '1.5rem' }}>🎓</div>
                <div className="announcement-content">
                  <h4 style={{ margin: '0 0 5px 0', color: '#2c3e50' }}>Actualización del sistema</h4>
                  <p style={{ margin: '0', color: '#666', fontSize: '0.9rem' }}>Mantenimiento programado para el próximo fin de semana.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }
}

export default TutorHome;