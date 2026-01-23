import React, { useEffect, useState } from 'react';
import apiClient from '../utils/axiosConfig';
import SidebarMenu from './SidebarMenu';
import './Dashboard.css';

const Tutors = () => {
  const [tutors, setTutors] = useState([]);
  const [advisors, setAdvisors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTutor, setSelectedTutor] = useState(null);
  const [filter, setFilter] = useState('all'); // all, tutors, advisors
  const [searchTerm, setSearchTerm] = useState('');

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
          expertise.toLowerCase().includes(expertise.toLowerCase())
        )
      );
    }

    return educators;
  };

  const handleRequestAdvisory = async (educator) => {
    try {
      // This would typically create an appointment request
      alert(`Solicitud de asesoría enviada a ${educator.personalInfo?.firstName} ${educator.personalInfo?.lastName}`);
    } catch (error) {
      console.error('Error requesting advisory:', error);
      alert('Error al enviar la solicitud. Inténtalo nuevamente.');
    }
  };

  const filteredEducators = getFilteredEducators();

  return (
    <div className="dashboard-container">
      <SidebarMenu />
      <div className="dashboard-content">
        <div className="tutors-header">
          <h2>👨‍🏫 Educadores Disponibles</h2>
          <p>Encuentra tutores y asesores para tu aprendizaje</p>
        </div>

        {/* Filtros */}
        <div className="tutors-filters">
          <div className="filter-group">
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
            <div className="educators-stats">
              <div className="stat-item">
                <span className="stat-number">{filteredEducators.length}</span>
                <span className="stat-label">Educadores encontrados</span>
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
                      </div>
                      <div className="educator-info">
                        <h3>{educator.personalInfo?.firstName} {educator.personalInfo?.lastName}</h3>
                        <p className="educator-email">{educator.personalInfo?.email}</p>
                      </div>
                    </div>

                    <div className="educator-details">
                      {specialties && specialties.length > 0 && (
                        <div className="specialties">
                          <h4>Especialidades:</h4>
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

                      {profile?.experience && (
                        <div className="experience">
                          <h4>Experiencia:</h4>
                          <p>{profile.experience} años</p>
                        </div>
                      )}

                      {profile?.bio && (
                        <div className="bio">
                          <h4>Sobre mí:</h4>
                          <p>{profile.bio.length > 100 ? `${profile.bio.substring(0, 100)}...` : profile.bio}</p>
                        </div>
                      )}
                    </div>

                    <div className="educator-actions">
                      <button
                        className="btn btn-secondary"
                        onClick={() => setSelectedTutor(selectedTutor?._id === educator._id ? null : educator)}
                      >
                        {selectedTutor?._id === educator._id ? '✕ Menos info' : 'ℹ️ Más info'}
                      </button>
                      <button
                        className="btn btn-primary"
                        onClick={() => handleRequestAdvisory(educator)}
                      >
                        📅 Solicitar asesoría
                      </button>
                    </div>

                    {selectedTutor?._id === educator._id && (
                      <div className="educator-expanded">
                        <div className="expanded-content">
                          <h4>Información completa</h4>
                          {profile?.education && (
                            <div className="education">
                              <h5>Educación:</h5>
                              <p>{profile.education}</p>
                            </div>
                          )}

                          {profile?.certifications && profile.certifications.length > 0 && (
                            <div className="certifications">
                              <h5>Certificaciones:</h5>
                              <ul>
                                {profile.certifications.map((cert, index) => (
                                  <li key={index}>{cert}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {profile?.availability && (
                            <div className="availability">
                              <h5>Disponibilidad:</h5>
                              <p>{profile.availability}</p>
                            </div>
                          )}

                          {profile?.hourlyRate && (
                            <div className="pricing">
                              <h5>Tarifa por hora:</h5>
                              <p className="price">${profile.hourlyRate}</p>
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
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Tutors;
