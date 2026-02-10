import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import TutorSidebarMenu from './TutorSidebarMenu';
import apiClient from '../utils/axiosConfig';
import AvatarUploader from './AvatarUploader';
import './UserProfile.css';
import './Dashboard.css';

const TutorProfile = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [stats, setStats] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUserProfile();
    fetchUserStats();
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
        specialty: userData.personalInfo?.specialty || '',
        degrees: userData.personalInfo?.degrees || '',
        experience: userData.personalInfo?.experience || '',
        certifications: userData.personalInfo?.certifications || '',
        bio: userData.personalInfo?.bio || ''
      });
      setLoading(false);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setError(error.response?.data?.error || 'Error al cargar el perfil');
      setLoading(false);
    }
  };

  const fetchUserStats = async () => {
    try {
      // Obtener estadísticas del tutor/asesor
      const appointmentsResponse = await apiClient.get('/appointments');
      const appointments = appointmentsResponse.data.data || [];
      
      const confirmedAppointments = appointments.filter(apt => 
        ['confirmed', 'completed'].includes(apt.status)
      );
      
      const completedAppointments = appointments.filter(apt => apt.status === 'completed');
      const upcomingAppointments = appointments.filter(apt => 
        apt.status === 'confirmed' && new Date(apt.scheduledDate) > new Date()
      );
      
      // Estudiantes únicos
      const uniqueStudents = new Set();
      confirmedAppointments.forEach(apt => {
        if (apt.studentId?._id) {
          uniqueStudents.add(apt.studentId._id);
        }
      });
      
      // Materias únicas
      const uniqueSubjects = new Set();
      confirmedAppointments.forEach(apt => {
        if (apt.subject) {
          uniqueSubjects.add(apt.subject);
        }
      });
      
      setStats({
        totalSessions: confirmedAppointments.length,
        completedSessions: completedAppointments.length,
        upcomingSessions: upcomingAppointments.length,
        totalStudents: uniqueStudents.size,
        subjects: Array.from(uniqueSubjects),
        joinDate: null // Se calculará desde user.createdAt
      });
    } catch (error) {
      console.error('Error fetching user stats:', error);
      // No es crítico, continúa sin estadísticas
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
      <div className="dashboard-container">
        <TutorSidebarMenu userRole={user?.role} />
        <div className="dashboard-content">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Cargando perfil...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-container">
        <TutorSidebarMenu userRole={user?.role} />
        <div className="dashboard-content">
          <div className="error-container">
            <div className="error-icon">❌</div>
            <h3>Error al cargar el perfil</h3>
            <p>{error}</p>
            <button className="btn btn-primary" onClick={fetchUserProfile}>
              🔄 Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="dashboard-container">
        <TutorSidebarMenu userRole={user?.role} />
        <div className="dashboard-content">
          <div className="error-container">
            <div className="error-icon">👤</div>
            <h3>No se pudo cargar la información del usuario</h3>
            <button className="btn btn-primary" onClick={fetchUserProfile}>
              🔄 Reintentar
            </button>
          </div>
        </div>
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

  const getRoleDescription = (role) => {
    const descriptions = {
      tutor: 'Especialista en enseñanza personalizada y apoyo académico',
      advisor: 'Especialista en orientación académica y desarrollo estudiantil'
    };
    return descriptions[role] || 'Miembro de la plataforma educativa';
  };

  const isAdvisor = user.role === 'advisor';

  return (
    <div className="dashboard-container">
      <TutorSidebarMenu userRole={user.role} />
      <div className="dashboard-content" style={{position: 'relative', top: '30px', right: '25px'}}>
        <div className="profile-page">
          <div className="profile-header">
            <div className="profile-avatar-section">
              <div className="profile-avatar-container" style={{position: 'relative', top: '-5px', right: '350px'}}>
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
              <div className="profile-basic-info" style={{position: 'relative', bottom: '180px', width: '800px', left: '150px'}}>
                <h2 className="profile-name">{getFullName(user)}</h2>
                <p className="profile-email">📧 {user.email}</p>
                <div className="profile-role">
                  <span className={`role-badge ${user.role}`}>
                    {getRoleIcon(user.role)} {getRoleLabel(user.role)}
                  </span>
                </div>
                <p className="profile-description">
                  {getRoleDescription(user.role)}
                </p>
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
                    style={{position: 'relative', bottom: '-150px', right: '840px',width: '170px'}}
                  >
                    ✏️ Editar Perfil
                  </button>
                  <button 
                    className="btn btn-outline" 
                    onClick={() => navigate('/account/change-email')}
                    style={{position: 'relative', top: '92px',left: '-660px', width: '170px'}}
                  >
                    📧 Cambiar Email
                  </button>
                  <button 
                    className="btn btn-outline" 
                    onClick={() => navigate('/account/change-password')}
                    style={{position: 'relative', top: '35px', right: '480px', width: '220px'}}
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
                    style={{position: 'relative', top: '130px', width: '320px', right: '450px'}}
                  >
                    {saving ? '💾 Guardando...' : '💾 Guardar Cambios'}
                  </button>
                  <button 
                    className="btn btn-secondary"
                    style={{position: 'relative', top: '72px', right: '800px', width: '320px'}}
                    onClick={() => {
                      setEditMode(false);
                      setEditForm({
                        firstName: user.personalInfo?.firstName || '',
                        lastName: user.personalInfo?.lastName || '',
                        username: user.personalInfo?.username || '',
                        phone: user.personalInfo?.phone || '',
                        specialty: user.personalInfo?.specialty || '',
                        degrees: user.personalInfo?.degrees || '',
                        experience: user.personalInfo?.experience || '',
                        certifications: user.personalInfo?.certifications || '',
                        bio: user.personalInfo?.bio || ''
                      });
                    }}
                  >
                    ❌ Cancelar
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Estadísticas del tutor/asesor */}
          {stats && !editMode && (
            <div className="profile-stats" style={{position: 'relative', bottom: '360px', left: '620px', width:'540px', height: '300px'}}>
              <h3>📊 Estadísticas de Tutorías</h3>
              <div className="stats-grid">
                <div className="stat-card"  style={{height: '80px'}}>
                  <div className="stat-icon">{isAdvisor ? '🎯' : '📚'}</div>
                  <div className="stat-content">
                    <span className="stat-number">{stats.totalSessions}</span>
                    <span className="stat-label">
                      Total Tutorías
                    </span>
                  </div>
                </div>
                <div className="stat-card"  style={{height: '80px'}}>
                  <div className="stat-icon">✅</div>
                  <div className="stat-content">
                    <span className="stat-number">{stats.completedSessions}</span>
                    <span className="stat-label">Sesiones Completadas</span>
                  </div>
                </div>
                <div className="stat-card"  style={{height: '80px'}}>
                  <div className="stat-icon">📅</div>
                  <div className="stat-content">
                    <span className="stat-number">{stats.upcomingSessions}</span>
                    <span className="stat-label">Sesiones Programadas</span>
                  </div>
                </div>
                <div className="stat-card"  style={{height: '80px'}}>
                  <div className="stat-icon">👨‍🎓</div>
                  <div className="stat-content">
                    <span className="stat-number">{stats.totalStudents}</span>
                    <span className="stat-label">Estudiantes Atendidos</span>
                  </div>
                </div>
              </div>
              
              {stats.subjects.length > 0 && (
                <div className="subjects-section"  style={{position: 'relative', bottom: '30px'}}>
                  <h4>📚 Materias Impartidas</h4>
                  <div className="subjects-list"  style={{position: 'relative', bottom: '40px', left: '300px'}}>
                    {stats.subjects.map((subject, index) => (
                      <span key={index} className="subject-tag">
                        {subject}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
          <div className="profile-content">
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
                  <h3>🎓 Información Académica</h3>
                  <div className="form-group">
                    <label>Especialización</label>
                    <input
                      type="text"
                      name="specialty"
                      value={editForm.specialty}
                      onChange={handleFormChange}
                      placeholder="Tu área de especialización (ej: Matemáticas avanzadas, Física, Química)"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Títulos y Grados</label>
                    <textarea
                      name="degrees"
                      value={editForm.degrees}
                      onChange={handleFormChange}
                      placeholder="Títulos académicos obtenidos (ej: Ingeniero Civil, Licenciado en Matemáticas, Maestría en Física)"
                      rows="3"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Experiencia Docente</label>
                    <textarea
                      name="experience"
                      value={editForm.experience}
                      onChange={handleFormChange}
                      placeholder="Descripción de tu experiencia como tutor (ej: 5 años enseñando matemáticas a nivel universitario, experiencia con estudiantes de Bachillerato)"
                      rows="3"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Certificaciones</label>
                    <input
                      type="text"
                      name="certifications"
                      value={editForm.certifications}
                      onChange={handleFormChange}
                      placeholder="Certificaciones relevantes (ej: Certificado en enseñanza de matemáticas, TOEFL, etc.)"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Biografía Académica</label>
                    <textarea
                      name="bio"
                      value={editForm.bio}
                      onChange={handleFormChange}
                      placeholder="Cuéntanos sobre tu formación y pasión por la enseñanza"
                      rows="4"
                    />
                  </div>
                </div>
              </form>
            ) : (
              <div className="profile-details"  style={{position: 'relative', bottom: '330px',borderRadius: '12px',padding: '20px', background: '#F8F9FA', border: '1px solid #eee' }}>
                <div className="details-section" >
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
                  <h3>🎓 Información Académica</h3>
                  <div className="details-grid">
                    <div className="detail-item">
                      <span className="detail-label">Especialización:</span>
                      <span className="detail-value">{user.personalInfo?.specialty || 'No especificada'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Títulos y Grados:</span>
                      <span className="detail-value">{user.personalInfo?.degrees || 'No especificados'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Experiencia Docente:</span>
                      <span className="detail-value">{user.personalInfo?.experience || 'No especificada'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Certificaciones:</span>
                      <span className="detail-value">{user.personalInfo?.certifications || 'No especificadas'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Biografía Académica:</span>
                      <span className="detail-value">{user.personalInfo?.bio || 'No especificada'}</span>
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
      </div>
    </div>
  );
};

export default TutorProfile;