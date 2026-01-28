import React, { useState, useEffect } from 'react';
import apiClient from '../utils/axiosConfig';
import './NotificationToast.css';

const NotificationToast = ({ userRole }) => {
  const [notifications, setNotifications] = useState([]);
  const [showToast, setShowToast] = useState(false);
  const [lastNotificationId, setLastNotificationId] = useState(null);

  useEffect(() => {
    // Solo mostrar para tutores y asesores
    if (!['tutor', 'advisor'].includes(userRole)) {
      return;
    }

    fetchLatestNotifications();
    
    // Verificar nuevas notificaciones cada 15 segundos
    const interval = setInterval(fetchLatestNotifications, 15000);
    
    return () => clearInterval(interval);
  }, [userRole]);

  const fetchLatestNotifications = async () => {
    try {
      console.log('🔔 Fetching notifications for role:', userRole);
      const response = await apiClient.get('/notifications', {
        params: { 
          read: false, 
          limit: 5
        }
      });
      
      const newNotifications = response.data.data || [];
      console.log('🔔 Notifications received:', newNotifications.length);
      
      // Verificar si hay nuevas notificaciones
      if (newNotifications.length > 0) {
        const latestNotification = newNotifications[0];
        console.log('🔔 Latest notification ID:', latestNotification._id);
        console.log('🔔 Last shown notification ID:', lastNotificationId);
        
        // Si hay una nueva notificación que no hemos mostrado
        if (latestNotification._id !== lastNotificationId) {
          console.log('🔔 Showing new notifications toast');
          setNotifications(newNotifications);
          setShowToast(true);
          setLastNotificationId(latestNotification._id);
          
          // Auto-ocultar después de 10 segundos
          setTimeout(() => {
            setShowToast(false);
          }, 10000);
        } else {
          console.log('🔔 No new notifications to show');
        }
      } else {
        console.log('🔔 No unread notifications found');
      }
    } catch (error) {
      console.error('🔔 Error fetching notifications:', error);
    }
  };

  const handleNotificationClick = (notification) => {
    // Marcar como leída
    markAsRead(notification._id);
    
    // Redirigir a notificaciones
    window.location.href = '/dashboard/notificaciones';
  };

  const markAsRead = async (notificationId) => {
    try {
      await apiClient.patch(`/notifications/${notificationId}/read`);
      
      // Actualizar estado local
      setNotifications(prev => 
        prev.map(notif => 
          notif._id === notificationId 
            ? { ...notif, read: true }
            : notif
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const closeToast = () => {
    setShowToast(false);
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Ahora mismo';
    if (diffInMinutes < 60) return `Hace ${diffInMinutes} min`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `Hace ${diffInHours}h`;
    
    return date.toLocaleDateString('es-ES');
  };

  if (!showToast || notifications.length === 0) {
    return null;
  }

  return (
    <div className="notification-toast-container">
      <div className="notification-toast">
        <div className="toast-header">
          <div className="toast-title">
            <span className="toast-icon">🔔</span>
            <h4>Nuevas Solicitudes</h4>
          </div>
          <button className="toast-close" onClick={closeToast}>
            ✕
          </button>
        </div>
        
        <div className="toast-content">
          {notifications.slice(0, 3).map((notification) => (
            <div 
              key={notification._id}
              className="toast-notification"
              onClick={() => handleNotificationClick(notification)}
            >
              <div className="toast-notification-icon">
                📅
              </div>
              <div className="toast-notification-content">
                <h5>{notification.title}</h5>
                <p>{notification.message.substring(0, 80)}...</p>
                <span className="toast-time">
                  {formatTimeAgo(notification.createdAt)}
                </span>
              </div>
            </div>
          ))}
          
          {notifications.length > 3 && (
            <div className="toast-more">
              <button 
                className="toast-view-all"
                onClick={() => window.location.href = '/dashboard/notificaciones'}
              >
                Ver todas las notificaciones ({notifications.length})
              </button>
            </div>
          )}
        </div>
        
        <div className="toast-actions">
          <button 
            className="btn-primary small"
            onClick={() => window.location.href = '/dashboard/notificaciones'}
          >
            Ver Todas
          </button>
          <button 
            className="btn-secondary small"
            onClick={closeToast}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationToast;