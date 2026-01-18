import React, { Component } from 'react';
import TutorSidebarMenu from './TutorSidebarMenu';
import apiClient from '../utils/axiosConfig';
import './Dashboard.css';

class TutorAgenda extends Component {
  state = {
    classes: [],
    selectedDate: new Date().toISOString().split('T')[0]
  };

  componentDidMount() {
    this.fetchDayClasses();
  }

  fetchDayClasses = async () => {
    try {
      const { selectedDate } = this.state;
      const start = new Date(selectedDate + 'T00:00:00Z').toISOString();
      const end = new Date(selectedDate + 'T23:59:59Z').toISOString();
      const res = await apiClient.get('/appointments', {
        params: { dateFrom: start, dateTo: end }
      });
      const list = (res.data?.data || []).map(a => ({
        id: a._id,
        subject: a.subject || a.availabilitySlotId?.subject || 'Sesión',
        student: a.studentId?.personalInfo?.firstName + ' ' + (a.studentId?.personalInfo?.lastName || ''),
        time: new Date(a.scheduledDate).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
        duration: a.duration,
        date: new Date(a.scheduledDate).toISOString().split('T')[0],
        type: a.appointmentType === 'advising' ? 'advisory' : 'class'
      }));
      this.setState({ classes: list });
    } catch (err) {
      // mantener silencioso por ahora
    }
  }

  render() {
    const { classes, selectedDate } = this.state;
    const todayClasses = classes.filter(c => c.date === selectedDate);

    return (
      <div className="dashboard-container">
        <TutorSidebarMenu />
        <div className="dashboard-content">
          <div className="dashboard-header">
            <h1>Agenda de Clases</h1>
            <p>Gestiona tus clases y asesorías programadas</p>
          </div>

          <div className="dashboard-main">
            <div className="agenda-controls">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => this.setState({ selectedDate: e.target.value }, this.fetchDayClasses)}
                className="date-picker"
              />
              <button className="btn-primary">Programar Nueva Clase</button>
            </div>

            <div className="agenda-calendar">
              <div className="today-schedule">
                <h2>Clases del {new Date(selectedDate).toLocaleDateString('es-ES')}</h2>
                {todayClasses.length > 0 ? (
                  <div className="schedule-list">
                    {todayClasses.map((classItem) => (
                      <div key={classItem.id} className={`schedule-item ${classItem.type}`}>
                        <div className="schedule-time">
                          <span className="time">{classItem.time}</span>
                          <span className="duration">({classItem.duration}min)</span>
                        </div>
                        <div className="schedule-info">
                          <h4>{classItem.subject}</h4>
                          <p>Estudiante: {classItem.student}</p>
                          <span className={`type-badge ${classItem.type}`}>
                            {classItem.type === 'class' ? 'Clase' : 'Asesoría'}
                          </span>
                        </div>
                        <div className="schedule-actions">
                          <button className="btn-outline small">Unirse</button>
                          <button className="btn-outline small">Editar</button>
                          <button className="btn-outline small">Cancelar</button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="no-classes">
                    <p>No hay clases programadas para esta fecha</p>
                    <button className="btn-secondary">Programar Clase</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default TutorAgenda;
