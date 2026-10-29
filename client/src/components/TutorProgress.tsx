import type { StudentVideoStats } from '../types/progress';
import type { Appointment } from '../types/appointments';
import type { ApiResponse } from '../types/api';
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../utils/axiosConfig';
import './Dashboard.css';
import './VideoProgress.css';
import './TutorProgress.css';
interface SubjectGroup { subject: string; totalSessions: number; completedSessions: number; topics: Set<string>; lastSession: string | null }
interface StudentGroup {
  id: string | undefined; name: string; email: string | undefined; subjects: Map<string, SubjectGroup>;
  totalAppointments: number; completedAppointments: number; lastActivity: string | null; videoProgress: StudentVideoStats | null;
}
interface SubjectView extends Omit<SubjectGroup, 'topics'> {
  topics: string[]; progress: number; videoProgress: StudentVideoStats['bySubject'][number] | null;
}
interface StudentProgressView extends Omit<StudentGroup, 'subjects'> {
  subjects: SubjectView[]; overallProgress: number; attendance: number; lastActivityFormatted: string;
}

const TutorProgress = () => {
  const [students, setStudents] = useState<StudentProgressView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('all');

  useEffect(() => {
    fetchStudentsProgress();
  }, []);

  const fetchStudentsProgress = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Obtener todas las citas del tutor/asesor
      const appointmentsResponse = await apiClient.get<ApiResponse<Appointment[]>>('/appointments');
      const appointments = appointmentsResponse.data.data || [];
      
      // Filtrar solo citas confirmadas y completadas
      const relevantAppointments = appointments.filter(apt => 
        ['confirmed', 'completed'].includes(apt.status)
      );
      
      // Agrupar por estudiante para calcular progreso
      const studentsMap = new Map<string | undefined, StudentGroup>();
      
      relevantAppointments.forEach(appointment => {
        const studentId = appointment.studentId?._id;
        const studentName = appointment.studentId?.personalInfo 
          ? `${appointment.studentId.personalInfo.firstName || ''} ${appointment.studentId.personalInfo.lastName || ''}`.trim()
          : appointment.studentId?.email || 'Estudiante';
        
        if (!studentsMap.has(studentId)) {
          studentsMap.set(studentId, {
            id: studentId,
            name: studentName,
            email: appointment.studentId?.email,
            subjects: new Map<string, SubjectGroup>(),
            totalAppointments: 0,
            completedAppointments: 0,
            lastActivity: null,
            videoProgress: null // Nuevo campo para progreso de videos
          });
        }
        
        const student = studentsMap.get(studentId);
        if (!student) return;
        const subject = appointment.courseId?.title || 'Sin curso';
        
        // Inicializar materia si no existe
        if (!student.subjects.has(subject)) {
          student.subjects.set(subject, {
            subject: subject,
            totalSessions: 0,
            completedSessions: 0,
            topics: new Set<string>(),
            lastSession: null
          });
        }
        
        const subjectData = student.subjects.get(subject);
        if (!subjectData) return;
        subjectData.totalSessions++;
        
        if (appointment.status === 'completed') {
          subjectData.completedSessions++;
          student.completedAppointments++;
          
          // Actualizar última actividad
          const sessionDate = new Date(appointment.startsAt);
          if (!student.lastActivity || sessionDate > new Date(student.lastActivity)) {
            student.lastActivity = appointment.startsAt;
          }
          if (!subjectData.lastSession || sessionDate > new Date(subjectData.lastSession)) {
            subjectData.lastSession = appointment.startsAt;
          }
        }
        
        if (appointment.topic) {
          subjectData.topics.add(appointment.topic);
        }
        
        student.totalAppointments++;
      });
      
      // Obtener progreso de videos para cada estudiante
      const studentsArray = await Promise.all(
        Array.from(studentsMap.values()).map(async (student) => {
          try {
            // Obtener estadísticas de progreso de videos del estudiante
            const videoStatsResponse = await apiClient.get<ApiResponse<StudentVideoStats>>(`/video-progress/student-stats?studentId=${student.id}`);
            student.videoProgress = videoStatsResponse.data.data;
          } catch (error) {
            console.warn(`Could not load video progress for student ${student.id}:`, error);
            student.videoProgress = { bySubject: [], overall: { totalVideosWatched: 0, totalCompletedVideos: 0 } };
          }
          
          const subjects = Array.from(student.subjects.values()).map(subject => ({
            ...subject,
            progress: subject.totalSessions > 0 
              ? Math.round((subject.completedSessions / subject.totalSessions) * 100)
              : 0,
            topics: Array.from(subject.topics),
            // Agregar progreso de videos por materia
            videoProgress: student.videoProgress?.bySubject?.find(vs => vs.subject === subject.subject) || null
          }));
          
          const overallProgress = student.totalAppointments > 0 
            ? Math.round((student.completedAppointments / student.totalAppointments) * 100)
            : 0;
          
          // Calcular "asistencia" basada en citas completadas vs programadas
          const attendance = student.totalAppointments > 0 
            ? Math.round((student.completedAppointments / student.totalAppointments) * 100)
            : 0;
          
          return {
            ...student,
            subjects,
            overallProgress,
            attendance,
            lastActivityFormatted: student.lastActivity ? formatTimeAgo(student.lastActivity) : 'Sin actividad'
          };
        })
      );
      
      setStudents(studentsArray);
      setError('');
    } catch (err) {
      console.error('Error fetching students progress:', err);
      setError('No se pudo cargar el progreso de los estudiantes');
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return 'Hace menos de 1 hora';
    } else if (diffInHours < 24) {
      return `Hace ${diffInHours} hora${diffInHours > 1 ? 's' : ''}`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `Hace ${diffInDays} día${diffInDays > 1 ? 's' : ''}`;
    }
  };

  const getFilteredStudents = () => {
    if (selectedSubject === 'all') {
      return students;
    }
    return students.filter(student => 
      student.subjects.some(subject => subject.subject === selectedSubject)
    );
  };

  const getAllSubjects = () => {
    const subjects = new Set<string>();
    students.forEach(student => {
      student.subjects.forEach(subject => {
        subjects.add(subject.subject);
      });
    });
    return Array.from(subjects);
  };

  const filteredStudents = getFilteredStudents();
  const allSubjects = getAllSubjects();

  if (loading) {
    return (
      <div className="progreso-page progreso-page--loading" role="status">
        <div className="progreso-page__spinner" />
        <p>Cargando progreso...</p>
      </div>
    );
  }

  return (
    <div className="progreso-page">
          <header className="progreso-page__header">
            <h1 className="progreso-page__title">Progreso</h1>
            <p className="progreso-page__subtitle">Rendimiento y progreso de tus estudiantes</p>
          </header>

          {error && (
            <div className="progreso-page__alert" role="alert">
              {error}
              <button type="button" onClick={fetchStudentsProgress}>Reintentar</button>
            </div>
          )}

          {students.length > 0 && (
            <div className="progreso-page__toolbar">
              <label className="progreso-page__filter-wrap">
                <span className="progreso-page__filter-label">Materia</span>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="progreso-page__select"
                  aria-label="Filtrar por materia"
                >
                  <option value="all">Todas las materias ({students.length} estudiantes)</option>
                  {allSubjects.map(subject => {
                    const count = students.filter(s => s.subjects.some(sub => sub.subject === subject)).length;
                    return (
                      <option key={subject} value={subject}>
                        {subject} ({count} estudiante{count !== 1 ? 's' : ''})
                      </option>
                    );
                  })}
                </select>
              </label>
            </div>
          )}

          {error ? null : filteredStudents.length === 0 ? (
            <div className="progreso-page__empty">
              <h3>
                {students.length === 0
                  ? 'No hay progreso registrado'
                  : 'No hay estudiantes para esta materia'}
              </h3>
              <p>
                {students.length === 0
                  ? 'El progreso aparecerá cuando tengas sesiones completadas con estudiantes.'
                  : 'Selecciona otra materia o "Todas las materias".'}
              </p>
              {students.length === 0 && (
                <div className="progreso-page__help">
                  <h4>¿Cómo funciona el progreso?</h4>
                  <ul>
                    <li>Se calcula con las sesiones completadas</li>
                    <li>Se agrupa por materia para seguimiento detallado</li>
                    <li>La asistencia es sesiones completadas vs programadas</li>
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="progreso-page__grid">
              {filteredStudents.map((student) => (
                <article key={student.id} className="progreso-page__card">
                  <div className="progreso-page__card-header">
                    <h3 className="progreso-page__card-name">{student.name}</h3>
                    <div className="progreso-page__card-badges">
                      {student.subjects.map(subject => (
                        <span key={subject.subject} className="progreso-page__card-badge">
                          {subject.subject}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="progreso-page__card-metrics">
                    <div className="progreso-page__card-metric">
                      <span className="progreso-page__card-metric-label">Progreso general</span>
                      <div className="progreso-page__card-metric-value progreso-page__card-metric-value--circle">
                        {student.overallProgress}%
                      </div>
                      <span className="progreso-page__card-metric-detail">
                        {student.completedAppointments}/{student.totalAppointments} sesiones
                      </span>
                    </div>
                    <div className="progreso-page__card-metric">
                      <span className="progreso-page__card-metric-label">Asistencia</span>
                      <div className="progreso-page__card-progress-bar">
                        <div
                          className="progreso-page__card-progress-fill"
                          style={{ width: `${student.attendance}%` }}
                          role="progressbar"
                          aria-label={`Asistencia de ${student.name}`}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={student.attendance}
                        />
                      </div>
                      <span className="progreso-page__card-metric-detail">{student.attendance}%</span>
                    </div>
                  </div>

                  <div className="progreso-page__card-subjects">
                    <h4>Progreso por materia</h4>
                    {student.subjects.map((subject) => (
                      <div key={subject.subject} className="progreso-page__subject">
                        <div className="progreso-page__subject-head">
                          <span className="progreso-page__subject-name">{subject.subject}</span>
                          <span className="progreso-page__subject-pct">{subject.progress}%</span>
                        </div>
                        <div className="progreso-page__subject-bar">
                          <div
                            className="progreso-page__subject-fill"
                            style={{ width: `${subject.progress}%` }}
                            role="progressbar"
                            aria-label={`Progreso de ${subject.subject} para ${student.name}`}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-valuenow={subject.progress}
                          />
                        </div>
                        <div className="progreso-page__subject-meta">
                          <span>{subject.completedSessions}/{subject.totalSessions} sesiones</span>
                          {subject.topics.length > 0 && (
                            <span>{subject.topics.length} tema{subject.topics.length !== 1 ? 's' : ''}</span>
                          )}
                        </div>
                        {subject.videoProgress && (
                          <div className="progreso-page__subject-videos">
                            <span>Videos: {subject.videoProgress.completedVideos}/{subject.videoProgress.totalVideos} ({subject.videoProgress.completionRate}%)</span>
                            <div className="progreso-page__subject-bar progreso-page__subject-bar--thin">
                              <div
                                className="progreso-page__subject-fill progreso-page__subject-fill--alt"
                                style={{ width: `${subject.videoProgress.completionRate}%` }}
                                  role="progressbar"
                                  aria-label={`Videos completados de ${subject.subject} para ${student.name}`}
                                  aria-valuemin={0}
                                  aria-valuemax={100}
                                  aria-valuenow={subject.videoProgress.completionRate}
                              />
                            </div>
                          </div>
                        )}
                        {subject.topics.length > 0 && (
                          <div className="progreso-page__subject-tags">
                            {subject.topics.slice(0, 3).map((topic, index) => (
                              <span key={index} className="progreso-page__subject-tag">{topic}</span>
                            ))}
                            {subject.topics.length > 3 && (
                              <span className="progreso-page__subject-tag progreso-page__subject-tag--more">+{subject.topics.length - 3}</span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="progreso-page__card-footer">
                    <span className="progreso-page__card-activity">
                      Última actividad: {student.lastActivityFormatted}
                    </span>
                    <div className="progreso-page__card-actions">
                      <Link
                        className="progreso-page__btn"
                        to="/dashboard/estudiantes"
                      >
                        Ver estudiantes
                      </Link>
                      <Link
                        className="progreso-page__btn progreso-page__btn--outline"
                        to="/dashboard/videos-tutor"
                      >
                        Gestionar videos
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
    </div>
  );
};

export default TutorProgress;
