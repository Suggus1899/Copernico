import { getStudentStatus } from '../utils/appointments';
import type { PersonalInfo, UserSummary } from '../types/auth';
import type { ApiResponse } from '../types/api';
import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../utils/axiosConfig';
import './Dashboard.css';
import './TutorStudents.css';
interface StudentView extends UserSummary {
  personalInfo?: PersonalInfo & { phoneNumber?: string };
  stats?: { totalAppointments: number; completedAppointments: number; lastAppointmentDate: string | null; subjects: string[] };
}
interface TutorStudentsState {
  students: StudentView[]; loading: boolean; error: string | null;
}

class TutorStudents extends Component<Record<string, never>, TutorStudentsState> {
  state: TutorStudentsState = {
    students: [],
    loading: true,
    error: null
  };

  componentDidMount() {
    this.loadStudents();
  }

  loadStudents = async () => {
    try {
      this.setState({ loading: true, error: null });
      const response = await apiClient.get<ApiResponse<StudentView[]>>('/appointments/my-students');
      
      this.setState({
        students: response.data.data || [],
        loading: false,
        error: null
      });
    } catch (error) {
      console.error('Error loading students:', error);
      this.setState({
        error: 'Error al cargar los estudiantes',
        loading: false
      });
    }
  };

  formatLastActivity = (dateString: string | null | undefined) => {
    if (!dateString) return 'Sin actividad';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return 'Hace unos minutos';
    } else if (diffInHours < 24) {
      return `Hace ${Math.floor(diffInHours)} horas`;
    } else if (diffInHours < 168) { // 7 días
      return `Hace ${Math.floor(diffInHours / 24)} días`;
    } else {
      return date.toLocaleDateString('es-ES');
    }
  };

  getStudentStatus = getStudentStatus;

  render() {
    const { students, loading, error } = this.state;
    const activeCount = students.filter(s => this.getStudentStatus(s) === 'active').length;
    const totalCitas = students.reduce((total, s) => total + (s.stats?.totalAppointments || 0), 0);

    return (
      <div className="estudiantes-page">
            <header className="estudiantes-page__header">
              <h1 className="estudiantes-page__title">Mis Estudiantes</h1>
              <p className="estudiantes-page__subtitle">Estudiantes con citas confirmadas o completadas</p>
            </header>

            {error && (
              <div className="estudiantes-page__alert" role="alert">
                {error} <button type="button" onClick={this.loadStudents}>Reintentar</button>
              </div>
            )}

            {loading ? (
              <div className="estudiantes-page estudiantes-page--loading" role="status">
                <div className="estudiantes-page__spinner" />
                <p>Cargando estudiantes...</p>
              </div>
            ) : (
              <>
                {students.length > 0 && (
                  <div className="estudiantes-page__stats">
                    <div className="estudiantes-page__stat-card">
                      <span className="estudiantes-page__stat-num">{students.length}</span>
                      <span className="estudiantes-page__stat-label">Total estudiantes</span>
                    </div>
                    <div className="estudiantes-page__stat-card">
                      <span className="estudiantes-page__stat-num estudiantes-page__stat-num--active">{activeCount}</span>
                      <span className="estudiantes-page__stat-label">Activos</span>
                    </div>
                    <div className="estudiantes-page__stat-card">
                      <span className="estudiantes-page__stat-num estudiantes-page__stat-num--citas">{totalCitas}</span>
                      <span className="estudiantes-page__stat-label">Total citas</span>
                    </div>
                  </div>
                )}

                {students.length > 0 ? (
                  <div className="estudiantes-page__grid">
                    {students.map((student: StudentView) => {
                      const studentName = `${student.personalInfo?.firstName || ''} ${student.personalInfo?.lastName || ''}`.trim() || 'Sin nombre';
                      const status = this.getStudentStatus(student);
                      const stats = student.stats || { totalAppointments: 0, completedAppointments: 0, lastAppointmentDate: null, subjects: [] };
                      return (
                        <article key={student._id} className="estudiantes-page__card">
                          <div className="estudiantes-page__card-header">
                            <div className="estudiantes-page__card-info">
                            <h3 className="estudiantes-page__card-name">{studentName}</h3>
                              <p className="estudiantes-page__card-email">{student.email}</p>
                            </div>
                            <span className={`estudiantes-page__card-status estudiantes-page__card-status--${status}`}>
                              {status === 'active' ? 'Activo' : 'Inactivo'}
                            </span>
                          </div>

                          <div className="estudiantes-page__card-body">
                            {stats.subjects && stats.subjects.length > 0 && (
                              <div className="estudiantes-page__card-subjects">
                                <h4>Materias</h4>
                                <div className="estudiantes-page__card-tags">
                                  {stats.subjects.map((subject, index) => (
                                    <span key={index} className="estudiantes-page__card-tag">{subject}</span>
                                  ))}
                                </div>
                              </div>
                            )}

                            <div className="estudiantes-page__card-metrics">
                              <div className="estudiantes-page__card-metric">
                                <span className="estudiantes-page__card-metric-value">{stats.totalAppointments}</span>
                                <span className="estudiantes-page__card-metric-label">Citas totales</span>
                                <span className="estudiantes-page__card-metric-detail">{stats.completedAppointments} completadas</span>
                              </div>
                              <div className="estudiantes-page__card-metric">
                                <span className="estudiantes-page__card-metric-value estudiantes-page__card-metric-value--text">
                                  {this.formatLastActivity(stats.lastAppointmentDate)}
                                </span>
                                <span className="estudiantes-page__card-metric-label">Última actividad</span>
                              </div>
                            </div>

                            {(student.personalInfo?.phoneNumber || student.personalInfo?.phone) && (
                              <div className="estudiantes-page__card-contact">
                                {student.personalInfo.phoneNumber || student.personalInfo.phone}
                              </div>
                            )}

                            <div className="estudiantes-page__card-actions">
                              <Link
                                className="estudiantes-page__btn-outline"
                                to={`/dashboard/mensajes?userId=${encodeURIComponent(student._id)}`}
                              >
                                Enviar mensaje
                              </Link>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : error ? null : (
                  <div className="estudiantes-page__empty">
                    <h3>No tienes estudiantes aún</h3>
                    <p>Cuando aceptes solicitudes de asesoría, los estudiantes aparecerán aquí.</p>
                    <div className="estudiantes-page__help">
                      <h4>¿Cómo obtener estudiantes?</h4>
                      <ul>
                        <li>Los estudiantes envían solicitudes de asesoría desde la plataforma</li>
                        <li>Recibes notificaciones de las solicitudes</li>
                        <li>Acepta las solicitudes que te interesen</li>
                        <li>Los estudiantes aparecerán automáticamente aquí</li>
                      </ul>
                    </div>
                  </div>
                )}
              </>
            )}
      </div>
    );
  }
}

export default TutorStudents;
