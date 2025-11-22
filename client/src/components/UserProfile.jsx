import React, { useState, useEffect } from 'react';
import axios from 'axios';
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

      const response = await axios.get('http://localhost:4000/api/auth/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      setUser(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setError('Error al cargar el perfil');
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
  const getInitials = (name) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length >= 2) {
      return (names[0][0] + names[names.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className="user-profile">
      <div className="profile-header">
        <div className="profile-avatar">
          <div className="avatar-circle">
            {getInitials(user.fullname)}
          </div>
        </div>
        <div className="profile-info">
          <h2 className="profile-name">{user.fullname}</h2>
          <p className="profile-email">{user.email}</p>
        </div>
      </div>
      
      <div className="profile-details">
        <div className="detail-item">
          <span className="detail-label">Nombre completo:</span>
          <span className="detail-value">{user.fullname}</span>
        </div>
        <div className="detail-item">
          <span className="detail-label">Correo electrónico:</span>
          <span className="detail-value">{user.email}</span>
        </div>
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

