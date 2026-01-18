import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import TutorSidebarMenu from './TutorSidebarMenu';
import apiClient from '../utils/axiosConfig';
import './Dashboard.css';

class TutorProfile extends Component {
  state = {
    user: null,
    activeTab: 'personal',
    loading: true,
    editing: false,
    formData: {}
  };

  componentDidMount() {
    this.loadUserProfile();
  }

  loadUserProfile = async () => {
    try {
      const response = await apiClient.get('/auth/profile');
      const user = response.data.data;
      this.setState({
        user,
        formData: { ...user },
        loading: false
      });
    } catch (error) {
      console.error('Error loading profile:', error);
      this.setState({
        loading: false,
        error: 'Error al cargar el perfil'
      });
    }
  };

  handleInputChange = (e) => {
    const { name, value } = e.target;
    this.setState(prevState => ({
      formData: {
        ...prevState.formData,
        [name]: value
      }
    }));
  };

  handleSave = async () => {
    try {
      // TODO: Implement API call to update profile
      console.log('Saving profile:', this.state.formData);
      this.setState({ editing: false });
      // Reload profile after save
      await this.loadUserProfile();
    } catch (error) {
      console.error('Error saving profile:', error);
    }
  };

  renderPersonalInfo = () => {
    const { user, editing, formData } = this.state;

    return (
      <div className="profile-section">
        <h3>Información Personal</h3>
        <div className="profile-form">
          <div className="form-row">
            <div className="form-group">
              <label>Nombre</label>
              {editing ? (
                <input
                  type="text"
                  name="personalInfo.firstName"
                  value={formData.personalInfo?.firstName || ''}
                  onChange={this.handleInputChange}
                />
              ) : (
                <p>{user?.personalInfo?.firstName}</p>
              )}
            </div>
            <div className="form-group">
              <label>Apellido</label>
              {editing ? (
                <input
                  type="text"
                  name="personalInfo.lastName"
                  value={formData.personalInfo?.lastName || ''}
                  onChange={this.handleInputChange}
                />
              ) : (
                <p>{user?.personalInfo?.lastName}</p>
              )}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Email</label>
              <p>{user?.email}</p>
              <small>Puedes cambiar tu email en <Link to="/account/change-email">Configuración de cuenta</Link></small>
            </div>
            <div className="form-group">
              <label>Teléfono</label>
              {editing ? (
                <input
                  type="tel"
                  name="personalInfo.phone"
                  value={formData.personalInfo?.phone || ''}
                  onChange={this.handleInputChange}
                />
              ) : (
                <p>{user?.personalInfo?.phone || 'No especificado'}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  renderProfessionalInfo = () => {
    const { user, editing, formData } = this.state;

    return (
      <div className="profile-section">
        <h3>Información Profesional</h3>
        <div className="profile-form">
          <div className="form-row">
            <div className="form-group">
              <label>Título Académico</label>
              {editing ? (
                <input
                  type="text"
                  name="academicProfile.degree"
                  value={formData.academicProfile?.degree || ''}
                  onChange={this.handleInputChange}
                />
              ) : (
                <p>{user?.academicProfile?.degree || 'No especificado'}</p>
              )}
            </div>
            <div className="form-group">
              <label>Especialización</label>
              {editing ? (
                <input
                  type="text"
                  name="academicProfile.specialization"
                  value={formData.academicProfile?.specialization || ''}
                  onChange={this.handleInputChange}
                />
              ) : (
                <p>{user?.academicProfile?.specialization || 'No especificado'}</p>
              )}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Años de Experiencia</label>
              {editing ? (
                <input
                  type="number"
                  name="academicProfile.experienceYears"
                  value={formData.academicProfile?.experienceYears || ''}
                  onChange={this.handleInputChange}
                />
              ) : (
                <p>{user?.academicProfile?.experienceYears || 'No especificado'} años</p>
              )}
            </div>
            <div className="form-group">
              <label>Institución</label>
              {editing ? (
                <input
                  type="text"
                  name="academicProfile.institution"
                  value={formData.academicProfile?.institution || ''}
                  onChange={this.handleInputChange}
                />
              ) : (
                <p>{user?.academicProfile?.institution || 'No especificado'}</p>
              )}
            </div>
          </div>

          <div className="form-group full-width">
            <label>Biografía</label>
            {editing ? (
              <textarea
                name="academicProfile.bio"
                value={formData.academicProfile?.bio || ''}
                onChange={this.handleInputChange}
                rows="4"
                placeholder="Describe tu experiencia y especialización..."
              />
            ) : (
              <p>{user?.academicProfile?.bio || 'No especificado'}</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  renderPaymentInfo = () => {
    return (
      <div className="profile-section">
        <h3>Datos de Pago</h3>
        <div className="payment-info">
          <div className="payment-methods">
            <div className="payment-method-card">
              <h4>Cuenta Bancaria</h4>
              <p><strong>Banco:</strong> Banco de Venezuela</p>
              <p><strong>Tipo de Cuenta:</strong> Corriente</p>
              <p><strong>Número:</strong> ****-****-****-1234</p>
              <button className="btn-outline small">Editar</button>
            </div>

            <div className="payment-method-card">
              <h4>Pago Móvil</h4>
              <p><strong>Banco:</strong> Mercantil</p>
              <p><strong>Teléfono:</strong> ****-****-1234</p>
              <p><strong>Cédula:</strong> *******1234</p>
              <button className="btn-outline small">Editar</button>
            </div>
          </div>

          <div className="payment-history">
            <h4>Historial de Pagos</h4>
            <div className="payment-record">
              <span>Enero 2024</span>
              <span>$1,200.00</span>
              <span className="status completed">Completado</span>
            </div>
            <div className="payment-record">
              <span>Diciembre 2023</span>
              <span>$980.00</span>
              <span className="status completed">Completado</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  renderDocuments = () => {
    return (
      <div className="profile-section">
        <h3>Documentos Cargados</h3>
        <div className="documents-section">
          <div className="upload-section">
            <button className="btn-primary">Subir Nuevo Documento</button>
            <p className="help-text">Formatos aceptados: PDF, DOC, DOCX, JPG, PNG (máx. 10MB)</p>
          </div>

          <div className="documents-list">
            <div className="document-item">
              <div className="document-icon">📄</div>
              <div className="document-info">
                <h4>CV_Actualizado_2024.pdf</h4>
                <p>Subido: 15 enero 2024</p>
                <p>Tamaño: 2.3 MB</p>
              </div>
              <div className="document-actions">
                <button className="btn-outline small">Descargar</button>
                <button className="btn-outline small">Ver</button>
                <button className="btn-danger small">Eliminar</button>
              </div>
            </div>

            <div className="document-item">
              <div className="document-icon">🎓</div>
              <div className="document-info">
                <h4>Titulo_Ingeniero.pdf</h4>
                <p>Subido: 10 enero 2024</p>
                <p>Tamaño: 1.8 MB</p>
              </div>
              <div className="document-actions">
                <button className="btn-outline small">Descargar</button>
                <button className="btn-outline small">Ver</button>
                <button className="btn-danger small">Eliminar</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  renderPreferences = () => {
    return (
      <div className="profile-section">
        <h3>Preferencias</h3>
        <div className="preferences-section">
          <div className="preference-group">
            <h4>Horarios Disponibles</h4>
            <div className="schedule-preferences">
              <label>
                <input type="checkbox" defaultChecked /> Lunes
                <select>
                  <option>09:00 - 17:00</option>
                  <option>14:00 - 20:00</option>
                  <option>Todo el día</option>
                </select>
              </label>
              <label>
                <input type="checkbox" defaultChecked /> Martes
                <select>
                  <option>09:00 - 17:00</option>
                  <option>14:00 - 20:00</option>
                  <option>Todo el día</option>
                </select>
              </label>
              <label>
                <input type="checkbox" /> Miércoles
                <select>
                  <option>09:00 - 17:00</option>
                  <option>14:00 - 20:00</option>
                  <option>Todo el día</option>
                </select>
              </label>
            </div>
          </div>

          <div className="preference-group">
            <h4>Tipos de Cursos</h4>
            <div className="course-types">
              <label><input type="checkbox" defaultChecked /> Matemáticas</label>
              <label><input type="checkbox" defaultChecked /> Física</label>
              <label><input type="checkbox" /> Química</label>
              <label><input type="checkbox" /> Programación</label>
              <label><input type="checkbox" /> Idiomas</label>
            </div>
          </div>

          <div className="preference-group">
            <h4>Modalidades</h4>
            <div className="modalities">
              <label><input type="checkbox" defaultChecked /> Presencial</label>
              <label><input type="checkbox" defaultChecked /> Virtual</label>
              <label><input type="checkbox" /> Híbrida</label>
            </div>
          </div>

          <div className="preference-group">
            <h4>Niveles Educativos</h4>
            <div className="education-levels">
              <label><input type="checkbox" /> Básico</label>
              <label><input type="checkbox" defaultChecked /> Bachillerato</label>
              <label><input type="checkbox" defaultChecked /> Universitario</label>
              <label><input type="checkbox" /> Posgrado</label>
            </div>
          </div>
        </div>
      </div>
    );
  };

  render() {
    const { activeTab, loading, editing } = this.state;

    if (loading) {
      return (
        <div className="dashboard-container">
          <TutorSidebarMenu />
          <div className="dashboard-content">
            <div className="loading-spinner">Cargando perfil...</div>
          </div>
        </div>
      );
    }

    return (
      <div className="dashboard-container">
        <TutorSidebarMenu />
        <div className="dashboard-content">
          <div className="dashboard-header">
            <h1>Mi Perfil de Tutor</h1>
            <p>Gestiona tu información personal y profesional</p>
          </div>

          <div className="dashboard-main">
            <div className="profile-container">
              <div className="profile-tabs">
                <button
                  className={`tab-button ${activeTab === 'personal' ? 'active' : ''}`}
                  onClick={() => this.setState({ activeTab: 'personal' })}
                >
                  Información Personal
                </button>
                <button
                  className={`tab-button ${activeTab === 'professional' ? 'active' : ''}`}
                  onClick={() => this.setState({ activeTab: 'professional' })}
                >
                  Información Profesional
                </button>
                <button
                  className={`tab-button ${activeTab === 'payment' ? 'active' : ''}`}
                  onClick={() => this.setState({ activeTab: 'payment' })}
                >
                  Datos de Pago
                </button>
                <button
                  className={`tab-button ${activeTab === 'documents' ? 'active' : ''}`}
                  onClick={() => this.setState({ activeTab: 'documents' })}
                >
                  Documentos
                </button>
                <button
                  className={`tab-button ${activeTab === 'preferences' ? 'active' : ''}`}
                  onClick={() => this.setState({ activeTab: 'preferences' })}
                >
                  Preferencias
                </button>
              </div>

              <div className="profile-actions">
                {!editing ? (
                  <button
                    className="btn-primary"
                    onClick={() => this.setState({ editing: true })}
                  >
                    Editar Perfil
                  </button>
                ) : (
                  <div className="edit-actions">
                    <button className="btn-secondary" onClick={() => this.setState({ editing: false })}>
                      Cancelar
                    </button>
                    <button className="btn-primary" onClick={this.handleSave}>
                      Guardar Cambios
                    </button>
                  </div>
                )}
              </div>

              <div className="profile-content">
                {activeTab === 'personal' && this.renderPersonalInfo()}
                {activeTab === 'professional' && this.renderProfessionalInfo()}
                {activeTab === 'payment' && this.renderPaymentInfo()}
                {activeTab === 'documents' && this.renderDocuments()}
                {activeTab === 'preferences' && this.renderPreferences()}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default TutorProfile;
