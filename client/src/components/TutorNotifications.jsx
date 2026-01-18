import React, { Component } from 'react';
import TutorSidebarMenu from './TutorSidebarMenu';
import apiClient from '../utils/axiosConfig';
import './Dashboard.css';

class TutorNotifications extends Component {
  state = {
    notifications: [],
    filter: 'all'
  };

  componentDidMount() {
    this.fetchNotifications();
  }

  fetchNotifications = async () => {
    try {
      const [listRes] = await Promise.all([
        apiClient.get('/notifications')
      ]);
      const list = (listRes.data?.data || []).map(n => ({
        id: n._id,
        type: n.type || 'system',
        title: n.title || 'Notificación',
        message: n.message,
        timestamp: n.createdAt || n.timestamp,
        read: !!n.read,
        priority: n.priority || 'low'
      }));
      this.setState({ notifications: list });
    } catch (err) {
      // silencioso por ahora
    }
  }

  markAsRead = async (id) => {
    try {
      await apiClient.patch(`/notifications/${id}/read`);
      this.setState(prevState => ({
        notifications: prevState.notifications.map(notif =>
          notif.id === id ? { ...notif, read: true } : notif
        )
      }));
    } catch (err) {
      // ignore
    }
  };

  markAllAsRead = async () => {
    try {
      await apiClient.patch('/notifications/read-all');
      this.setState(prevState => ({
        notifications: prevState.notifications.map(notif => ({ ...notif, read: true }))
      }));
    } catch (err) {
      // ignore
    }
  };

  getFilteredNotifications = () => {
    const { notifications, filter } = this.state;
    if (filter === 'all') return notifications;
    if (filter === 'unread') return notifications.filter(n => !n.read);
    return notifications.filter(n => n.type === filter);
  };

  render() {
    const { filter } = this.state;
    const filteredNotifications = this.getFilteredNotifications();
    const unreadCount = this.state.notifications.filter(n => !n.read).length;

    return (
      <div className="dashboard-container">
        <TutorSidebarMenu />
        <div className="dashboard-content">
          <div className="dashboard-header">
            <h1>Notificaciones</h1>
            <p>Mantente al día con todas tus actividades y actualizaciones</p>
          </div>

          <div className="dashboard-main">
            <div className="notifications-controls">
              <div className="notifications-stats">
                <span className="unread-count">
                  {unreadCount} sin leer
                </span>
                {unreadCount > 0 && (
                  <button className="btn-secondary small" onClick={this.markAllAsRead}>
                    Marcar todas como leídas
                  </button>
                )}
              </div>

              <select
                value={filter}
                onChange={(e) => this.setState({ filter: e.target.value })}
                className="filter-select"
              >
                <option value="all">Todas las notificaciones</option>
                <option value="unread">Solo sin leer</option>
                <option value="student_request">Solicitudes de estudiantes</option>
                <option value="payment">Pagos</option>
                <option value="class_reminder">Recordatorios de clase</option>
                <option value="system">Sistema</option>
              </select>
            </div>

            <div className="notifications-list">
              {filteredNotifications.length > 0 ? (
                filteredNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`notification-item ${!notification.read ? 'unread' : ''} ${notification.priority}`}
                  >
                    <div className="notification-icon">
                      {notification.type === 'student_request' && '👨‍🎓'}
                      {notification.type === 'payment' && '💰'}
                      {notification.type === 'class_reminder' && '⏰'}
                      {notification.type === 'material_feedback' && '💬'}
                      {notification.type === 'system' && '⚙️'}
                    </div>

                    <div className="notification-content">
                      <div className="notification-header">
                        <h4>{notification.title}</h4>
                        <span className={`priority-badge ${notification.priority}`}>
                          {notification.priority === 'high' && 'Alta'}
                          {notification.priority === 'medium' && 'Media'}
                          {notification.priority === 'low' && 'Baja'}
                        </span>
                      </div>
                      <p>{notification.message}</p>
                      <span className="notification-time">
                        {new Date(notification.timestamp).toLocaleString('es-ES')}
                      </span>
                    </div>

                    <div className="notification-actions">
                      {!notification.read && (
                        <button
                          className="btn-outline small"
                          onClick={() => this.markAsRead(notification.id)}
                        >
                          Marcar como leída
                        </button>
                      )}
                      <button className="btn-outline small">Ver detalles</button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  <h3>No hay notificaciones</h3>
                  <p>No tienes notificaciones con los filtros seleccionados</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default TutorNotifications;
