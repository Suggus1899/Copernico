import type { User, PersonalInfo } from '../types/auth';
import type { ApiResponse } from '../types/api';
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../utils/axiosConfig';
import AvatarUploader from './AvatarUploader';
import DocumentManager from './DocumentManager';
import DeactivateAccount from './DeactivateAccount';
import { getApiErrorMessage } from '../utils/apiError';
import './UserProfile.css';
import './ProfileRefresh.css';
const UserProfile = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState<PersonalInfo>({});
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const avatarDialog = useRef<HTMLDialogElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUserProfile();
  }, []);

  useEffect(() => { if (showAvatarModal) avatarDialog.current?.showModal(); }, [showAvatarModal]);

  const fetchUserProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get<ApiResponse<User>>('/auth/profile');
      const userData = response.data.data;
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
      setError(getApiErrorMessage(error, 'Error al cargar el perfil'));
      setLoading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement> | React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      const response = await apiClient.patch<ApiResponse<User>>('/auth/profile', {
        personalInfo: editForm
      });
      
      const updatedUser = response.data.data;
      setUser(updatedUser);
      setEditMode(false);
      setFeedback({ kind: 'success', text: 'Perfil actualizado correctamente.' });
    } catch (error) {
      console.error('Error updating profile:', error);
      setFeedback({ kind: 'error', text: getApiErrorMessage(error, 'No se pudo actualizar el perfil.') });
    } finally {
      setSaving(false);
    }
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAvatarUpdate = (newAvatarUrl: string | null) => {
    setUser(prev => prev ? ({
      ...prev,
      personalInfo: {
        ...prev.personalInfo,
        avatar: newAvatarUrl
      }
    }) : prev);
    setShowAvatarModal(false);
  };

  const getInitials = (user: User | null) => {
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

  const getRoleLabel = (role: string | undefined) => {
    const map: Record<string, string> = {
      student: 'Estudiante',
      tutor: 'Tutor',
      advisor: 'Asesor',
      admin: 'Administrador'
    };
    return map[role || ''] || role;
  };

  const getFullName = (user: User | null) => {
    if (user?.personalInfo?.firstName && user.personalInfo?.lastName) {
      return `${user.personalInfo.firstName} ${user.personalInfo.lastName}`;
    }
    return user?.email || 'Usuario';
  };

  if (loading) {
    return (
      <div className="profile-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Cargando perfil...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="profile-page">
        <div className="error-container">
          <h3>Error al cargar el perfil</h3>
          <p>{error}</p>
          <button className="profile-btn profile-btn-primary" onClick={fetchUserProfile}>
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="profile-page">
        <div className="error-container">
          <h3>No se pudo cargar la información del usuario</h3>
          <button className="profile-btn profile-btn-primary" onClick={fetchUserProfile}>
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      {/* Header con información básica */}
      <div className="profile-header-card">
        <div className="profile-header-content">
          <div className="profile-avatar-section">
            <div className="profile-avatar-wrapper">
              {user.personalInfo?.avatar ? (
                <img 
                  src={user.personalInfo.avatar} 
                  alt="Avatar" 
                  className="profile-avatar-img"
                />
              ) : (
                <div className="profile-avatar-placeholder">
                  {getInitials(user)}
                </div>
              )}
              <button 
                type="button"
                className="profile-avatar-edit-btn"
                onClick={() => setShowAvatarModal(true)}
                title="Cambiar foto de perfil"
                aria-label="Cambiar foto de perfil"
              >
                +
              </button>
            </div>
          </div>

          <div className="profile-header-info">
            <h1 className="profile-name">{getFullName(user)}</h1>
            <p className="profile-email">{user.email}</p>
            <div className="profile-badges">
              <span className={`profile-role-badge profile-role-${user.role}`}>
                {getRoleLabel(user.role)}
              </span>
              <span className="profile-member-badge">
                  Miembro desde {user.createdAt ? new Date(user.createdAt).toLocaleDateString('es-ES', {
                  year: 'numeric',
                  month: 'long'
                }) : 'Fecha no disponible'}
              </span>
            </div>
          </div>

          <div className="profile-header-actions">
            {!editMode ? (
              <>
                <button 
                  className="profile-btn profile-btn-primary"
                  onClick={() => setEditMode(true)}
                >
                  Editar perfil
                </button>
                <button
                  className="profile-btn profile-btn-outline"
                  onClick={() => navigate('/account/change-email')}
                >
                  Cambiar correo
                </button>
                <button 
                  className="profile-btn profile-btn-outline"
                  onClick={() => navigate('/account/change-password')}
                >
                  Cambiar contraseña
                </button>
              </>
            ) : (
              <>
                <button 
                  className="profile-btn profile-btn-success"
                  onClick={handleEditSubmit}
                  disabled={saving}
                >
                  {saving ? 'Guardando…' : 'Guardar cambios'}
                </button>
                <button 
                  className="profile-btn profile-btn-secondary"
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
                  Cancelar
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {feedback && <p className={`profile-feedback profile-feedback--${feedback.kind}`} role={feedback.kind === 'error' ? 'alert' : 'status'}>{feedback.text}</p>}

      {/* Contenido del perfil */}
      <div className="profile-content-grid">
        {editMode ? (
          <form onSubmit={handleEditSubmit} className="profile-edit-form">
            {/* Información Personal */}
            <div className="profile-card">
              <div className="profile-card-header">
                <h3>Información personal</h3>
              </div>
              <div className="profile-card-body">
                <div className="profile-form-row">
                  <div className="profile-form-group">
                    <label htmlFor="profile-first-name">Nombre</label>
                    <input
                      id="profile-first-name"
                      type="text"
                      name="firstName"
                      value={editForm.firstName}
                      onChange={handleFormChange}
                      placeholder="Tu nombre"
                      className="profile-input"
                    />
                  </div>
                  <div className="profile-form-group">
                    <label htmlFor="profile-last-name">Apellido</label>
                    <input
                      id="profile-last-name"
                      type="text"
                      name="lastName"
                      value={editForm.lastName}
                      onChange={handleFormChange}
                      placeholder="Tu apellido"
                      className="profile-input"
                    />
                  </div>
                </div>
                
                <div className="profile-form-row">
                  <div className="profile-form-group">
                    <label htmlFor="profile-username">Nombre de usuario</label>
                    <input
                      id="profile-username"
                      type="text"
                      name="username"
                      value={editForm.username}
                      onChange={handleFormChange}
                      placeholder="Tu nombre de usuario"
                      className="profile-input"
                    />
                  </div>
                  <div className="profile-form-group">
                    <label htmlFor="profile-phone">Teléfono</label>
                    <input
                      id="profile-phone"
                      type="tel"
                      name="phone"
                      value={editForm.phone}
                      onChange={handleFormChange}
                      placeholder="Tu número de teléfono"
                      className="profile-input"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Información de Ubicación */}
            <div className="profile-card">
              <div className="profile-card-header">
                    <h3>Información de ubicación</h3>
              </div>
              <div className="profile-card-body">
                <div className="profile-form-group">
                  <label htmlFor="profile-address">Dirección</label>
                  <input
                    id="profile-address"
                    type="text"
                    name="address"
                    value={editForm.address}
                    onChange={handleFormChange}
                    placeholder="Tu dirección completa"
                    className="profile-input"
                  />
                </div>
                
                <div className="profile-form-row">
                  <div className="profile-form-group">
                    <label htmlFor="profile-city">Ciudad</label>
                    <input
                      id="profile-city"
                      type="text"
                      name="city"
                      value={editForm.city}
                      onChange={handleFormChange}
                      placeholder="Tu ciudad"
                      className="profile-input"
                    />
                  </div>
                  <div className="profile-form-group">
                    <label htmlFor="profile-province">Provincia o estado</label>
                    <input
                      id="profile-province"
                      type="text"
                      name="province"
                      value={editForm.province}
                      onChange={handleFormChange}
                      placeholder="Tu provincia o estado"
                      className="profile-input"
                    />
                  </div>
                </div>
                
                <div className="profile-form-row">
                  <div className="profile-form-group">
                    <label htmlFor="profile-country">País</label>
                    <input
                      id="profile-country"
                      type="text"
                      name="country"
                      value={editForm.country}
                      onChange={handleFormChange}
                      placeholder="Tu país"
                      className="profile-input"
                    />
                  </div>
                  <div className="profile-form-group">
                    <label htmlFor="profile-postal-code">Código postal</label>
                    <input
                      id="profile-postal-code"
                      type="text"
                      name="postalCode"
                      value={editForm.postalCode}
                      onChange={handleFormChange}
                      placeholder="Tu código postal"
                      className="profile-input"
                    />
                  </div>
                </div>
              </div>
            </div>
          </form>
        ) : (
          <>
            {/* Información Personal */}
            <div className="profile-card">
              <div className="profile-card-header">
                <h3>Información personal</h3>
              </div>
              <div className="profile-card-body">
                <div className="profile-detail-item">
                  <span className="profile-detail-label">Nombre:</span>
                  <span className="profile-detail-value">{user.personalInfo?.firstName || 'No especificado'}</span>
                </div>
                <div className="profile-detail-item">
                  <span className="profile-detail-label">Apellido:</span>
                  <span className="profile-detail-value">{user.personalInfo?.lastName || 'No especificado'}</span>
                </div>
                <div className="profile-detail-item">
                  <span className="profile-detail-label">Usuario:</span>
                  <span className="profile-detail-value">{user.personalInfo?.username || 'No especificado'}</span>
                </div>
                <div className="profile-detail-item">
                  <span className="profile-detail-label">Teléfono:</span>
                  <span className="profile-detail-value">{user.personalInfo?.phone || 'No especificado'}</span>
                </div>
              </div>
            </div>

            {/* Información de Ubicación */}
            <div className="profile-card">
              <div className="profile-card-header">
                    <h3>Información de ubicación</h3>
              </div>
              <div className="profile-card-body">
                <div className="profile-detail-item">
                  <span className="profile-detail-label">Dirección:</span>
                  <span className="profile-detail-value">{user.personalInfo?.address || 'No especificada'}</span>
                </div>
                <div className="profile-detail-item">
                  <span className="profile-detail-label">Ciudad:</span>
                  <span className="profile-detail-value">{user.personalInfo?.city || 'No especificada'}</span>
                </div>
                <div className="profile-detail-item">
                  <span className="profile-detail-label">Provincia:</span>
                  <span className="profile-detail-value">{user.personalInfo?.province || 'No especificada'}</span>
                </div>
                <div className="profile-detail-item">
                  <span className="profile-detail-label">País:</span>
                  <span className="profile-detail-value">{user.personalInfo?.country || 'No especificado'}</span>
                </div>
                <div className="profile-detail-item">
                  <span className="profile-detail-label">Código Postal:</span>
                  <span className="profile-detail-value">{user.personalInfo?.postalCode || 'No especificado'}</span>
                </div>
              </div>
            </div>

            {/* Información de Cuenta */}
            <div className="profile-card">
              <div className="profile-card-header">
                <h3>Información de cuenta</h3>
              </div>
              <div className="profile-card-body">
                <div className="profile-detail-item">
                  <span className="profile-detail-label">Correo electrónico:</span>
                  <span className="profile-detail-value">{user.email}</span>
                </div>
                <div className="profile-detail-item">
                  <span className="profile-detail-label">Rol:</span>
                  <span className="profile-detail-value">
                    <span className={`profile-role-badge profile-role-${user.role}`}>
                      {getRoleLabel(user.role)}
                    </span>
                  </span>
                </div>
                <div className="profile-detail-item">
                  <span className="profile-detail-label">Estado:</span>
                  <span className="profile-detail-value">
                    <span className="profile-status-badge profile-status-active">Activa</span>
                  </span>
                </div>
                <div className="profile-detail-item">
                  <span className="profile-detail-label">Última actualización:</span>
                  <span className="profile-detail-value">
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
          </>
        )}
      </div>

      {/* Documentos y cierre de cuenta */}
      <div className="profile-content-grid">
        <div className="profile-card">
          <div className="profile-card-body">
            <DocumentManager />
          </div>
        </div>
        <div className="profile-card">
          <div className="profile-card-body">
            <DeactivateAccount />
          </div>
        </div>
      </div>

      {/* Modal para cambiar avatar */}
      {showAvatarModal && (
        <dialog ref={avatarDialog} className="profile-modal-content" aria-labelledby="avatar-dialog-title" onCancel={() => setShowAvatarModal(false)} onClick={(event) => { if (event.target === event.currentTarget) setShowAvatarModal(false); }}>
            <div className="profile-modal-header">
              <h3 id="avatar-dialog-title">Cambiar foto de perfil</h3>
              <button 
                type="button"
                className="profile-modal-close-btn"
                onClick={() => setShowAvatarModal(false)}
                aria-label="Cerrar"
                autoFocus
              >
                ✕
              </button>
            </div>
            <div className="profile-modal-body">
              <AvatarUploader 
                onAvatarUpdate={handleAvatarUpdate}
                currentAvatar={user.personalInfo?.avatar}
              />
            </div>
        </dialog>
      )}
    </div>
  );
};

export default UserProfile;
