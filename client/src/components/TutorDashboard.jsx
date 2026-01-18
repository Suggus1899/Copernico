import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../utils/axiosConfig';
import TutorSidebarMenu from './TutorSidebarMenu';
import TutorAdvisorSearch from './TutorAdvisorSearch';
import './Dashboard.css';

class TutorDashboard extends Component {
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
      const profileRes = await apiClient.get('/auth/profile');
      const upcomingRes = await apiClient.get('/appointments/upcoming');
      const notifsRes = await apiClient.get('/notifications');
      const studentsCountRes = await apiClient.get('/appointments/my/students/count');
      const unreadCountRes = await apiClient.get('/notifications/unread-count');

      const user = profileRes.data?.data;
      const upcoming = upcomingRes.data?.data || [];

      // Calcular estadísticas básicas
      const todayStr = new Date().toISOString().split('T')[0];
      const todayCount = upcoming.filter(a => new Date(a.scheduledDate).toISOString().split('T')[0] === todayStr).length;

      this.setState({
        user,
        stats: {
          todayClasses: todayCount,
          upcomingClasses: upcoming.length,
          totalStudents: studentsCountRes?.data?.data?.count || 0,
          pendingMaterials: 0 // TODO: endpoint/materiales pendientes
        },
        upcomingClasses: upcoming.map(a => ({
          id: a._id,
          subject: a.subject || a.availabilitySlotId?.subject || 'Sesión',
          student: a.studentId?.personalInfo?.firstName + ' ' + (a.studentId?.personalInfo?.lastName || ''),
          time: new Date(a.scheduledDate).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
          date: new Date(a.scheduledDate).toLocaleDateString('es-ES')
        })),
        notifications: (notifsRes.data?.data || []).slice(0,4).map(n => ({ id: n._id, message: n.message, type: n.type || 'info', unread: !n.read })),
        unreadCount: unreadCountRes?.data?.data?.unreadCount || 0,
        recentActivities: [], // TODO: actividad reciente
        loading: false
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      this.setState({
        error: 'Error al cargar los datos del dashboard',
        loading: false
      });
    }
  };

  render() {
    const { user, stats, recentActivities, upcomingClasses, notifications, unreadCount, loading, error } = this.state;
    const isAdvisor = user?.role === 'advisor';

    if (loading) {
      return (
        <div className="dashboard-container">
          <TutorSidebarMenu userRole={user?.role} />
          <div className="dashboard-content">
            <div className="loading-spinner">Cargando dashboard...</div>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="dashboard-container">
          <TutorSidebarMenu userRole={user?.role} />
          <div className="dashboard-content">
            <div className="error-message">{error}</div>
          </div>
        </div>
      );
    }

    return (
      <div className="dashboard-container">
        <TutorSidebarMenu userRole={user?.role} />
        <div className="dashboard-content">
          <div className="dashboard-header">
            <h1>Dashboard de {user?.role === 'advisor' ? 'Asesor' : 'Tutor'}</h1>
            <p>Bienvenido de vuelta, {user?.personalInfo?.firstName} {user?.personalInfo?.lastName}</p>
            <div className="header-badges">
              <span className="badge-notifications">🔔 {unreadCount || 0}</span>
            </div>
          </div>

          <div className="dashboard-main">
            <TutorAdvisorSearch />
            {/* Estadísticas rápidas */}
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">📅</div>
                <div className="stat-content">
                  <h3>{stats.todayClasses}</h3>
                  <p>{isAdvisor ? 'Asesorías hoy' : 'Clases hoy'}</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">📚</div>
                <div className="stat-content">
                  <h3>{stats.upcomingClasses}</h3>
                  <p>{isAdvisor ? 'Próximas asesorías' : 'Próximas clases'}</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">👨‍🎓</div>
                <div className="stat-content">
                  <h3>{stats.totalStudents}</h3>
                  <p>Mis estudiantes</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">📄</div>
                <div className="stat-content">
                  <h3>{stats.pendingMaterials}</h3>
                  <p>Materiales pendientes</p>
                </div>
              </div>
            </div>

            <div className="dashboard-grid">
              {/* Próximas clases/asesorías */}
              <div className="dashboard-card">
                <h2>{isAdvisor ? 'Próximas Asesorías' : 'Próximas Clases'}</h2>
                <div className="upcoming-classes">
                  {upcomingClasses.length > 0 ? (
                    upcomingClasses.slice(0, 3).map((classItem) => (
                      <div key={classItem.id} className="class-item">
                        <div className="class-info">
                          <h4>{classItem.subject}</h4>
                          <p>Estudiante: {classItem.student}</p>
                          <p>{classItem.date} a las {classItem.time}</p>
                        </div>
                        <button className="btn-primary">Unirse</button>
                      </div>
                    ))
                  ) : (
                    <p>No hay clases programadas próximamente.</p>
                  )}
                </div>
                <Link to="/dashboard/agenda" className="view-all-link">Ver agenda completa →</Link>
              </div>

              {/* Actividad reciente */}
              <div className="dashboard-card">
                <h2>Actividad Reciente</h2>
                <div className="recent-activity">
                  {recentActivities.length > 0 ? (
                    recentActivities.map((activity) => (
                      <div key={activity.id} className="activity-item">
                        <div className="activity-icon">
                          {activity.type === 'class' && '📚'}
                          {activity.type === 'material' && '📄'}
                          {activity.type === 'student' && '👨‍🎓'}
                        </div>
                        <div className="activity-content">
                          <p>{activity.message}</p>
                          <span className="activity-time">{activity.time}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p>No hay actividad reciente.</p>
                  )}
                </div>
              </div>

              {/* Notificaciones */}
              <div className="dashboard-card">
                <h2>Notificaciones</h2>
                <div className="notifications">
                  {notifications.length > 0 ? (
                    notifications.slice(0, 4).map((notification) => (
                      <div key={notification.id} className={`notification-item ${notification.unread ? 'unread' : ''}`}>
                        <div className="notification-icon">
                          {notification.type === 'info' && 'ℹ️'}
                          {notification.type === 'warning' && '⚠️'}
                          {notification.type === 'success' && '✅'}
                        </div>
                        <div className="notification-content">
                          <p>{notification.message}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p>No hay notificaciones.</p>
                  )}
                </div>
                <Link to="/dashboard/notificaciones" className="view-all-link">Ver todas las notificaciones →</Link>
              </div>

              {/* Avisos importantes */}
              <div className="dashboard-card">
                <h2>Avisos Importantes</h2>
                <div className="announcements">
                  <div className="announcement-item">
                    <div className="announcement-icon">📢</div>
                    <div className="announcement-content">
                      <h4>Nueva política de pagos</h4>
                      <p>Los pagos se procesarán los primeros 5 días de cada mes.</p>
                    </div>
                  </div>
                  <div className="announcement-item">
                    <div className="announcement-icon">🎓</div>
                    <div className="announcement-content">
                      <h4>Actualización del sistema</h4>
                      <p>Mantenimiento programado para el próximo fin de semana.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default TutorDashboard;
