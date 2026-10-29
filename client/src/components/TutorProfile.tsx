import type { Appointment } from '../types/appointments';
import type { User, PersonalInfo } from '../types/auth';
import type { ApiResponse } from '../types/api';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import TutorSidebarMenu from './TutorSidebarMenu';
import apiClient from '../utils/axiosConfig';
import AvatarUploader from './AvatarUploader';
import DocumentManager from './DocumentManager';
import DeactivateAccount from './DeactivateAccount';
import { getApiErrorMessage } from '../utils/apiError';
import './UserProfile.css';
import './Dashboard.css';
const TutorProfile = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState<PersonalInfo>({});
  const [saving, setSaving] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [stats, setStats] = useState<{ totalSessions: number; completedSessions: number; upcomingSessions: number; totalStudents: number; subjects: string[] } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUserProfile();
    fetchUserStats();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const response = await apiClient.get<ApiResponse<User>>('/auth/profile');
      const userData = response.data.data;
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
      setError(getApiErrorMessage(error, 'Error al cargar el perfil'));
      setLoading(false);
    }
  };

  const fetchUserStats = async () => {
    try {
      const appointmentsResponse = await apiClient.get<ApiResponse<Appointment[]>>('/appointments');
      const appointments = appointmentsResponse.data.data || [];
      
      const confirmedAppointments = appointments.filter(apt => 
        ['confirmed', 'completed'].includes(apt.status)
      );
      
      const completedAppointments = appointments.filter(apt => apt.status === 'completed');
      const upcomingAppointments = appointments.filter(apt => 
        apt.status === 'confirmed' && new Date(apt.startsAt) > new Date()
      );
      
      const uniqueStudents = new Set();
      confirmedAppointments.forEach(apt => {
        if (apt.studentId?._id) {
          uniqueStudents.add(apt.studentId._id);
        }
      });
      
      const uniqueSubjects = new Set<string>();
      confirmedAppointments.forEach(apt => {
        if (apt.courseId?.title) {
          uniqueSubjects.add(apt.courseId.title);
        }
      });
      
      setStats({
        totalSessions: confirmedAppointments.length,
        completedSessions: completedAppointments.length,
        upcomingSessions: upcomingAppointments.length,
        totalStudents: uniqueStudents.size,
        subjects: Array.from(uniqueSubjects)
      });
    } catch (error) {
      console.error('Error fetching user stats:', error);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement> | React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setSaving(true);
    try {
      const response = await apiClient.patch<ApiResponse<User>>('/auth/profile', {
        personalInfo: editForm
      });
      
      const updatedUser = response.data.data;
      setUser(updatedUser);
      setEditMode(false);
      alert('Perfil actualizado exitosamente');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert(getApiErrorMessage(error, 'Error al actualizar el perfil'));
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

  const getRoleIcon = (role: string | undefined) => {
    const icons: Record<string, string> = {
      student: '🎓',
      tutor: '👨‍🏫',
      advisor: '🎯',
      admin: '👑'
    };
    return icons[role || ''] || '👤';
  };

  const getRoleDescription = (role: string | undefined) => {
    const descriptions: Record<string, string> = {
      tutor: 'Especialista en enseñanza personalizada y apoyo académico',
      advisor: 'Especialista en orientación académica y desarrollo estudiantil'
    };
    return descriptions[role || ''] || 'Miembro de la plataforma educativa';
  };

  const isAdvisor = String(user?.role) === 'advisor';

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
            <button className="profile-btn profile-btn-primary" onClick={fetchUserProfile}>
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
        <TutorSidebarMenu />
        <div className="dashboard-content">
          <div className="error-container">
            <div className="error-icon">👤</div>
            <h3>No se pudo cargar la información del usuario</h3>
            <button className="profile-btn profile-btn-primary" onClick={fetchUserProfile}>
              🔄 Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <TutorSidebarMenu userRole={user.role} />
      <div className="dashboard-content">
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
                    className="profile-avatar-edit-btn"
                    onClick={() => setShowAvatarModal(true)}
                    title="Cambiar foto de perfil"
                  >
                    �
                  </button>
                </div>
              </div>

              <div className="profile-header-info">
                <h1 className="profile-name">{getFullName(user)}</h1>
                <p className="profile-email">📧 {user.email}</p>
                <div className="profile-badges">
                  <span className={`profile-role-badge profile-role-${user.role}`}>
                    {getRoleIcon(user.role)} {getRoleLabel(user.role)}
                  </span>
                  <span className="profile-member-badge">
                    📅 Miembro desde {user.createdAt ? new Date(user.createdAt).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'long'
                    }) : 'Fecha no disponible'}
                  </span>
                </div>
                <p className="profile-description">
                  {getRoleDescription(user.role)}
                </p>
              </div>

              <div className="profile-header-actions">
                {!editMode ? (
                  <>
                    <button 
                      className="profile-btn profile-btn-primary"
                      onClick={() => setEditMode(true)}
                    >
                      ✏️ Editar Perfil
                    </button>
                    <button 
                      className="profile-btn profile-btn-outline"
                      onClick={() => navigate('/account/change-password')}
                    >
                      🔒 Cambiar Contraseña
                    </button>
                  </>
                ) : (
                  <>
                    <button 
                      className="profile-btn profile-btn-success"
                      onClick={handleEditSubmit}
                      disabled={saving}
                    >
                      {saving ? '💾 Guardando...' : '💾 Guardar Cambios'}
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
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Estadísticas del tutor/asesor */}
          {stats && !editMode && (
            <div className="profile-stats-card">
              <div className="profile-card-header">
                <h3>📊 Estadísticas de Tutorías</h3>
              </div>
              <div className="profile-stats-grid">
                <div className="profile-stat-item">
                  <div className="profile-stat-icon">{isAdvisor ? '🎯' : '📚'}</div>
                  <div className="profile-stat-content">
                    <span className="profile-stat-number">{stats.totalSessions}</span>
                    <span className="profile-stat-label">Total Tutorías</span>
                  </div>
                </div>
                <div className="profile-stat-item">
                  <div className="profile-stat-icon">✅</div>
                  <div className="profile-stat-content">
                    <span className="profile-stat-number">{stats.completedSessions}</span>
                    <span className="profile-stat-label">Sesiones Completadas</span>
                  </div>
                </div>
                <div className="profile-stat-item">
                  <div className="profile-stat-icon">📅</div>
                  <div className="profile-stat-content">
                    <span className="profile-stat-number">{stats.upcomingSessions}</span>
                    <span className="profile-stat-label">Sesiones Programadas</span>
                  </div>
                </div>
                <div className="profile-stat-item">
                  <div className="profile-stat-icon">👨‍🎓</div>
                  <div className="profile-stat-content">
                    <span className="profile-stat-number">{stats.totalStudents}</span>
                    <span className="profile-stat-label">Estudiantes Atendidos</span>
                  </div>
                </div>
              </div>
              
              {stats.subjects.length > 0 && (
                <div className="profile-subjects-section">
                  <h4>📚 Materias Impartidas</h4>
                  <div className="profile-subjects-list">
                    {stats.subjects.map((subject, index) => (
                      <span key={index} className="profile-subject-tag">
                        {subject}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Contenido del perfil */}
          <div className="profile-content-grid">
            {editMode ? (
              <form onSubmit={handleEditSubmit} className="profile-edit-form">
                {/* Información Personal */}
                <div className="profile-card">
                  <div className="profile-card-header">
                    <h3>👤 Información Personal</h3>
                  </div>
                  <div className="profile-card-body">
                    <div className="profile-form-row">
                      <div className="profile-form-group">
                        <label>Nombre</label>
                        <input
                          type="text"
                          name="firstName"
                          value={editForm.firstName}
                          onChange={handleFormChange}
                          placeholder="Tu nombre"
                          className="profile-input"
                        />
                      </div>
                      <div className="profile-form-group">
                        <label>Apellido</label>
                        <input
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
                        <label>Nombre de usuario</label>
                        <input
                          type="text"
                          name="username"
                          value={editForm.username}
                          onChange={handleFormChange}
                          placeholder="Tu nombre de usuario"
                          className="profile-input"
                        />
                      </div>
                      <div className="profile-form-group">
                        <label>Teléfono</label>
                        <input
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

                {/* Información Académica */}
                <div className="profile-card">
                  <div className="profile-card-header">
                    <h3>🎓 Información Académica</h3>
                  </div>
                  <div className="profile-card-body">
                    <div className="profile-form-group">
                      <label>Especialización</label>
                      <input
                        type="text"
                        name="specialty"
                        value={editForm.specialty}
                        onChange={handleFormChange}
                        placeholder="Tu área de especialización"
                        className="profile-input"
                      />
                    </div>
                    
                    <div className="profile-form-group">
                      <label>Títulos y Grados</label>
                      <textarea
                        name="degrees"
                        value={editForm.degrees}
                        onChange={handleFormChange}
                        placeholder="Títulos académicos obtenidos"
                        rows={3}
                        className="profile-input"
                      />
                    </div>
                    
                    <div className="profile-form-group">
                      <label>Experiencia Docente</label>
                      <textarea
                        name="experience"
                        value={editForm.experience}
                        onChange={handleFormChange}
                        placeholder="Descripción de tu experiencia como tutor"
                        rows={3}
                        className="profile-input"
                      />
                    </div>
                    
                    <div className="profile-form-group">
                      <label>Certificaciones</label>
                      <input
                        type="text"
                        name="certifications"
                        value={editForm.certifications}
                        onChange={handleFormChange}
                        placeholder="Certificaciones relevantes"
                        className="profile-input"
                      />
                    </div>
                    
                    <div className="profile-form-group">
                      <label>Biografía Académica</label>
                      <textarea
                        name="bio"
                        value={editForm.bio}
                        onChange={handleFormChange}
                        placeholder="Cuéntanos sobre tu formación y pasión por la enseñanza"
                        rows={4}
                        className="profile-input"
                      />
                    </div>
                  </div>
                </div>
              </form>
            ) : (
              <>
                {/* Información Personal */}
                <div className="profile-card">
                  <div className="profile-card-header">
                    <h3>👤 Información Personal</h3>
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

                {/* Información Académica */}
                <div className="profile-card">
                  <div className="profile-card-header">
                    <h3>🎓 Información Académica</h3>
                  </div>
                  <div className="profile-card-body">
                    <div className="profile-detail-item">
                      <span className="profile-detail-label">Especialización:</span>
                      <span className="profile-detail-value">{user.personalInfo?.specialty || 'No especificada'}</span>
                    </div>
                    <div className="profile-detail-item">
                      <span className="profile-detail-label">Títulos y Grados:</span>
                      <span className="profile-detail-value">{user.personalInfo?.degrees || 'No especificados'}</span>
                    </div>
                    <div className="profile-detail-item">
                      <span className="profile-detail-label">Experiencia Docente:</span>
                      <span className="profile-detail-value">{user.personalInfo?.experience || 'No especificada'}</span>
                    </div>
                    <div className="profile-detail-item">
                      <span className="profile-detail-label">Certificaciones:</span>
                      <span className="profile-detail-value">{user.personalInfo?.certifications || 'No especificadas'}</span>
                    </div>
                    <div className="profile-detail-item">
                      <span className="profile-detail-label">Biografía Académica:</span>
                      <span className="profile-detail-value">{user.personalInfo?.bio || 'No especificada'}</span>
                    </div>
                  </div>
                </div>

                {/* Información de Cuenta */}
                <div className="profile-card">
                  <div className="profile-card-header">
                    <h3>🔐 Información de Cuenta</h3>
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
                          {getRoleIcon(user.role)} {getRoleLabel(user.role)}
                        </span>
                      </span>
                    </div>
                    <div className="profile-detail-item">
                      <span className="profile-detail-label">Estado:</span>
                      <span className="profile-detail-value">
                        <span className="profile-status-badge profile-status-active">✅ Activa</span>
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
            <div className="profile-modal-overlay" onClick={() => setShowAvatarModal(false)}>
              <div className="profile-modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="profile-modal-header">
                  <h3>📷 Cambiar Foto de Perfil</h3>
                  <button 
                    className="profile-modal-close-btn"
                    onClick={() => setShowAvatarModal(false)}
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
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TutorProfile;
