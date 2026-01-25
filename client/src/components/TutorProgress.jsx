import React, { useEffect, useState } from 'react';
import TutorSidebarMenu from './TutorSidebarMenu';
import apiClient from '../utils/axiosConfig';
import './Dashboard.css';

const TutorProgress = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [userRole, setUserRole] = useState('tutor');

  useEffect(() => {
    fetchUserRole();
    fetchStudentsProgress();
  }, []);

  const fetchUserRole = async () => {
    try {
      const response = await apiClient.get('/auth/profile');
      const userData = response.data.data || response.data;
      setUserRole(userData.role);
    } catch (error) {
      console.error('Error fetching user role:', error);
    }
  };

  const fetchStudentsProgress = async () => {
    try {
      setLoading(true);
      
      // Obtener todas las citas del tutor/asesor
      const appointmentsResponse = await apiClient.get('/appointments');
      const appointments = appointmentsResponse.data.data || [];
      
      // Filtrar solo citas confirmadas y completadas
      const relevantAppointments = appointments.filter(apt => 
        ['confirmed', 'completed'].includes(apt.status)
      );
      
      // Agrupar por estudiante para calcular progreso
      const studentsMap = new Map();
      
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
            subjects: new Map(),
            totalAppointments: 0,
            completedAppointments: 0,
            lastActivity: null
          });
        }
        
        const student = studentsMap.get(studentId);
        const subject = appointment.subject;
        
        // Inicializar materia si no existe
        if (!student.subjects.has(subject)) {
          student.subjects.set(subject, {
            subject: subject,
            totalSessions: 0,
            completedSessions: 0,
            topics: new Set(),
            lastSession: null
          });
        }
        
        const subjectData = student.subjects.get(subject);
        subjectData.totalSessions++;
        
        if (appointment.status === 'completed') {
          subjectData.completedSessions++;
          student.completedAppointments++;
          
          // Actualizar última actividad
          const sessionDate = new Date(appointment.scheduledDate);
          if (!student.lastActivity || sessionDate > new Date(student.lastActivity)) {
            student.lastActivity = appointment.scheduledDate;
          }
          if (!subjectData.lastSession || sessionDate > new Date(subjectData.lastSession)) {
            subjectData.lastSession = appointment.scheduledDate;
          }
        }
        
        if (appointment.topic) {
          subjectData.topics.add(appointment.topic);
        }
        
        student.totalAppointments++;
      });
      
      // Convertir a array y calcular estadísticas
      const studentsArray = Array.from(studentsMap.values()).map(student => {
        const subjects = Array.from(student.subjects.values()).map(subject => ({
          ...subject,
          progress: subject.totalSessions > 0 
            ? Math.round((subject.completedSessions / subject.totalSessions) * 100)
            : 0,
          topics: Array.from(subject.topics)
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
      });
      
      setStudents(studentsArray);
      setError('');
    } catch (err) {
      console.error('Error fetching students progress:', err);
      setError('No se pudo cargar el progreso de los estudiantes');
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    
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
    const subjects = new Set();
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
      <div className="dashboard-container">
        <TutorSidebarMenu userRole={userRole} />
        <div className="dashboard-content">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Cargando progreso de estudiantes...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <TutorSidebarMenu userRole={userRole} />
      <div className="dashboard-content">
        <div className="dashboard-header">
          <h1>📊 Progreso de Estudiantes</h1>
          <p>Monitorea el rendimiento y progreso de tus estudiantes</p>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}

        <div className="dashboard-main">
          {students.length > 0 && (
            <div className="progress-controls">
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="course-filter"
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
            </div>
          )}

          {filteredStudents.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📊</div>
              <h3>
                {students.length === 0 
                  ? 'No hay estudiantes con progreso registrado' 
                  : 'No se encontraron estudiantes para la materia seleccionada'
                }
              </h3>
              <p>
                {students.length === 0 
                  ? 'El progreso aparecerá aquí cuando tengas sesiones completadas con estudiantes'
                  : 'Selecciona otra materia o "Todas las materias" para ver más estudiantes'
                }
              </p>
              {students.length === 0 && (
                <div className="help-text">
                  <h4>💡 ¿Cómo funciona el progreso?</h4>
                  <ul>
                    <li>El progreso se calcula basado en sesiones completadas</li>
                    <li>Cada sesión completada aumenta el progreso del estudiante</li>
                    <li>Se agrupan por materia para un seguimiento detallado</li>
                    <li>La asistencia se basa en sesiones completadas vs programadas</li>
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="students-progress">
              {filteredStudents.map((student) => (
                <div key={student.id} className="student-progress-card">
                  <div className="student-header">
                    <h3>👨‍🎓 {student.name}</h3>
                    <div className="student-badges">
                      {student.subjects.map(subject => (
                        <span key={subject.subject} className="course-badge">
                          📚 {subject.subject}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="progress-overview">
                    <div className="progress-metric">
                      <h4>Progreso General</h4>
                      <div className="progress-circle">
                        <div className="progress-fill" style={{'--percentage': `${student.overallProgress}%`}}>
                          {student.overallProgress}%
                        </div>
                      </div>
                      <p className="progress-detail">
                        {student.completedAppointments}/{student.totalAppointments} sesiones
                      </p>
                    </div>

                    <div className="progress-metric">
                      <h4>Asistencia</h4>
                      <div className="attendance-bar">
                        <div className="attendance-fill" style={{width: `${student.attendance}%`}}>
                          {student.attendance}%
                        </div>
                      </div>
                      <p className="attendance-detail">
                        Sesiones completadas vs programadas
                      </p>
                    </div>
                  </div>

                  <div className="subjects-progress">
                    <h4>📚 Progreso por Materia</h4>
                    {student.subjects.map((subject) => (
                      <div key={subject.subject} className="subject-progress-item">
                        <div className="subject-header">
                          <span className="subject-name">{subject.subject}</span>
                          <span className="subject-progress">{subject.progress}%</span>
                        </div>
                        <div className="subject-details">
                          <span className="sessions-count">
                            📊 {subject.completedSessions}/{subject.totalSessions} sesiones
                          </span>
                          {subject.topics.length > 0 && (
                            <span className="topics-count">
                              🎯 {subject.topics.length} tema{subject.topics.length !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                        <div className="progress-bar">
                          <div 
                            className="progress-fill" 
                            style={{ width: `${subject.progress}%` }}
                          ></div>
                        </div>
                        {subject.topics.length > 0 && (
                          <div className="topics-list">
                            {subject.topics.slice(0, 3).map((topic, index) => (
                              <span key={index} className="topic-tag">{topic}</span>
                            ))}
                            {subject.topics.length > 3 && (
                              <span className="topic-tag more">+{subject.topics.length - 3} más</span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="student-actions">
                    <button 
                      className="btn btn-outline small"
                      onClick={() => window.location.href = '/dashboard/estudiantes'}
                    >
                      👥 Ver Detalles
                    </button>
                    <button 
                      className="btn btn-outline small"
                      onClick={() => window.location.href = '/dashboard/videos-tutor'}
                    >
                      📹 Subir Material
                    </button>
                    <span className="last-activity">
                      🕐 Última actividad: {student.lastActivityFormatted}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TutorProgress;
