import type { CourseSummary } from '../types/appointments';
import type { TutorDirectoryEntry } from '../types/auth';
import type { ApiResponse } from '../types/api';
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../utils/axiosConfig';
import { getApiErrorMessage } from '../utils/apiError';
import './Dashboard.css';
import './Tutors.css';
const EMPTY_REQUEST = {
  tutorId: '',
  courseId: '',
  topic: '',
  date: '',
  time: '',
  durationMinutes: 60,
};

/** Fecha de hoy en la zona local (YYYY-MM-DD) para el selector de fecha. */
const localToday = () => {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 10);
};

const Tutors = () => {
  const navigate = useNavigate();
  const requestDialogRef = useRef<HTMLDialogElement>(null);
  const [tutors, setTutors] = useState<TutorDirectoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTutor, setSelectedTutor] = useState<TutorDirectoryEntry | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedEducator, setSelectedEducator] = useState<TutorDirectoryEntry | null>(null);
  const [requestForm, setRequestForm] = useState(EMPTY_REQUEST);
  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [coursesError, setCoursesError] = useState('');
  const [requestFeedback, setRequestFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchTutors = async () => {
    try {
      setLoading(true);
      setError('');
      const tutorsRes = await apiClient.get<ApiResponse<TutorDirectoryEntry[]> & { meta?: { excludedEducators: number } }>('/users/available-educators', {
        params: { role: 'tutor', limit: 100 }
      });
      setTutors(tutorsRes.data.data || []);
    } catch (err) {
      console.error('Error fetching available tutors:', err);
      setError('No se pudieron cargar los tutores disponibles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchTutors();
  }, []);

  useEffect(() => {
    const dialog = requestDialogRef.current;
    if (!dialog) return;
    if (showRequestModal && !dialog.open) dialog.showModal();
    if (!showRequestModal && dialog.open) dialog.close();
  }, [showRequestModal]);

  const getFilteredTutors = () => {
    let filteredTutors = tutors;

    if (searchTerm) {
      filteredTutors = tutors.filter(tutor =>
        `${tutor.personalInfo?.firstName} ${tutor.personalInfo?.lastName}`
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        (tutor.personalInfo?.email || tutor.email).toLowerCase().includes(searchTerm.toLowerCase()) ||
        (tutor.tutorProfile?.specialties || []).some(specialty =>
          specialty.toLowerCase().includes(searchTerm.toLowerCase())
        ) ||
        (tutor.academicProfile?.skills || []).some(skill =>
          skill.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    return filteredTutors;
  };

  const loadTutorCourses = async (tutorId: string) => {
    setCourses([]);
    setCoursesError('');
    try {
      const res = await apiClient.get<ApiResponse<CourseSummary[]>>(`/appointments/tutors/${tutorId}/courses`);
      setCourses(res.data.data || []);
    } catch (err) {
      setCoursesError(getApiErrorMessage(err, 'No se pudieron cargar los cursos del tutor'));
    }
  };

  const handleRequestTutoring = (tutor: TutorDirectoryEntry) => {
    setRequestFeedback(null);
    setSelectedEducator(tutor);
    setRequestForm({ ...EMPTY_REQUEST, tutorId: tutor._id });
    setShowRequestModal(true);
    loadTutorCourses(tutor._id);
  };

  const handleRequestSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const startsAt = new Date(`${requestForm.date}T${requestForm.time}`);
      const appointmentData = {
        tutorId: requestForm.tutorId,
        courseId: requestForm.courseId,
        startsAt: startsAt.toISOString(),
        durationMinutes: Number(requestForm.durationMinutes),
        ...(requestForm.topic.trim() && { topic: requestForm.topic.trim() }),
      };

      console.log('Enviando datos de tutoría:', appointmentData);

      const response = await apiClient.post('/appointments', appointmentData);
      console.log('Respuesta del servidor:', response.data);
      
      setRequestFeedback({ type: 'success', message: 'Solicitud enviada. El tutor deberá confirmarla.' });
      setShowRequestModal(false);
      setRequestForm(EMPTY_REQUEST);
    } catch (error) {
      console.error('Error creating appointment:', error);
      
      const errorMessage = getApiErrorMessage(error, 'Error al enviar la solicitud. Inténtalo nuevamente.');
      
      setRequestFeedback({ type: 'error', message: errorMessage });
    }
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setRequestForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSendMessage = (tutor: TutorDirectoryEntry) => {
    if (!tutor?._id) return;
    navigate(`/dashboard/mensajes?userId=${encodeURIComponent(tutor._id)}`);
  };

  const handleViewProfile = (tutor: TutorDirectoryEntry) => {
    setSelectedTutor(selectedTutor?._id === tutor._id ? null : tutor);
  };

  const filteredTutors = getFilteredTutors();

  return (
    <div className="tutors-page">
      <header className="tutors-header">
        <h1>Tutores disponibles</h1>
        <p>Encuentra tutores especializados para reforzar tus conocimientos académicos</p>
        <div className="info-banner">
          <div className="info-icon" aria-hidden="true">i</div>
          <div className="info-content">
            <strong>Nota:</strong> Solo se muestran tutores disponibles. Los tutores con los que ya tienes citas confirmadas no aparecen en esta lista.
          </div>
        </div>
      </header>

      {/* Filtros + estadísticas */}
      <section className="tutors-toolbar">
        <div className="tutors-filters">
          <input
            type="text"
            placeholder="Buscar por nombre, especialidad..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="tutors-search"
            aria-label="Buscar tutores"
          />
        </div>
        <div className="tutors-stats">
          <div className="stat-item">
            <span className="stat-number">{filteredTutors.length}</span>
            <span className="stat-label">Tutores encontrados</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{tutors.length}</span>
            <span className="stat-label">Tutores disponibles</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">
              {tutors.filter(t => t.tutorProfile?.available).length}
            </span>
            <span className="stat-label">Disponibles ahora</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">
              {tutors.reduce((sum, t) => sum + (t.tutorProfile?.specialties?.length || 0), 0)}
            </span>
            <span className="stat-label">Especialidades totales</span>
          </div>
        </div>
      </section>

      {error && <div className="alert alert-danger" role="alert">{error} <button type="button" onClick={() => void fetchTutors()}>Reintentar</button></div>}

      {!showRequestModal && requestFeedback?.type === 'success' && (
        <p className="tutors-feedback tutors-feedback--success" role="status">{requestFeedback.message}</p>
      )}

      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Cargando tutores...</p>
        </div>
      ) : (
        <>
          <div className="educators-grid">
            {filteredTutors.map((tutor: TutorDirectoryEntry) => {
              const profile = tutor.tutorProfile;
              const specialties = profile?.specialties || [];

              return (
                <div key={tutor._id} className="educator-card">
                  <div className="educator-header">
                    <div className="educator-avatar">
                      <div className="avatar-circle">
                        {tutor.personalInfo?.avatar ? (
                          <img src={tutor.personalInfo.avatar} alt="Avatar" className="avatar-image" />
                        ) : (
                          <span>{tutor.personalInfo?.firstName?.[0]}{tutor.personalInfo?.lastName?.[0]}</span>
                        )}
                      </div>
                      <div className="role-badge tutor">
                        Tutor
                      </div>
                    </div>
                    <div className="educator-info">
                      <h3>{tutor.personalInfo?.firstName} {tutor.personalInfo?.lastName}</h3>
                      <p className="educator-email">{tutor.personalInfo?.email || tutor.email}</p>
                      {profile?.available && <span className="availability-indicator online">Disponible</span>}
                      {profile?.rating && (
                        <div className="educator-rating">
                          <span>Calificación {profile.rating}/5.0</span>
                          <span>({profile.totalSessions || 0} sesiones)</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="educator-details">
                    {profile?.specialties && profile.specialties.length > 0 && (
                      <div className="specialties">
                        <h4>Especialidades</h4>
                        <div className="specialty-tags">
                          {profile.specialties.slice(0, 3).map((specialty, index) => (
                            <span key={index} className="specialty-tag">{specialty}</span>
                          ))}
                          {profile.specialties.length > 3 && (
                            <span className="specialty-more">+{profile.specialties.length - 3} más</span>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="educator-stats">
                      {tutor.academicProfile?.experienceYears && (
                        <div className="stat-item">
                          <span className="stat-label">Experiencia</span>
                          <span className="stat-value">{tutor.academicProfile.experienceYears} años</span>
                        </div>
                      )}
                      {profile?.totalSessions && (
                        <div className="stat-item">
                          <span className="stat-label">Sesiones</span>
                          <span className="stat-value">{profile.totalSessions}</span>
                        </div>
                      )}
                      {profile?.hourlyRate && (
                        <div className="stat-item">
                          <span className="stat-label">Tarifa por hora</span>
                          <span className="stat-value">${profile.hourlyRate}</span>
                        </div>
                      )}
                    </div>

                    {tutor.personalInfo?.bio && (
                      <div className="bio">
                        <h4>Sobre mí</h4>
                        <p>{tutor.personalInfo.bio.length > 120 ? `${tutor.personalInfo.bio.substring(0, 120)}...` : tutor.personalInfo.bio}</p>
                      </div>
                    )}
                  </div>

                  <div className="educator-actions">
                    <button
                      className="btn btn-secondary"
                      onClick={() => handleViewProfile(tutor)}
                    >
                      {selectedTutor?._id === tutor._id ? 'Ocultar perfil' : 'Ver perfil'}
                    </button>
                    <button
                      className="btn btn-primary"
                      onClick={() => handleRequestTutoring(tutor)}
                    >
                      Solicitar tutoría
                    </button>
                  </div>

                  {selectedTutor?._id === tutor._id && (
                    <div className="educator-expanded">
                      <div className="expanded-content">
                        <h4>📋 Información completa del tutor</h4>
                        
                        {/* Información personal */}
                        <div className="personal-info">
                          <h5>Información personal</h5>
                          <div className="info-grid">
                            <div className="info-item">
                              <span className="info-label">Nombre:</span>
                              <span className="info-value">
                                {[tutor.personalInfo?.firstName, tutor.personalInfo?.lastName].filter(Boolean).join(' ') || 'No especificado'}
                              </span>
                            </div>
                            <div className="info-item">
                              <span className="info-label">Email:</span>
                              <span className="info-value">{tutor.personalInfo?.email || tutor.email || 'No especificado'}</span>
                            </div>
                            <div className="info-item">
                              <span className="info-label">Teléfono:</span>
                              <span className="info-value">{tutor.personalInfo?.phone || 'No especificado'}</span>
                            </div>
                            <div className="info-item">
                              <span className="info-label">Ciudad:</span>
                              <span className="info-value">
                                {[tutor.personalInfo?.city, tutor.personalInfo?.country].filter(Boolean).join(', ') || 'No especificado'}
                              </span>
                            </div>
                          </div>
                          <div className="bio-full">
                            <h6>Biografía</h6>
                            <p>{tutor.personalInfo?.bio || 'No especificada'}</p>
                          </div>
                        </div>

                        {/* Información Académica - siempre visible con todos los campos */}
                        <div className="academic-info">
                          <h5>Información académica</h5>
                          <div className="info-grid">
                            <div className="info-item">
                              <span className="info-label">Especialización:</span>
                              <span className="info-value">{tutor.personalInfo?.specialty || 'No especificada'}</span>
                            </div>
                            <div className="info-item">
                              <span className="info-label">Títulos y Grados:</span>
                              <span className="info-value">{tutor.personalInfo?.degrees || 'No especificados'}</span>
                            </div>
                            <div className="info-item">
                              <span className="info-label">Experiencia Docente:</span>
                              <span className="info-value">{tutor.personalInfo?.experience || 'No especificada'}</span>
                            </div>
                            <div className="info-item">
                              <span className="info-label">Certificaciones:</span>
                              <span className="info-value">{tutor.personalInfo?.certifications || 'No especificadas'}</span>
                            </div>
                            <div className="info-item">
                              <span className="info-label">Institución:</span>
                              <span className="info-value">{tutor.academicProfile?.institution || 'No especificada'}</span>
                            </div>
                            <div className="info-item">
                              <span className="info-label">Departamento:</span>
                              <span className="info-value">{tutor.academicProfile?.department || 'No especificado'}</span>
                            </div>
                            <div className="info-item">
                              <span className="info-label">Título académico:</span>
                              <span className="info-value">{tutor.academicProfile?.title || 'No especificado'}</span>
                            </div>
                            <div className="info-item">
                              <span className="info-label">Años de experiencia:</span>
                              <span className="info-value">
                                {tutor.academicProfile?.experienceYears != null ? `${tutor.academicProfile.experienceYears} años` : 'No especificado'}
                              </span>
                            </div>
                          </div>
                          {tutor.academicProfile?.skills && tutor.academicProfile.skills.length > 0 && (
                            <div className="skills">
                              <h6>Habilidades</h6>
                              <div className="skill-tags">
                                {tutor.academicProfile.skills.map((skill, index) => (
                                  <span key={index} className="skill-tag">{skill}</span>
                                ))}
                              </div>
                            </div>
                          )}
                          {tutor.tutorProfile?.specializationAreas && tutor.tutorProfile.specializationAreas.length > 0 && (
                            <div className="specialization-areas">
                              <h6>Áreas de especialización</h6>
                              <div className="specialty-tags">
                                {tutor.tutorProfile.specializationAreas.map((area, index) => (
                                  <span key={index} className="specialty-tag">{area}</span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Perfil de tutor */}
                        {tutor.tutorProfile && (
                          <div className="tutor-info">
                            <h5>Perfil de tutor</h5>
                            <div className="info-grid">
                              {tutor.tutorProfile.hourlyRate && (
                                <div className="info-item">
                                  <span className="info-label">Tarifa por hora:</span>
                                  <span className="info-value">${tutor.tutorProfile.hourlyRate}</span>
                                </div>
                              )}
                              {tutor.tutorProfile.maxStudents && (
                                <div className="info-item">
                                  <span className="info-label">Máximo estudiantes:</span>
                                  <span className="info-value">{tutor.tutorProfile.maxStudents}</span>
                                </div>
                              )}
                              {tutor.tutorProfile.totalSessions && (
                                <div className="info-item">
                                  <span className="info-label">Sesiones totales:</span>
                                  <span className="info-value">{tutor.tutorProfile.totalSessions}</span>
                                </div>
                              )}
                              {tutor.tutorProfile.rating && (
                                <div className="info-item">
                                  <span className="info-label">Calificación:</span>
                                  <span className="info-value">{tutor.tutorProfile.rating}/5.0</span>
                                </div>
                              )}
                              <div className="info-item">
                                <span className="info-label">Estado:</span>
                                <span className={`info-value ${tutor.tutorProfile.available ? 'available' : 'unavailable'}`}>
                                  {tutor.tutorProfile.available ? 'Disponible' : 'No disponible'}
                                </span>
                              </div>
                            </div>
                            
                            {tutor.tutorProfile.specialties && tutor.tutorProfile.specialties.length > 0 && (
                              <div className="specialties-full">
                                <h6>Especialidades</h6>
                                <div className="specialty-tags">
                                  {tutor.tutorProfile.specialties.map((specialty, index) => (
                                    <span key={index} className="specialty-tag">{specialty}</span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {tutor.tutorProfile.teachingMethods && tutor.tutorProfile.teachingMethods.length > 0 && (
                              <div className="teaching-methods">
                                <h6>Métodos de enseñanza</h6>
                                <div className="method-tags">
                                  {tutor.tutorProfile.teachingMethods.map((method, index) => (
                                    <span key={index} className="method-tag">{method}</span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Información de contacto y disponibilidad */}
                        <div className="contact-info">
                          <h5>Contacto y disponibilidad</h5>
                          <div className="contact-grid">
                            <div className="contact-item">
                              <span className="contact-label">📧 Email:</span>
                              <span className="contact-value">{tutor.email}</span>
                            </div>
                            <div className="contact-item">
                              <span className="contact-label">Miembro desde</span>
                              <span className="contact-value">
                                {new Date(tutor.createdAt).toLocaleDateString('es-ES', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })}
                              </span>
                            </div>
                            <div className="contact-item">
                              <span className="contact-label">Última actualización</span>
                              <span className="contact-value">
                                {new Date(tutor.updatedAt).toLocaleDateString('es-ES', {
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
                              setSelectedTutor(null);
                              handleRequestTutoring(tutor);
                            }}
                          >
                            Solicitar tutoría ahora
                          </button>
                          <button
                            className="btn btn-outline"
                            onClick={() => handleSendMessage(tutor)}
                          >
                            Enviar mensaje
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {filteredTutors.length === 0 && !loading && !error && (
            <div className="empty-state">
              <h3>No se encontraron tutores disponibles</h3>
              {searchTerm ? (
                <p>No hay tutores disponibles que coincidan con tu búsqueda.</p>
              ) : (
                <p>No hay tutores disponibles en este momento. Los tutores con los que ya tienes citas confirmadas no se muestran aquí.</p>
              )}
              <div className="empty-suggestions">
                <h4>Sugerencias</h4>
                <ul>
                  {searchTerm ? (
                    <>
                      <li>Verifica la ortografía de tu búsqueda</li>
                      <li>Usa términos más generales</li>
                      <li>Busca por materia en lugar de nombre específico</li>
                    </>
                  ) : (
                    <>
                      <li>Los tutores con citas confirmadas contigo no aparecen en esta lista</li>
                      <li>Revisa la sección "Mis Cursos" para ver tus tutorías activas</li>
                      <li>Contacta al administrador si necesitas más tutores</li>
                    </>
                  )}
                  <li>Los tutores se especializan en refuerzo académico</li>
                </ul>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal de solicitud de tutoría */}
        <dialog
          ref={requestDialogRef}
          className="modal-content large-modal tutors-dialog"
          aria-labelledby="request-tutoring-title"
          onClose={() => setShowRequestModal(false)}
          onClick={(event) => {
            if (event.target === event.currentTarget) setShowRequestModal(false);
          }}
        >
            <div className="modal-header">
              <h2 id="request-tutoring-title">Solicitar tutoría</h2>
              <button type="button" className="modal-close" onClick={() => setShowRequestModal(false)} aria-label="Cerrar solicitud">×</button>
            </div>
            <div className="modal-body">
              <div className="tutor-info-header">
                <p><strong>Tutor seleccionado:</strong> {selectedEducator?.personalInfo?.firstName} {selectedEducator?.personalInfo?.lastName}</p>
                {selectedEducator?.tutorProfile?.specialties && (
                  <div className="tutor-specialties">
                    <h4>Especialidades</h4>
                    <div className="specialty-tags">
                      {selectedEducator.tutorProfile.specialties.map((specialty, index) => (
                        <span key={index} className="specialty-tag">{specialty}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <form onSubmit={handleRequestSubmit}>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="request-course">Curso *</label>
                    <select
                      id="request-course"
                      name="courseId"
                      value={requestForm.courseId}
                      onChange={handleFormChange}
                      disabled={courses.length === 0}
                      required
                    >
                      <option value="">{courses.length === 0 ? 'Sin cursos disponibles' : 'Selecciona un curso'}</option>
                      {courses.map((course) => (
                        <option key={course._id} value={course._id}>{course.title}</option>
                      ))}
                    </select>
                    {coursesError && <p role="alert">{coursesError}</p>}
                    {!coursesError && requestForm.tutorId && courses.length === 0 && (
                      <p>Este tutor todavía no tiene cursos publicados.</p>
                    )}
                  </div>
                  <div className="form-group">
                    <label htmlFor="request-topic">Tema (opcional)</label>
                    <input
                      id="request-topic"
                      type="text"
                      name="topic"
                      value={requestForm.topic}
                      onChange={handleFormChange}
                      placeholder="Tema particular (opcional)"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="request-date">Fecha *</label>
                    <input
                      id="request-date"
                      type="date"
                      name="date"
                      value={requestForm.date}
                      onChange={handleFormChange}
                      min={localToday()}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="request-time">Hora *</label>
                    <input
                      id="request-time"
                      type="time"
                      name="time"
                      value={requestForm.time}
                      onChange={handleFormChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="request-duration">Duración</label>
                    <select
                      id="request-duration"
                      name="durationMinutes"
                      value={requestForm.durationMinutes}
                      onChange={handleFormChange}
                    >
                      <option value={30}>30 minutos</option>
                      <option value={60}>1 hora</option>
                      <option value={90}>1.5 horas</option>
                      <option value={120}>2 horas</option>
                    </select>
                  </div>
                </div>

                {requestFeedback?.type === 'error' && <p className="tutors-feedback tutors-feedback--error" role="alert">{requestFeedback.message}</p>}

                <div className="modal-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowRequestModal(false)}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={courses.length === 0}>
                    Enviar solicitud
                  </button>
                </div>
              </form>
            </div>
        </dialog>
    </div>
  );
};

export default Tutors;
