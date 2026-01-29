import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../utils/axiosConfig';
import AvatarUploader from './AvatarUploader';
import './UserProfile.css';
import './Dashboard.css';

const UserProfile = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
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
      setEditForm({
        firstName: userData.personalInfo?.firstName || '',
        lastName: userData.personalInfo?.lastName || '',
        username: userData.personalInfo?.username || '',
        phone: userData.personalInfo?.phone || '',
        address: userData.personalInfo?.address || '',
        city: userData.personalInfo?.city || '',
        province: userData.personalInfo?.province || '',
        country: userData.personalInfo?.country || '',
        postalCode: userData.personalInfo?.postalCode || ''
      });
      setLoading(false);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setError(error.response?.data?.error || 'Error al cargar el perfil');
      setLoading(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const response = await apiClient.patch('/auth/profile', {
        personalInfo: editForm
      });
      
      const updatedUser = response.data.data || response.data;
      setUser(updatedUser);
      setEditMode(false);
      alert('Perfil actualizado exitosamente');
    } catch (error) {
      console.error('Error updating profile:', error);
      const errorMessage = error.response?.data?.error || 
                          error.response?.data?.message || 
                          'Error al actualizar el perfil';
      alert(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAvatarUpdate = (newAvatarUrl) => {
    setUser(prev => ({
      ...prev,
      personalInfo: {
        ...prev.personalInfo,
        avatar: newAvatarUrl
      }
    }));
    setShowAvatarModal(false);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Cargando perfil...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-icon">❌</div>
        <h3>Error al cargar el perfil</h3>
        <p>{error}</p>
        <button className="btn btn-primary" onClick={fetchUserProfile}>
          🔄 Reintentar
        </button>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="error-container">
        <div className="error-icon">👤</div>
        <h3>No se pudo cargar la información del usuario</h3>
        <button className="btn btn-primary" onClick={fetchUserProfile}>
          🔄 Reintentar
        </button>
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

  const getRoleIcon = (role) => {
    const icons = {
      student: '🎓',
      tutor: '👨‍🏫',
      advisor: '🎯',
      admin: '👑'
    };
    return icons[role] || '👤';
  };

  return (
    <div className="profile-page" style={{position: 'relative', top: '160px', left: '-130px', width: '800px'}}>
      <div className="profile-header">
        <div className="profile-avatar-section">
          <div className="profile-avatar-container">
            <div className="profile-avatar">
              <div className="avatar-circle large">
                {user.personalInfo?.avatar ? (
                  <img 
                    src={user.personalInfo.avatar} 
                    alt="Avatar" 
                    className="avatar-image"
                  />
                ) : (
                  getInitials(user)
                )}
              </div>
            </div>
            <div className="avatar-controls">
              <button 
                className="avatar-change-btn"
                onClick={() => setShowAvatarModal(true)}
                title="Cambiar foto de perfil"
              >
                📷
              </button>
            </div>
          </div>
          <div className="profile-basic-info" style={{position: 'relative', left: '80%', top: '-175px', width: '400px' }}>
            <h2 className="profile-name">{getFullName(user)}</h2>
            <p className="profile-email">📧 {user.email}</p>
            <div className="profile-role" style={{position: 'relative', top: '20px', left: '200px'}}>
              <span className={`role-badge ${user.role}`}>
                {getRoleIcon(user.role)} {getRoleLabel(user.role)}
              </span>
            </div>
            <div className="profile-member-since">
              <span>📅 Miembro desde {user.createdAt ? new Date(user.createdAt).toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              }) : 'Fecha no disponible'}</span>
            </div>
          </div>
        </div>
        
        <div className="profile-actions">
          {!editMode ? (
            <div className="profile-actions-grid">
              <button 
                className="btn btn-primary"
                onClick={() => setEditMode(true)}
                style={{position: 'relative', bottom: '-140px', right: '285px',width: '170px'}}
              >
                ✏️ Editar Perfil
              </button>
              <button 
                className="btn btn-outline" 
                onClick={() => navigate('/account/change-email')}
                style={{position: 'relative', bottom: '-140px', right: '285px',width: '170px'}}
              >
                📧 Cambiar Email
              </button>
              <button 
                className="btn btn-outline" 
                onClick={() => navigate('/account/change-password')}
                style={{position: 'relative', bottom: '-83px', left: '77px',width: '220px'}}
              >
                🔒 Cambiar Contraseña
              </button>
            </div>
          ) : (
            <div className="profile-actions-grid">
              <button 
                className="btn btn-primary"
                onClick={handleEditSubmit}
                disabled={saving}
                style={{position: 'relative', bottom: '-150px', left: '105px',width: '320px'}}
              >
                {saving ? '💾 Guardando...' : '💾 Guardar Cambios'}
              </button>
              <button 
              style={{position: 'relative', bottom: '-92px', right: '245px',width: '320px'}}
                className="btn btn-secondary"
                onClick={() => {
                  setEditMode(false);
                  setEditForm({
                    firstName: user.personalInfo?.firstName || '',
                    lastName: user.personalInfo?.lastName || '',
                    username: user.personalInfo?.username || '',
                    phone: user.personalInfo?.phone || '',
                    address: user.personalInfo?.address || '',
                    city: user.personalInfo?.city || '',
                    province: user.personalInfo?.province || '',
                    country: user.personalInfo?.country || '',
                    postalCode: user.personalInfo?.postalCode || ''
                  });
                }}
              >
                ❌ Cancelar
              </button>
            </div>
          )}
        </div>
      </div>
      
      <div className="profile-content" style={{width: '1200px',position: 'relative', left: '15%',borderRadius: '12px',padding: '20px', background: '#F8F9FA', border: '1px solid #eee'}}>
        {editMode ? (
          <form onSubmit={handleEditSubmit} className="profile-edit-form">
            <div className="form-section">
              <h3>👤 Información Personal</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>Nombre</label>
                  <input
                    type="text"
                    name="firstName"
                    value={editForm.firstName}
                    onChange={handleFormChange}
                    placeholder="Tu nombre"
                  />
                </div>
                <div className="form-group">
                  <label>Apellido</label>
                  <input
                    type="text"
                    name="lastName"
                    value={editForm.lastName}
                    onChange={handleFormChange}
                    placeholder="Tu apellido"
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Nombre de usuario</label>
                  <input
                    type="text"
                    name="username"
                    value={editForm.username}
                    onChange={handleFormChange}
                    placeholder="Tu nombre de usuario"
                  />
                </div>
                <div className="form-group">
                  <label>Teléfono</label>
                  <input
                    type="tel"
                    name="phone"
                    value={editForm.phone}
                    onChange={handleFormChange}
                    placeholder="Tu número de teléfono"
                  />
                </div>
              </div>
            </div>

            <div className="form-section">
              <h3>📍 Información de Ubicación</h3>
              <div className="form-group">
                <label>Dirección</label>
                <input
                  type="text"
                  name="address"
                  value={editForm.address}
                  onChange={handleFormChange}
                  placeholder="Tu dirección completa"
                />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Ciudad</label>
                  <input
                    type="text"
                    name="city"
                    value={editForm.city}
                    onChange={handleFormChange}
                    placeholder="Tu ciudad"
                  />
                </div>
                <div className="form-group">
                  <label>Provincia/Estado</label>
                  <input
                    type="text"
                    name="province"
                    value={editForm.province}
                    onChange={handleFormChange}
                    placeholder="Tu provincia o estado"
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>País</label>
                  <input
                    type="text"
                    name="country"
                    value={editForm.country}
                    onChange={handleFormChange}
                    placeholder="Tu país"
                  />
                </div>
                <div className="form-group">
                  <label>Código Postal</label>
                  <input
                    type="text"
                    name="postalCode"
                    value={editForm.postalCode}
                    onChange={handleFormChange}
                    placeholder="Tu código postal"
                  />
                </div>
              </div>
            </div>
          </form>
        ) : (
          <div className="profile-details" >
            <div className="details-section">
              <h3>👤 Información Personal</h3>
              <div className="details-grid">
                <div className="detail-item">
                  <span className="detail-label">Nombre:</span>
                  <span className="detail-value">{user.personalInfo?.firstName || 'No especificado'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Apellido:</span>
                  <span className="detail-value">{user.personalInfo?.lastName || 'No especificado'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Usuario:</span>
                  <span className="detail-value">{user.personalInfo?.username || 'No especificado'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Teléfono:</span>
                  <span className="detail-value">{user.personalInfo?.phone || 'No especificado'}</span>
                </div>
              </div>
            </div>

            <div className="details-section">
              <h3>📧 Información de Contacto</h3>
              <div className="details-grid">
                <div className="detail-item">
                  <span className="detail-label">Correo principal:</span>
                  <span className="detail-value">{user.email}</span>
                </div>
                {user.personalInfo?.email && user.personalInfo.email !== user.email && (
                  <div className="detail-item">
                    <span className="detail-label">Correo alterno:</span>
                    <span className="detail-value">{user.personalInfo.email}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="details-section">
              <h3>📍 Información de Ubicación</h3>
              <div className="details-grid">
                <div className="detail-item">
                  <span className="detail-label">Dirección:</span>
                  <span className="detail-value">{user.personalInfo?.address || 'No especificada'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Ciudad:</span>
                  <span className="detail-value">{user.personalInfo?.city || 'No especificada'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Provincia:</span>
                  <span className="detail-value">{user.personalInfo?.province || 'No especificada'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">País:</span>
                  <span className="detail-value">{user.personalInfo?.country || 'No especificado'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Código Postal:</span>
                  <span className="detail-value">{user.personalInfo?.postalCode || 'No especificado'}</span>
                </div>
              </div>
            </div>

            <div className="details-section">
              <h3>🔐 Información de Cuenta</h3>
              <div className="details-grid">
                <div className="detail-item">
                  <span className="detail-label">Rol:</span>
                  <span className="detail-value">
                    <span className={`role-badge ${user.role}`}>
                      {getRoleIcon(user.role)} {getRoleLabel(user.role)}
                    </span>
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Estado de la cuenta:</span>
                  <span className="detail-value">
                    <span className="status-badge active">✅ Activa</span>
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Última actualización:</span>
                  <span className="detail-value">
                    {user.updatedAt ? new Date(user.updatedAt).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    }) : 'No disponible'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal para cambiar avatar */}
      {showAvatarModal && (
        <div className="modal-overlay" onClick={() => setShowAvatarModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📷 Cambiar Foto de Perfil</h3>
              <button 
                className="modal-close-btn"
                onClick={() => setShowAvatarModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <AvatarUploader 
                onAvatarUpdate={handleAvatarUpdate}
                currentAvatar={user.personalInfo?.avatar}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfile;

