import React, { useEffect, useState } from 'react';
import apiClient from '../utils/axiosConfig';
import './Dashboard.css';

const AdvisorsList = () => {
  const [advisors, setAdvisors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedAdvisor, setSelectedAdvisor] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedEducator, setSelectedEducator] = useState(null);
  const [requestForm, setRequestForm] = useState({
    tutorId: '',
    subject: '',
    topic: '',
    date: '',
    time: '',
    duration: 60,
    message: '',
    type: 'advisory'
  });

  useEffect(() => {
    const fetchAdvisors = async () => {
      try {
        setLoading(true);
        // Usar el nuevo endpoint para obtener solo asesores disponibles (sin citas confirmadas)
        const advisorsRes = await apiClient.get('/users/available-educators', { 
          params: { role: 'advisor', limit: 100 } 
        });
        const advisorsData = advisorsRes.data.data || [];
        
        console.log('✅ Asesores disponibles obtenidos:', advisorsData.length);
        console.log('📊 Metadata:', advisorsRes.data.meta);
        if (advisorsRes.data.meta?.excludedEducators > 0) {
          console.log(`🚫 ${advisorsRes.data.meta.excludedEducators} asesores excluidos por tener citas confirmadas`);
        }
        
        setAdvisors(advisorsData);
      } catch (err) {
        console.error('❌ Error fetching available advisors:', err);
        setError('No se pudieron cargar los asesores disponibles');
      } finally {
        setLoading(false);
      }
    };
    fetchAdvisors();
  }, []);

  const getFilteredAdvisors = () => {
    let filteredAdvisors = advisors;

    if (searchTerm) {
      filteredAdvisors = advisors.filter(advisor =>
        `${advisor.personalInfo?.firstName} ${advisor.personalInfo?.lastName}`
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        (advisor.personalInfo?.email || advisor.email).toLowerCase().includes(searchTerm.toLowerCase()) ||
        (advisor.advisorProfile?.specializationAreas || []).some(area =>
          area.toLowerCase().includes(searchTerm.toLowerCase())
        ) ||
        (advisor.academicProfile?.skills || []).some(skill =>
          skill.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    return filteredAdvisors;
  };

  const handleRequestAdvisory = (advisor) => {
    setSelectedEducator(advisor);
    setRequestForm(prev => ({
      ...prev,
      tutorId: advisor._id,
      type: 'advisory'
    }));
    setShowRequestModal(true);
  };

  const handleRequestSubmit = async (e) => {
    e.preventDefault();
    try {
      const appointmentData = {
        ...requestForm,
        status: 'pending'
      };

      console.log('Enviando datos de asesoría:', appointmentData);

      const response = await apiClient.post('/appointments', appointmentData);
      console.log('Respuesta del servidor:', response.data);
      
      alert('Solicitud de asesoría enviada exitosamente');

      setShowRequestModal(false);
      setRequestForm({
        tutorId: '',
        subject: '',
        topic: '',
        date: '',
        time: '',
        duration: 60,
        message: '',
        type: 'advisory'
      });
    } catch (error) {
      console.error('Error creating appointment:', error);
      
      let errorMessage = 'Error al enviar la solicitud. Inténtalo nuevamente.';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }
      
      alert(errorMessage);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setRequestForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSendMessage = (advisor) => {
    // Implementar funcionalidad de mensajería
    alert(`Función de mensajería con ${advisor.personalInfo?.firstName} ${advisor.personalInfo?.lastName} próximamente disponible`);
  };

  const handleViewProfile = (advisor) => {
    setSelectedAdvisor(selectedAdvisor?._id === advisor._id ? null : advisor);
  };

  const filteredAdvisors = getFilteredAdvisors();

  return (
    <div className="tutors-page">
      <div className="tutors-header">
        <h2>🎓 Asesores Disponibles</h2>
        <p>Encuentra asesores especializados para orientación académica y profesional</p>
        <div className="info-banner">
          <div className="info-icon">ℹ️</div>
          <div className="info-content">
            <strong>Nota:</strong> Solo se muestran asesores disponibles. Los asesores con los que ya tienes citas confirmadas no aparecen en esta lista.
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="tutors-filters">
        <div className="search-group">
          <input
            type="text"
            placeholder="Buscar por nombre, área de expertise..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Cargando asesores...</p>
        </div>
      ) : (
        <>
          {/* Estadísticas */}
          <div className="educators-stats">
            <div className="stat-item">
              <span className="stat-number">{filteredAdvisors.length}</span>
              <span className="stat-label">Asesores encontrados</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{advisors.length}</span>
              <span className="stat-label">Asesores disponibles</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">
                {advisors.filter(a => a.advisorProfile?.available).length}
              </span>
              <span className="stat-label">Disponibles ahora</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">
                {advisors.reduce((sum, a) => sum + (a.advisorProfile?.specializationAreas?.length || 0), 0)}
              </span>
              <span className="stat-label">Áreas de expertise</span>
            </div>
          </div>

          <div className="educators-grid">
            {filteredAdvisors.map((advisor) => {
              const profile = advisor.advisorProfile;
              const expertise = profile?.specializationAreas || [];

              return (
                <div key={advisor._id} className="educator-card">
                  <div className="educator-header">
                    <div className="educator-avatar">
                      <div className="avatar-circle">
                        {advisor.personalInfo?.avatar ? (
                          <img src={advisor.personalInfo.avatar} alt="Avatar" className="avatar-image" />
                        ) : (
                          <span>{advisor.personalInfo?.firstName?.[0]}{advisor.personalInfo?.lastName?.[0]}</span>
                        )}
                      </div>
                      <div className="role-badge advisor">
                        🎓 Asesor
                      </div>
                      {profile?.available && (
                        <div className="availability-indicator online">
                          <span>🟢 Disponible</span>
                        </div>
                      )}
                    </div>
                    <div className="educator-info">
                      <h3>{advisor.personalInfo?.firstName} {advisor.personalInfo?.lastName}</h3>
                      <p className="educator-email">{advisor.personalInfo?.email || advisor.email}</p>
                      {profile?.rating && (
                        <div className="educator-rating">
                          <span>⭐ {profile.rating}/5.0</span>
                          <span>(Asesor profesional)</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="educator-details">
                    {profile?.specializationAreas && profile.specializationAreas.length > 0 && (
                      <div className="specialties">
                        <h4>🎯 Áreas de especialización:</h4>
                        <div className="specialty-tags">
                          {profile.specializationAreas.slice(0, 3).map((area, index) => (
                            <span key={index} className="specialty-tag">{area}</span>
                          ))}
                          {profile.specializationAreas.length > 3 && (
                            <span className="specialty-more">+{profile.specializationAreas.length - 3} más</span>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="educator-stats">
                      {advisor.academicProfile?.experienceYears && (
                        <div className="stat-item">
                          <span className="stat-label">📅 Experiencia:</span>
                          <span className="stat-value">{advisor.academicProfile.experienceYears} años</span>
                        </div>
                      )}
                      {profile?.appointmentDuration && (
                        <div className="stat-item">
                          <span className="stat-label">⏱️ Duración citas:</span>
                          <span className="stat-value">{profile.appointmentDuration} min</span>
                        </div>
                      )}
                      {profile?.rating && (
                        <div className="stat-item">
                          <span className="stat-label">⭐ Calificación:</span>
                          <span className="stat-value">{profile.rating}/5.0</span>
                        </div>
                      )}
                    </div>

                    {advisor.personalInfo?.bio && (
                      <div className="bio">
                        <h4>📝 Sobre mí:</h4>
                        <p>{advisor.personalInfo.bio.length > 120 ? `${advisor.personalInfo.bio.substring(0, 120)}...` : advisor.personalInfo.bio}</p>
                      </div>
                    )}
                  </div>

                  <div className="educator-actions">
                    <button
                      className="btn btn-secondary"
                      onClick={() => handleViewProfile(advisor)}
                    >
                      {selectedAdvisor?._id === advisor._id ? '✕ Menos info' : 'ℹ️ Ver perfil'}
                    </button>
                    <button
                      className="btn btn-outline"
                      onClick={() => handleSendMessage(advisor)}
                    >
                      💬 Mensaje
                    </button>
                    <button
                      className="btn btn-primary"
                      onClick={() => handleRequestAdvisory(advisor)}
                    >
                      📅 Solicitar asesoría
                    </button>
                  </div>

                  {selectedAdvisor?._id === advisor._id && (
                    <div className="educator-expanded">
                      <div className="expanded-content">
                        <h4>📋 Información completa del asesor</h4>
                        
                        {/* Información personal */}
                        <div className="personal-info">
                          <h5>👤 Información Personal:</h5>
                          <div className="info-grid">
                            {advisor.personalInfo?.firstName && (
                              <div className="info-item">
                                <span className="info-label">Nombre:</span>
                                <span className="info-value">{advisor.personalInfo.firstName} {advisor.personalInfo.lastName}</span>
                              </div>
                            )}
                            {advisor.personalInfo?.email && (
                              <div className="info-item">
                                <span className="info-label">Email:</span>
                                <span className="info-value">{advisor.personalInfo.email}</span>
                              </div>
                            )}
                            {advisor.personalInfo?.phone && (
                              <div className="info-item">
                                <span className="info-label">Teléfono:</span>
                                <span className="info-value">{advisor.personalInfo.phone}</span>
                              </div>
                            )}
                            {advisor.personalInfo?.city && (
                              <div className="info-item">
                                <span className="info-label">Ciudad:</span>
                                <span className="info-value">{advisor.personalInfo.city}, {advisor.personalInfo.country}</span>
                              </div>
                            )}
                          </div>
                          {advisor.personalInfo?.bio && (
                            <div className="bio-full">
                              <h6>📝 Biografía:</h6>
                              <p>{advisor.personalInfo.bio}</p>
                            </div>
                          )}
                        </div>

                        {/* Perfil académico */}
                        {advisor.academicProfile && (
                          <div className="academic-info">
                            <h5>🎓 Perfil Académico:</h5>
                            <div className="info-grid">
                              {advisor.academicProfile.institution && (
                                <div className="info-item">
                                  <span className="info-label">Institución:</span>
                                  <span className="info-value">{advisor.academicProfile.institution}</span>
                                </div>
                              )}
                              {advisor.academicProfile.department && (
                                <div className="info-item">
                                  <span className="info-label">Departamento:</span>
                                  <span className="info-value">{advisor.academicProfile.department}</span>
                                </div>
                              )}
                              {advisor.academicProfile.title && (
                                <div className="info-item">
                                  <span className="info-label">Título:</span>
                                  <span className="info-value">{advisor.academicProfile.title}</span>
                                </div>
                              )}
                              {advisor.academicProfile.experienceYears && (
                                <div className="info-item">
                                  <span className="info-label">Años de experiencia:</span>
                                  <span className="info-value">{advisor.academicProfile.experienceYears} años</span>
                                </div>
                              )}
                            </div>
                            {advisor.academicProfile.skills && advisor.academicProfile.skills.length > 0 && (
                              <div className="skills">
                                <h6>🛠️ Habilidades:</h6>
                                <div className="skill-tags">
                                  {advisor.academicProfile.skills.map((skill, index) => (
                                    <span key={index} className="skill-tag">{skill}</span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Perfil de asesor */}
                        {advisor.advisorProfile && (
                          <div className="advisor-info">
                            <h5>🎓 Perfil de Asesor:</h5>
                            <div className="info-grid">
                              {advisor.advisorProfile.appointmentDuration && (
                                <div className="info-item">
                                  <span className="info-label">Duración de citas:</span>
                                  <span className="info-value">{advisor.advisorProfile.appointmentDuration} minutos</span>
                                </div>
                              )}
                              {advisor.advisorProfile.rating && (
                                <div className="info-item">
                                  <span className="info-label">Calificación:</span>
                                  <span className="info-value">⭐ {advisor.advisorProfile.rating}/5.0</span>
                                </div>
                              )}
                              <div className="info-item">
                                <span className="info-label">Estado:</span>
                                <span className={`info-value ${advisor.advisorProfile.available ? 'available' : 'unavailable'}`}>
                                  {advisor.advisorProfile.available ? '🟢 Disponible' : '🔴 No disponible'}
                                </span>
                              </div>
                            </div>
                            
                            {advisor.advisorProfile.specializationAreas && advisor.advisorProfile.specializationAreas.length > 0 && (
                              <div className="specialization-areas">
                                <h6>🎯 Áreas de Especialización:</h6>
                                <div className="specialty-tags">
                                  {advisor.advisorProfile.specializationAreas.map((area, index) => (
                                    <span key={index} className="specialty-tag">{area}</span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Información de contacto y disponibilidad */}
                        <div className="contact-info">
                          <h5>📞 Contacto y Disponibilidad:</h5>
                          <div className="contact-grid">
                            <div className="contact-item">
                              <span className="contact-label">📧 Email:</span>
                              <span className="contact-value">{advisor.email}</span>
                            </div>
                            <div className="contact-item">
                              <span className="contact-label">📅 Miembro desde:</span>
                              <span className="contact-value">
                                {new Date(advisor.createdAt).toLocaleDateString('es-ES', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })}
                              </span>
                            </div>
                            <div className="contact-item">
                              <span className="contact-label">🔄 Última actualización:</span>
                              <span className="contact-value">
                                {new Date(advisor.updatedAt).toLocaleDateString('es-ES', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Botones de acción adicionales */}
                        <div className="profile-actions">
                          <button
                            className="btn btn-primary"
                            onClick={() => {
                              setSelectedAdvisor(null);
                              handleRequestAdvisory(advisor);
                            }}
                          >
                            📅 Solicitar Asesoría Ahora
                          </button>
                          <button
                            className="btn btn-outline"
                            onClick={() => handleSendMessage(advisor)}
                          >
                            💬 Enviar Mensaje
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {filteredAdvisors.length === 0 && !loading && (
            <div className="empty-state">
              <div className="empty-icon">🎓</div>
              <h3>No se encontraron asesores disponibles</h3>
              {searchTerm ? (
                <p>No hay asesores disponibles que coincidan con tu búsqueda.</p>
              ) : (
                <p>No hay asesores disponibles en este momento. Los asesores con los que ya tienes citas confirmadas no se muestran aquí.</p>
              )}
              <div className="empty-suggestions">
                <h4>💡 Sugerencias:</h4>
                <ul>
                  {searchTerm ? (
                    <>
                      <li>Verifica la ortografía de tu búsqueda</li>
                      <li>Usa términos más generales</li>
                      <li>Busca por área de expertise</li>
                    </>
                  ) : (
                    <>
                      <li>Los asesores con citas confirmadas contigo no aparecen en esta lista</li>
                      <li>Revisa la sección "Mis Cursos" para ver tus asesorías activas</li>
                      <li>Contacta al administrador si necesitas más asesores</li>
                    </>
                  )}
                  <li>Los asesores se especializan en orientación académica y profesional</li>
                </ul>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal de solicitud de asesoría */}
      {showRequestModal && (
        <div className="modal-overlay" onClick={() => setShowRequestModal(false)}>
          <div className="modal-content large-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📅 Solicitar Asesoría</h3>
              <button className="modal-close" onClick={() => setShowRequestModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="advisor-info-header">
                <p><strong>Asesor seleccionado:</strong> {selectedEducator?.personalInfo?.firstName} {selectedEducator?.personalInfo?.lastName}</p>
                {selectedEducator?.advisorProfile?.expertise && (
                  <div className="advisor-expertise">
                    <h4>🎯 Áreas de expertise:</h4>
                    <div className="specialty-tags">
                      {selectedEducator.advisorProfile.expertise.map((area, index) => (
                        <span key={index} className="specialty-tag">{area}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <form onSubmit={handleRequestSubmit}>
                <div className="form-row">
                  <div className="form-group">
                    <label>📚 Área/Tema *</label>
                    <input
                      type="text"
                      name="subject"
                      value={requestForm.subject}
                      onChange={handleFormChange}
                      placeholder="Ej: Orientación vocacional, Métodos de estudio, Planificación académica"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>🎯 Tema específico</label>
                    <input
                      type="text"
                      name="topic"
                      value={requestForm.topic}
                      onChange={handleFormChange}
                      placeholder="Aspecto particular a tratar (opcional)"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>📅 Fecha *</label>
                    <input
                      type="date"
                      name="date"
                      value={requestForm.date}
                      onChange={handleFormChange}
                      min={new Date().toISOString().split('T')[0]}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>🕐 Hora *</label>
                    <input
                      type="time"
                      name="time"
                      value={requestForm.time}
                      onChange={handleFormChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>⏱️ Duración</label>
                    <select
                      name="duration"
                      value={requestForm.duration}
                      onChange={handleFormChange}
                    >
                      <option value={30}>30 minutos</option>
                      <option value={60}>1 hora</option>
                      <option value={90}>1.5 horas</option>
                      <option value={120}>2 horas</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>💬 Mensaje para el asesor</label>
                  <textarea
                    name="message"
                    value={requestForm.message}
                    onChange={handleFormChange}
                    placeholder="Describe tu situación académica, objetivos, dudas específicas, o cualquier información que ayude al asesor a preparar la sesión..."
                    rows="4"
                  />
                </div>

                <div className="modal-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowRequestModal(false)}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-primary">
                    📤 Enviar Solicitud de Asesoría
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvisorsList;