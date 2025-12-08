import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../utils/axiosConfig';
import './UserProfile.css';
import SidebarMenu from './SidebarMenu';
import './Dashboard.css';

const UserProfile = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

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

  const getRoleLabel = (role) => {
    const map = {
      student: 'Estudiante',
      tutor: 'Tutor',
      advisor: 'Asesor',
      admin: 'Administrador'
    };
    return map[role] || role;
  };

  const getFullName = (user) => {
    if (user.personalInfo?.firstName && user.personalInfo?.lastName) {
      return `${user.personalInfo.firstName} ${user.personalInfo.lastName}`;
    }
    return user.email || 'Usuario';
  };

  return (
    <div className="dashboard-container">
      <SidebarMenu />
      <div className="dashboard-content">
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
            <p className="profile-role">Rol: {getRoleLabel(user.role)}</p>
          )}
          <div className="profile-actions">
            <button className="btn btn-outline-primary" onClick={() => navigate('/account/change-email')}>Cambiar dirección de correo electrónico</button>
            <button className="btn btn-outline-secondary" onClick={() => navigate('/account/change-password')}>Cambiar contraseña</button>
          </div>
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
        {user.personalInfo?.username && (
          <div className="detail-item">
            <span className="detail-label">Usuario:</span>
            <span className="detail-value">{user.personalInfo.username}</span>
          </div>
        )}
        <div className="detail-item">
          <span className="detail-label">Correo electrónico:</span>
          <span className="detail-value">{user.email}</span>
        </div>
        {user.personalInfo?.email && (
          <div className="detail-item">
            <span className="detail-label">Correo alterno:</span>
            <span className="detail-value">{user.personalInfo.email}</span>
          </div>
        )}
        {user.personalInfo?.address && (
          <div className="detail-item">
            <span className="detail-label">Dirección:</span>
            <span className="detail-value">{user.personalInfo.address}</span>
          </div>
        )}
        {user.personalInfo?.city && (
          <div className="detail-item">
            <span className="detail-label">Ciudad:</span>
            <span className="detail-value">{user.personalInfo.city}</span>
          </div>
        )}
        {user.personalInfo?.province && (
          <div className="detail-item">
            <span className="detail-label">Provincia:</span>
            <span className="detail-value">{user.personalInfo.province}</span>
          </div>
        )}
        {user.personalInfo?.country && (
          <div className="detail-item">
            <span className="detail-label">País:</span>
            <span className="detail-value">{user.personalInfo.country}</span>
          </div>
        )}
        {user.personalInfo?.postalCode && (
          <div className="detail-item">
            <span className="detail-label">Código Postal:</span>
            <span className="detail-value">{user.personalInfo.postalCode}</span>
          </div>
        )}
        {user.personalInfo?.phone && (
          <div className="detail-item">
            <span className="detail-label">Teléfono:</span>
            <span className="detail-value">{user.personalInfo.phone}</span>
          </div>
        )}
        {user.role && (
          <div className="detail-item">
            <span className="detail-label">Rol:</span>
            <span className="detail-value">{getRoleLabel(user.role)}</span>
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
      </div>
    </div>
  );
};

export default UserProfile;

