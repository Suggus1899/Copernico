import type { ApiResponse } from '../types/api';
import type { Notification } from '../types/communication';
import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../utils/axiosConfig';
import { getApiErrorMessage } from '../utils/apiError';
import './Dashboard.css';
import './TutorNotifications.css';
interface TutorNotificationsState {
  notifications: Notification[]; loading: boolean; error: string | null; filter: string;
  feedback: string | null; decliningNotificationId: string | null; declineReason: string; actionPending: boolean;
}

class TutorNotifications extends Component<Record<string, never>, TutorNotificationsState> {
  state: TutorNotificationsState = {
    notifications: [],
    loading: true,
    error: null,
    filter: 'all',
    feedback: null,
    decliningNotificationId: null,
    declineReason: '',
    actionPending: false
  };

  notificationInterval: ReturnType<typeof setInterval> | undefined;

  componentDidMount() {
    this.fetchNotifications();
    this.notificationInterval = setInterval(() => {
      this.fetchNotifications(false);
    }, 30000);
  }

  componentWillUnmount() {
    if (this.notificationInterval) {
      clearInterval(this.notificationInterval);
    }
  }

  fetchNotifications = async (showLoading = true) => {
    try {
      this.setState({ loading: showLoading, error: null });
      const response = await apiClient.get<ApiResponse<Notification[]>>('/notifications');
      this.setState({
        notifications: response.data.data || [],
        loading: false
      });
    } catch (error) {
      console.error('Error fetching notifications:', error);
      this.setState({
        error: getApiErrorMessage(error, 'Error al cargar las notificaciones.'),
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
        ),
        feedback: 'Notificación marcada como leída.'
      }));
    } catch (error) {
      console.error('Error marking notification as read:', error);
      this.setState({ feedback: getApiErrorMessage(error, 'No se pudo actualizar la notificación.') });
    }
  };

  markAllAsRead = async () => {
    try {
      await apiClient.patch('/notifications/read-all');
      this.setState(prevState => ({
        notifications: prevState.notifications.map(notif => ({ ...notif, read: true })),
        feedback: 'Todas las notificaciones están marcadas como leídas.'
      }));
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      this.setState({ feedback: getApiErrorMessage(error, 'No se pudieron actualizar las notificaciones.') });
    }
  };

  getFilteredNotifications = () => {
    const { notifications, filter } = this.state;
    if (filter === 'all') return notifications;
    if (filter === 'unread') return notifications.filter(n => !n.read);
    return notifications.filter(n => n.type === filter);
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
    this.setState({ actionPending: true, feedback: null });
    try {
      await apiClient.post(`/appointments/${appointmentId}/confirm`, {});
    } catch (error) {
      this.setState({ actionPending: false, feedback: getApiErrorMessage(error, 'Error al confirmar la cita. Inténtalo nuevamente.') });
      return;
    }

    await this.recordNotificationChoice(notificationId, 'confirm');
    this.setState({ actionPending: false, feedback: 'Solicitud de asesoría aceptada.' });
    this.fetchNotifications(false);
  };

  declineAppointment = async (appointment: Notification['relatedAppointment'], notificationId: string) => {
    const appointmentId = typeof appointment === 'string' ? appointment : appointment?._id;
    if (!appointmentId) return;
    const trimmedReason = this.state.declineReason.trim();
    this.setState({ actionPending: true, feedback: null });
    try {
      await apiClient.post(
        `/appointments/${appointmentId}/reject`,
        trimmedReason ? { reason: trimmedReason } : {}
      );
    } catch (error) {
      this.setState({ actionPending: false, feedback: getApiErrorMessage(error, 'Error al rechazar la cita. Inténtalo nuevamente.') });
      return;
    }

    await this.recordNotificationChoice(notificationId, 'decline');
    this.setState({
      actionPending: false,
      declineReason: '',
      decliningNotificationId: null,
      feedback: 'Solicitud rechazada.'
    });
    this.fetchNotifications(false);
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
    const { filter, loading, error, feedback, decliningNotificationId, declineReason, actionPending } = this.state;
    const filteredNotifications = this.getFilteredNotifications();
    const unreadCount = this.state.notifications.filter(n => !n.read).length;
    const getActionLabel = (notification: Notification) =>
      notification.type === 'message_received' ? 'Responder' : notification.actionLabel || 'Ver detalles';

    return (
      <div className={loading ? 'notificaciones-page notificaciones-page--loading' : 'notificaciones-page'}>
            <header className="notificaciones-page__header">
              <h1 className="notificaciones-page__title">Notificaciones</h1>
              <p className="notificaciones-page__subtitle">Mantente al día con todas tus actividades y actualizaciones</p>
            </header>

            {error && (
              <div className="notificaciones-page__alert" role="alert">
                {error}
                <button type="button" onClick={() => this.fetchNotifications()}>Reintentar</button>
              </div>
            )}
            {feedback && <p className="notificaciones-page__feedback" role="status">{feedback}</p>}

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
                              {decliningNotificationId === notification._id ? (
                                <form
                                  className="notificaciones-page__decline-form"
                                  onSubmit={(event) => {
                                    event.preventDefault();
                                    this.declineAppointment(notification.relatedAppointment, notification._id);
                                  }}
                                >
                                  <label htmlFor={`decline-reason-${notification._id}`}>Motivo del rechazo (opcional)</label>
                                  <textarea
                                    id={`decline-reason-${notification._id}`}
                                    value={declineReason}
                                    onChange={(event) => this.setState({ declineReason: event.target.value })}
                                    rows={3}
                                  />
                                  <button type="submit" className="notificaciones-page__btn notificaciones-page__btn--danger" disabled={actionPending}>
                                    {actionPending ? 'Enviando…' : 'Confirmar rechazo'}
                                  </button>
                                  <button type="button" className="notificaciones-page__btn notificaciones-page__btn--outline" onClick={() => this.setState({ decliningNotificationId: null, declineReason: '' })} disabled={actionPending}>
                                    Cancelar
                                  </button>
                                </form>
                              ) : (
                                <>
                              <button
                                type="button"
                                className="notificaciones-page__btn notificaciones-page__btn--success"
                                onClick={() => this.confirmAppointment(
                                  notification.relatedAppointment,
                                  notification._id
                                )}
                                disabled={actionPending}
                              >
                                Aceptar solicitud
                              </button>
                              <button
                                type="button"
                                className="notificaciones-page__btn notificaciones-page__btn--danger"
                                onClick={() => this.setState({ decliningNotificationId: notification._id, declineReason: '' })}
                                disabled={actionPending}
                              >
                                Rechazar
                              </button>
                                </>
                              )}
                            </div>
                          )}

                          {notification.userResponse && (
                            <div className={`notificaciones-page__response-status notificaciones-page__response-status--${notification.userResponse}`}>
                              {notification.userResponse === 'confirm' && 'Solicitud aceptada'}
                              {notification.userResponse === 'decline' && 'Solicitud rechazada'}
                            </div>
                          )}

                          {notification.actionUrl && !notification.userResponse && (
                            notification.actionUrl.startsWith('/') && !notification.actionUrl.startsWith('//') ? (
                              <Link
                                className="notificaciones-page__btn notificaciones-page__btn--outline"
                                to={notification.actionUrl}
                                onClick={() => this.markAsRead(notification._id)}
                              >
                                {getActionLabel(notification)}
                              </Link>
                            ) : (
                              <a
                                className="notificaciones-page__btn notificaciones-page__btn--outline"
                                href={notification.actionUrl}
                                onClick={() => this.markAsRead(notification._id)}
                              >
                                {getActionLabel(notification)}
                              </a>
                            )
                          )}
                        </div>
                      </article>
                    ))
                  ) : error ? null : (
                    <div className="notificaciones-page__empty">
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
