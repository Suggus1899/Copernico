import React, { useEffect, useState } from 'react';
import apiClient from '../utils/axiosConfig';
import './Dashboard.css';

const Tutors = () => {
  const [tutors, setTutors] = useState([]);
  const [advisors, setAdvisors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTutor, setSelectedTutor] = useState(null);
  const [filter, setFilter] = useState('all'); // all, tutors, advisors
  const [searchTerm, setSearchTerm] = useState('');
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedEducator, setSelectedEducator] = useState(null);

  useEffect(() => {
    const fetchEducators = async () => {
      try {
        setLoading(true);
        // Fetch both tutors and advisors
        const [tutorsRes, advisorsRes] = await Promise.all([
          apiClient.get('/users', { params: { role: 'tutor' } }),
          apiClient.get('/users', { params: { role: 'advisor' } })
        ]);

        setTutors(tutorsRes.data.data || []);
        setAdvisors(advisorsRes.data.data || []);
      } catch (err) {
        setError('No se pudieron cargar los educadores');
      } finally {
        setLoading(false);
      }
    };
    fetchEducators();
  }, []);

  const getFilteredEducators = () => {
    let educators = [];

    if (filter === 'tutors') {
      educators = tutors;
    } else if (filter === 'advisors') {
      educators = advisors;
    } else {
      educators = [...tutors, ...advisors];
    }

    if (searchTerm) {
      educators = educators.filter(educator =>
        `${educator.personalInfo?.firstName} ${educator.personalInfo?.lastName}`
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        educator.personalInfo?.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (educator.tutorProfile?.specialties || []).some(specialty =>
          specialty.toLowerCase().includes(searchTerm.toLowerCase())
        ) ||
        (educator.advisorProfile?.expertise || []).some(expertise =>
          expertise.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    return educators;
  };

  const handleRequestAdvisory = (educator) => {
    setSelectedEducator(educator);
    setShowRequestModal(true);
  };

  const handleSendMessage = (educator) => {
    // Implementar funcionalidad de mensajería
    alert(`Función de mensajería con ${educator.personalInfo?.firstName} ${educator.personalInfo?.lastName} próximamente disponible`);
  };

  const handleViewProfile = (educator) => {
    setSelectedTutor(selectedTutor?._id === educator._id ? null : educator);
  };

  const filteredEducators = getFilteredEducators();

  return (
    <div className="tutors-page">
      <div className="tutors-header">
        <h2>👨‍🏫 Educadores Disponibles</h2>
        <p>Encuentra tutores y asesores especializados para tu aprendizaje</p>
      </div>

      {/* Filtros */}
      <div className="tutors-filters">
        <div className="search-group">
          <input
            type="text"
            placeholder="Buscar por nombre, especialidad..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="filter-buttons">
          <button
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            Todos ({tutors.length + advisors.length})
          </button>
          <button
            className={`filter-btn ${filter === 'tutors' ? 'active' : ''}`}
            onClick={() => setFilter('tutors')}
          >
            Tutores ({tutors.length})
          </button>
          <button
            className={`filter-btn ${filter === 'advisors' ? 'active' : ''}`}
            onClick={() => setFilter('advisors')}
          >
            Asesores ({advisors.length})
          </button>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Cargando educadores...</p>
        </div>
      ) : (
        <>
          {/* Estadísticas */}
          <div className="educators-stats">
            <div className="stat-item">
              <span className="stat-number">{filteredEducators.length}</span>
              <span className="stat-label">Educadores encontrados</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{tutors.length}</span>
              <span className="stat-label">Tutores disponibles</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{advisors.length}</span>
              <span className="stat-label">Asesores disponibles</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">
                {[...tutors, ...advisors].filter(e => e.tutorProfile?.availability === 'available' || e.advisorProfile?.availability === 'available').length}
              </span>
              <span className="stat-label">Disponibles ahora</span>
            </div>
          </div>

          <div className="educators-grid">
            {filteredEducators.map((educator) => {
              const isTutor = educator.role === 'tutor';
              const profile = isTutor ? educator.tutorProfile : educator.advisorProfile;
              const specialties = isTutor ? profile?.specialties : profile?.expertise;

              return (
                <div key={educator._id} className="educator-card">
                  <div className="educator-header">
                    <div className="educator-avatar">
                      <div className="avatar-circle">
                        <span>{educator.personalInfo?.firstName?.[0]}{educator.personalInfo?.lastName?.[0]}</span>
                      </div>
                      <div className={`role-badge ${isTutor ? 'tutor' : 'advisor'}`}>
                        {isTutor ? '👨‍🏫 Tutor' : '🎓 Asesor'}
                      </div>
                      {profile?.availability === 'available' && (
                        <div className="availability-indicator online">
                          <span>🟢 Disponible</span>
                        </div>
                      )}
                    </div>
                    <div className="educator-info">
                      <h3>{educator.personalInfo?.firstName} {educator.personalInfo?.lastName}</h3>
                      <p className="educator-email">{educator.personalInfo?.email}</p>
                      {profile?.rating && (
                        <div className="educator-rating">
                          <span>⭐ {profile.rating}/5.0</span>
                          <span>({profile.reviewCount || 0} reseñas)</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="educator-details">
                    {specialties && specialties.length > 0 && (
                      <div className="specialties">
                        <h4>🎯 Especialidades:</h4>
                        <div className="specialty-tags">
                          {specialties.slice(0, 3).map((specialty, index) => (
                            <span key={index} className="specialty-tag">{specialty}</span>
                          ))}
                          {specialties.length > 3 && (
                            <span className="specialty-more">+{specialties.length - 3} más</span>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="educator-stats">
                      {profile?.experience && (
                        <div className="stat-item">
                          <span className="stat-label">📅 Experiencia:</span>
                          <span className="stat-value">{profile.experience} años</span>
                        </div>
                      )}
                      {profile?.studentsCount && (
                        <div className="stat-item">
                          <span className="stat-label">👨‍🎓 Estudiantes:</span>
                          <span className="stat-value">{profile.studentsCount}</span>
                        </div>
                      )}
                      {profile?.hourlyRate && (
                        <div className="stat-item">
                          <span className="stat-label">💰 Tarifa/hora:</span>
                          <span className="stat-value">${profile.hourlyRate}</span>
                        </div>
                      )}
                    </div>

                    {profile?.bio && (
                      <div className="bio">
                        <h4>📝 Sobre mí:</h4>
                        <p>{profile.bio.length > 120 ? `${profile.bio.substring(0, 120)}...` : profile.bio}</p>
                      </div>
                    )}
                  </div>

                  <div className="educator-actions">
                    <button
                      className="btn btn-secondary"
                      onClick={() => handleViewProfile(educator)}
                    >
                      {selectedTutor?._id === educator._id ? '✕ Menos info' : 'ℹ️ Ver perfil'}
                    </button>
                    <button
                      className="btn btn-outline"
                      onClick={() => handleSendMessage(educator)}
                    >
                      💬 Mensaje
                    </button>
                    <button
                      className="btn btn-primary"
                      onClick={() => handleRequestAdvisory(educator)}
                    >
                      📅 Solicitar {isTutor ? 'tutoría' : 'asesoría'}
                    </button>
                  </div>

                  {selectedTutor?._id === educator._id && (
                    <div className="educator-expanded">
                      <div className="expanded-content">
                        <h4>📋 Información completa</h4>
                        
                        {profile?.education && (
                          <div className="education">
                            <h5>🎓 Educación:</h5>
                            <p>{profile.education}</p>
                          </div>
                        )}

                        {profile?.certifications && profile.certifications.length > 0 && (
                          <div className="certifications">
                            <h5>🏆 Certificaciones:</h5>
                            <ul>
                              {profile.certifications.map((cert, index) => (
                                <li key={index}>{cert}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {profile?.languages && profile.languages.length > 0 && (
                          <div className="languages">
                            <h5>🌍 Idiomas:</h5>
                            <div className="language-tags">
                              {profile.languages.map((lang, index) => (
                                <span key={index} className="language-tag">{lang}</span>
                              ))}
                            </div>
                          </div>
                        )}

                        {profile?.availability && (
                          <div className="availability">
                            <h5>📅 Disponibilidad:</h5>
                            <p>{profile.availability}</p>
                          </div>
                        )}

                        {profile?.teachingStyle && (
                          <div className="teaching-style">
                            <h5>🎯 Estilo de enseñanza:</h5>
                            <p>{profile.teachingStyle}</p>
                          </div>
                        )}

                        {specialties && specialties.length > 3 && (
                          <div className="all-specialties">
                            <h5>🎯 Todas las especialidades:</h5>
                            <div className="specialty-tags">
                              {specialties.map((specialty, index) => (
                                <span key={index} className="specialty-tag">{specialty}</span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {filteredEducators.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">👨‍🏫</div>
              <h3>No se encontraron educadores</h3>
              <p>Intenta con otros términos de búsqueda o filtros diferentes.</p>
              <div className="empty-suggestions">
                <h4>💡 Sugerencias:</h4>
                <ul>
                  <li>Verifica la ortografía de tu búsqueda</li>
                  <li>Usa términos más generales</li>
                  <li>Prueba con diferentes filtros</li>
                  <li>Busca por materia en lugar de nombre específico</li>
                </ul>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal de solicitud (placeholder) */}
      {showRequestModal && (
        <div className="modal-overlay" onClick={() => setShowRequestModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📅 Solicitar {selectedEducator?.role === 'tutor' ? 'Tutoría' : 'Asesoría'}</h3>
              <button className="modal-close" onClick={() => setShowRequestModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p>Solicitud para: <strong>{selectedEducator?.personalInfo?.firstName} {selectedEducator?.personalInfo?.lastName}</strong></p>
              <p>Esta funcionalidad se completará en la sección de Asesorías.</p>
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowRequestModal(false)}>
                Cancelar
              </button>
              <button className="btn btn-primary" onClick={() => {
                setShowRequestModal(false);
                alert('Redirigiendo a la sección de Asesorías...');
              }}>
                Ir a Asesorías
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tutors;
