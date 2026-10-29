import axios from 'axios';
import type { ApiResponse } from '../types/api';
import type { Notification } from '../types/communication';
import React, { Component } from 'react';
import apiClient from '../utils/axiosConfig';
import { getApiErrorMessage } from '../utils/apiError';
import './Dashboard.css';
import './TutorNotifications.css';
interface TutorNotificationsState { notifications: Notification[]; loading: boolean; error: string | null; filter: string }

class TutorNotifications extends Component<Record<string, never>, TutorNotificationsState> {
  state: TutorNotificationsState = {
    notifications: [],
    loading: true,
    error: null,
    filter: 'all'
  };

  notificationInterval: ReturnType<typeof setInterval> | undefined;

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
      
      const response = await apiClient.get<ApiResponse<Notification[]>>('/notifications');
      console.log('Notificaciones obtenidas:', response.data.data?.length || 0);
      console.log('Datos de notificaciones:', response.data.data);
      
      this.setState({
        notifications: response.data.data || [],
        loading: false
      });
    } catch (error) {
      console.error('Error fetching notifications:', error);
      console.error('Error response:', axios.isAxiosError(error) ? error.response?.data : undefined);
      
      this.setState({
        error: 'Error al cargar las notificaciones',
        loading: false
      });
    }
  };

  markAsRead = async (id: string) => {
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

  getNotificationIcon = (type: string) => {
    const icons: Record<string, string> = {
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

  respondToNotification = async (notificationId: string, response: string) => {
    try {
      await apiClient.post(`/notifications/${notificationId}/respond`, {
        response: response
      });
      
      // Actualizar la notificación localmente
      this.setState(prevState => ({
        notifications: prevState.notifications.map(notif =>
          notif._id === notificationId 
            ? { ...notif, userResponse: response, respondedAt: new Date().toISOString() }
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

  // Registra la elección en la notificación. La cita ya cambió de estado en /appointments,
  // así que un fallo aquí no se trata como fallo de la acción.
  recordNotificationChoice = async (notificationId: string, choice: string) => {
    try {
      await apiClient.post(`/notifications/${notificationId}/respond`, { response: choice });
      this.setState(prevState => ({
        notifications: prevState.notifications.map(notif =>
          notif._id === notificationId
            ? { ...notif, userResponse: choice, respondedAt: new Date().toISOString() }
            : notif
        )
      }));
    } catch (error) {
      console.error('Error recording notification response:', error);
    }
  };

  confirmAppointment = async (appointment: Notification['relatedAppointment'], notificationId: string) => {
    const appointmentId = typeof appointment === 'string' ? appointment : appointment?._id;
    if (!appointmentId) return;
    try {
      await apiClient.post(`/appointments/${appointmentId}/confirm`, {});
    } catch (error) {
      alert(getApiErrorMessage(error, 'Error al confirmar la cita. Inténtalo nuevamente.'));
      return;
    }

    await this.recordNotificationChoice(notificationId, 'confirm');
    alert('Solicitud de asesoría aceptada exitosamente');
    this.fetchNotifications();
  };

  declineAppointment = async (appointment: Notification['relatedAppointment'], notificationId: string) => {
    const appointmentId = typeof appointment === 'string' ? appointment : appointment?._id;
    if (!appointmentId) return;
    const reason = prompt('¿Por qué rechazas esta solicitud? (opcional)');
    if (reason === null) return;

    const trimmedReason = reason.trim();
    try {
      await apiClient.post(
        `/appointments/${appointmentId}/reject`,
        trimmedReason ? { reason: trimmedReason } : {}
      );
    } catch (error) {
      alert(getApiErrorMessage(error, 'Error al rechazar la cita. Inténtalo nuevamente.'));
      return;
    }

    await this.recordNotificationChoice(notificationId, 'decline');
    alert('Solicitud rechazada exitosamente');
    this.fetchNotifications();
  };

  formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
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
                                  notification.relatedAppointment,
                                  notification._id
                                )}
                              >
                                Aceptar solicitud
                              </button>
                              <button
                                type="button"
                                className="notificaciones-page__btn notificaciones-page__btn--danger"
                                onClick={() => this.declineAppointment(
                                  notification.relatedAppointment,
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
                                if (notification.actionUrl) window.location.href = notification.actionUrl;
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
    );
  }
}

export default TutorNotifications;
