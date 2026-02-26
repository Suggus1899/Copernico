import React, { Component } from 'react';
import TutorSidebarMenu from './TutorSidebarMenu';
import apiClient from '../utils/axiosConfig';
import './Dashboard.css';
import './TutorNotifications.css';

class TutorNotifications extends Component {
  state = {
    notifications: [],
    loading: true,
    error: null,
    filter: 'all'
  };

  componentDidMount() {
    this.fetchNotifications();
    
    // Configurar actualización automática cada 30 segundos
    this.notificationInterval = setInterval(() => {
      this.fetchNotifications();
    }, 30000);
  }

  componentWillUnmount() {
    // Limpiar el intervalo cuando el componente se desmonte
    if (this.notificationInterval) {
      clearInterval(this.notificationInterval);
    }
  }

  fetchNotifications = async () => {
    try {
      this.setState({ loading: true, error: null });
      console.log('Obteniendo notificaciones...');
      
      const response = await apiClient.get('/notifications');
      console.log('Notificaciones obtenidas:', response.data.data?.length || 0);
      console.log('Datos de notificaciones:', response.data.data);
      
      this.setState({
        notifications: response.data.data || [],
        loading: false
      });
    } catch (error) {
      console.error('Error fetching notifications:', error);
      console.error('Error response:', error.response?.data);
      
      this.setState({
        error: 'Error al cargar las notificaciones',
        loading: false
      });
    }
  };

  markAsRead = async (id) => {
    try {
      await apiClient.patch(`/notifications/${id}/read`);
      this.setState(prevState => ({
        notifications: prevState.notifications.map(notif =>
          notif._id === id ? { ...notif, read: true } : notif
        )
      }));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  markAllAsRead = async () => {
    try {
      await apiClient.patch('/notifications/read-all');
      this.setState(prevState => ({
        notifications: prevState.notifications.map(notif => ({ ...notif, read: true }))
      }));
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  getFilteredNotifications = () => {
    const { notifications, filter } = this.state;
    if (filter === 'all') return notifications;
    if (filter === 'unread') return notifications.filter(n => !n.read);
    return notifications.filter(n => n.type === filter);
  };

  getNotificationIcon = (type) => {
    const icons = {
      'appointment_reminder': '📅',
      'assignment_due': '📝',
      'new_material': '📚',
      'grade_posted': '⭐',
      'progress_update': '📊',
      'system_alert': '⚠️',
      'message_received': '💬',
      'appointment_confirmed': '✅',
      'appointment_cancelled': '❌',
      'extension_approved': '⏰',
      'report_ready': '📋',
      'welcome': '👋',
      'announcement': '📢',
      'custom': 'ℹ️'
    };
    return icons[type] || 'ℹ️';
  };

  respondToNotification = async (notificationId, response) => {
    try {
      await apiClient.post(`/notifications/${notificationId}/respond`, {
        response: response
      });
      
      // Actualizar la notificación localmente
      this.setState(prevState => ({
        notifications: prevState.notifications.map(notif =>
          notif._id === notificationId 
            ? { ...notif, userResponse: response, respondedAt: new Date() }
            : notif
        )
      }));

      // Mostrar mensaje de éxito
      if (response === 'confirm') {
        alert('Solicitud de asesoría aceptada exitosamente');
      } else if (response === 'decline') {
        alert('Solicitud de asesoría rechazada');
      }

      // Refrescar notificaciones
      this.fetchNotifications();
    } catch (error) {
      console.error('Error responding to notification:', error);
      alert('Error al procesar la respuesta. Inténtalo nuevamente.');
    }
  };

  confirmAppointment = async (appointmentId, notificationId) => {
    try {
      console.log('Confirmando cita:', { appointmentId, notificationId });
      
      // Actualizar el estado de la cita a 'confirmed'
      const appointmentResponse = await apiClient.patch(`/appointments/${appointmentId}`, {
        status: 'confirmed'
      });
      console.log('Cita actualizada:', appointmentResponse.data);

      // Responder a la notificación
      const notificationResponse = await apiClient.post(`/notifications/${notificationId}/respond`, {
        response: 'confirm'
      });
      console.log('Notificación respondida:', notificationResponse.data);

      // Actualizar la notificación localmente
      this.setState(prevState => ({
        notifications: prevState.notifications.map(notif =>
          notif._id === notificationId 
            ? { ...notif, userResponse: 'confirm', respondedAt: new Date() }
            : notif
        )
      }));

      alert('Solicitud de asesoría aceptada exitosamente');
      this.fetchNotifications();
      
    } catch (error) {
      console.error('Error confirming appointment:', error);
      console.error('Error response:', error.response?.data);
      
      let errorMessage = 'Error al confirmar la cita. Inténtalo nuevamente.';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      alert(errorMessage);
    }
  };

  declineAppointment = async (appointmentId, notificationId) => {
    try {
      const reason = prompt('¿Por qué rechazas esta solicitud? (opcional)');
      
      // Actualizar el estado de la cita a 'cancelled'
      await apiClient.patch(`/appointments/${appointmentId}`, {
        status: 'cancelled',
        cancellationReason: reason || 'Rechazada por el tutor/asesor'
      });

      // Responder a la notificación con el motivo
      await apiClient.post(`/notifications/${notificationId}/respond`, {
        response: 'decline',
        data: { reason: reason }
      });

      // Actualizar la notificación localmente
      this.setState(prevState => ({
        notifications: prevState.notifications.map(notif =>
          notif._id === notificationId 
            ? { ...notif, userResponse: 'decline', respondedAt: new Date() }
            : notif
        )
      }));

      alert('Solicitud rechazada exitosamente');
      this.fetchNotifications();
      
    } catch (error) {
      console.error('Error declining appointment:', error);
      alert('Error al rechazar la cita. Inténtalo nuevamente.');
    }
  };

  formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return 'Hace unos minutos';
    } else if (diffInHours < 24) {
      return `Hace ${Math.floor(diffInHours)} horas`;
    } else {
      return date.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  render() {
    const { filter, loading, error } = this.state;
    const filteredNotifications = this.getFilteredNotifications();
    const unreadCount = this.state.notifications.filter(n => !n.read).length;

    return (
      <div className="dashboard-container">
        <TutorSidebarMenu />
        <div className="dashboard-content">
          <div className={loading ? 'notificaciones-page notificaciones-page--loading' : 'notificaciones-page'}>
            <header className="notificaciones-page__header">
              <h1 className="notificaciones-page__title">Notificaciones</h1>
              <p className="notificaciones-page__subtitle">Mantente al día con todas tus actividades y actualizaciones</p>
            </header>

            {error && (
              <div className="notificaciones-page__alert" role="alert">
                {error}
              </div>
            )}

            {loading ? (
              <>
                <div className="notificaciones-page__spinner" />
                <p>Cargando notificaciones...</p>
              </>
            ) : (
              <>
                <div className="notificaciones-page__toolbar">
                  <div className="notificaciones-page__stats">
                    <span className="notificaciones-page__unread">
                      {unreadCount} sin leer
                    </span>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        className="notificaciones-page__btn notificaciones-page__btn--secondary"
                        onClick={this.markAllAsRead}
                      >
                        Marcar todas como leídas
                      </button>
                    )}
                  </div>
                  <label className="notificaciones-page__filter-wrap">
                    <span className="notificaciones-page__filter-label">Filtrar</span>
                    <select
                      value={filter}
                      onChange={(e) => this.setState({ filter: e.target.value })}
                      className="notificaciones-page__select"
                      aria-label="Filtrar notificaciones"
                    >
                      <option value="all">Todas las notificaciones</option>
                      <option value="unread">Solo sin leer</option>
                      <option value="appointment_reminder">Recordatorios de citas</option>
                      <option value="assignment_due">Tareas por vencer</option>
                      <option value="new_material">Nuevo material</option>
                      <option value="system_alert">Alertas del sistema</option>
                    </select>
                  </label>
                </div>

                <div className="notificaciones-page__list">
                  {filteredNotifications.length > 0 ? (
                    filteredNotifications.map((notification) => (
                      <article
                        key={notification._id}
                        className={`notificaciones-page__card ${!notification.read ? 'notificaciones-page__card--unread' : ''}`}
                      >
                        <span className="notificaciones-page__card-icon" aria-hidden>
                          {this.getNotificationIcon(notification.type)}
                        </span>
                        <div className="notificaciones-page__card-content">
                          <div className="notificaciones-page__card-header">
                            <h3 className="notificaciones-page__card-title">{notification.title}</h3>
                            {(notification.priority === 'high' || notification.priority === 'medium' || notification.priority === 'low' || notification.priority === 'urgent') && (
                              <span className={`notificaciones-page__card-badge notificaciones-page__card-badge--${notification.priority || 'medium'}`}>
                                {notification.priority === 'high' && 'Alta'}
                                {notification.priority === 'medium' && 'Media'}
                                {notification.priority === 'low' && 'Baja'}
                                {notification.priority === 'urgent' && 'Urgente'}
                              </span>
                            )}
                          </div>
                          <p className="notificaciones-page__card-message">{notification.message}</p>
                          <span className="notificaciones-page__card-time">
                            {this.formatDate(notification.createdAt)}
                          </span>
                        </div>

                        <div className="notificaciones-page__card-actions">
                          {!notification.read && (
                            <button
                              type="button"
                              className="notificaciones-page__btn notificaciones-page__btn--outline"
                              onClick={() => this.markAsRead(notification._id)}
                            >
                              Marcar como leída
                            </button>
                          )}

                          {notification.type === 'appointment_reminder' &&
                           notification.relatedAppointment &&
                           !notification.userResponse && (
                            <div className="notificaciones-page__appointment-actions">
                              <button
                                type="button"
                                className="notificaciones-page__btn notificaciones-page__btn--success"
                                onClick={() => this.confirmAppointment(
                                  notification.relatedAppointment._id || notification.relatedAppointment,
                                  notification._id
                                )}
                              >
                                Aceptar solicitud
                              </button>
                              <button
                                type="button"
                                className="notificaciones-page__btn notificaciones-page__btn--danger"
                                onClick={() => this.declineAppointment(
                                  notification.relatedAppointment._id || notification.relatedAppointment,
                                  notification._id
                                )}
                              >
                                Rechazar
                              </button>
                            </div>
                          )}

                          {notification.userResponse && (
                            <div className={`notificaciones-page__response-status notificaciones-page__response-status--${notification.userResponse}`}>
                              {notification.userResponse === 'confirm' && 'Solicitud aceptada'}
                              {notification.userResponse === 'decline' && 'Solicitud rechazada'}
                            </div>
                          )}

                          {notification.actionUrl && !notification.userResponse && (
                            <button 
                              type="button" 
                              className="notificaciones-page__btn notificaciones-page__btn--outline"
                              onClick={() => {
                                this.markAsRead(notification._id);
                                window.location.href = notification.actionUrl;
                              }}
                            >
                              {notification.type === 'message_received' 
                                ? '↩️ Responder' 
                                : (notification.actionLabel || 'Ver detalles')}
                            </button>
                          )}
                        </div>
                      </article>
                    ))
                  ) : (
                    <div className="notificaciones-page__empty">
                      <span className="notificaciones-page__empty-icon" aria-hidden>🔔</span>
                      <h3>No hay notificaciones</h3>
                      <p>No tienes notificaciones con los filtros seleccionados</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }
}

export default TutorNotifications;
