import React, { useState, useEffect } from 'react';
import apiClient from '../utils/axiosConfig';
import './UserProfile.css';

const UserProfile = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('No hay token de autenticación');
        setLoading(false);
        return;
      }

      const response = await apiClient.get('/auth/profile');
      
      // El backend ahora devuelve { success: true, data: user }
      const userData = response.data.data || response.data;
      setUser(userData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setError(error.response?.data?.error || 'Error al cargar el perfil');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="user-profile-loading">
        <div className="spinner"></div>
        <p>Cargando perfil...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="user-profile-error">
        <p>{error}</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="user-profile-error">
        <p>No se pudo cargar la información del usuario</p>
      </div>
    );
  }

  // Get initials for avatar
  const getInitials = (user) => {
    if (!user) return 'U';
    const firstName = user.personalInfo?.firstName || '';
    const lastName = user.personalInfo?.lastName || '';
    if (firstName && lastName) {
      return (firstName[0] + lastName[0]).toUpperCase();
    }
    if (firstName) {
      return firstName.substring(0, 2).toUpperCase();
    }
    if (user.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return 'U';
  };

  const getFullName = (user) => {
    if (user.personalInfo?.firstName && user.personalInfo?.lastName) {
      return `${user.personalInfo.firstName} ${user.personalInfo.lastName}`;
    }
    return user.email || 'Usuario';
  };

  return (
    <div className="user-profile">
      <div className="profile-header">
        <div className="profile-avatar">
          <div className="avatar-circle">
            {getInitials(user)}
          </div>
        </div>
        <div className="profile-info">
          <h2 className="profile-name">{getFullName(user)}</h2>
          <p className="profile-email">{user.email}</p>
          {user.role && (
            <p className="profile-role">Rol: {user.role}</p>
          )}
        </div>
      </div>
      
      <div className="profile-details">
        {user.personalInfo?.firstName && (
          <div className="detail-item">
            <span className="detail-label">Nombre:</span>
            <span className="detail-value">{user.personalInfo.firstName}</span>
          </div>
        )}
        {user.personalInfo?.lastName && (
          <div className="detail-item">
            <span className="detail-label">Apellido:</span>
            <span className="detail-value">{user.personalInfo.lastName}</span>
          </div>
        )}
        <div className="detail-item">
          <span className="detail-label">Correo electrónico:</span>
          <span className="detail-value">{user.email}</span>
        </div>
        {user.role && (
          <div className="detail-item">
            <span className="detail-label">Rol:</span>
            <span className="detail-value">{user.role}</span>
          </div>
        )}
        {user.createdAt && (
          <div className="detail-item">
            <span className="detail-label">Miembro desde:</span>
            <span className="detail-value">
              {new Date(user.createdAt).toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProfile;

