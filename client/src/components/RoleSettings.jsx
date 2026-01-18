import React, { useEffect, useState } from 'react';
import apiClient from '../utils/axiosConfig';
import DocumentManager from './DocumentManager';

const RoleSettings = () => {
  const [user, setUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const [tutor, setTutor] = useState({ specialties: '', teachingMethods: '', hourlyRate: '', available: false });
  const [advisor, setAdvisor] = useState({ specializationAreas: '', appointmentDuration: '', available: false, bio: '' });
  const [student, setStudent] = useState({ studentId: '', institution: '', program: '', gradYear: '', semester: '' });

  useEffect(() => {
    (async () => {
      const res = await apiClient.get('/auth/profile');
      const data = res.data?.data;
      setUser(data);
      if (data?.tutorProfile) {
        setTutor({
          specialties: (data.tutorProfile.specialties || []).join(', '),
          teachingMethods: (data.tutorProfile.teachingMethods || []).join(', '),
          hourlyRate: data.tutorProfile.hourlyRate || '',
          available: !!data.tutorProfile.available
        });
      }
      if (data?.advisorProfile) {
        setAdvisor({
          specializationAreas: (data.advisorProfile.specializationAreas || []).join(', '),
          appointmentDuration: data.advisorProfile.appointmentDuration || '',
          available: !!data.advisorProfile.available,
          bio: data.advisorProfile.bio || ''
        });
      }
      if (data?.studentProfile) {
        setStudent({
          studentId: data.studentProfile.studentId || '',
          institution: data.studentProfile.institution || '',
          program: data.studentProfile.program || '',
          gradYear: data.studentProfile.gradYear || '',
          semester: data.studentProfile.semester || ''
        });
      }
    })();
  }, []);

  const save = async () => {
    setSaving(true); setMsg('');
    try {
      const payload = {};
      if (user.role === 'tutor') {
        payload.tutorProfile = {
          specialties: tutor.specialties.split(',').map(s => s.trim()).filter(Boolean),
          teachingMethods: tutor.teachingMethods.split(',').map(s => s.trim()).filter(Boolean),
          hourlyRate: tutor.hourlyRate ? Number(tutor.hourlyRate) : undefined,
          available: !!tutor.available,
        };
      } else if (user.role === 'advisor') {
        payload.advisorProfile = {
          specializationAreas: advisor.specializationAreas.split(',').map(s => s.trim()).filter(Boolean),
          appointmentDuration: advisor.appointmentDuration ? Number(advisor.appointmentDuration) : undefined,
          available: !!advisor.available,
          bio: advisor.bio || undefined
        };
      } else if (user.role === 'student') {
        payload.studentProfile = {
          studentId: student.studentId,
          institution: student.institution,
          program: student.program,
          gradYear: student.gradYear ? Number(student.gradYear) : undefined,
          semester: student.semester ? Number(student.semester) : undefined
        };
      }
      const res = await apiClient.put('/users/profile', payload);
      setMsg(res.data?.success ? 'Guardado' : 'No se pudo guardar');
    } catch (e) {
      setMsg(e.response?.data?.error || 'Error guardando');
    } finally {
      setSaving(false);
    }
  };

  if (!user) return <div>Cargando...</div>;

  return (
    <div className="role-settings">
      <h2>Configuración por Rol</h2>
      {user.role === 'tutor' && (
        <div>
          <div className="input-group"><label>Especialidades</label><input value={tutor.specialties} onChange={e=>setTutor({...tutor, specialties:e.target.value})} placeholder="Ej: Matemáticas, Física" /></div>
          <div className="input-group"><label>Métodos de enseñanza</label><input value={tutor.teachingMethods} onChange={e=>setTutor({...tutor, teachingMethods:e.target.value})} placeholder="Ej: Online, Presencial" /></div>
          <div className="input-group"><label>Tarifa por hora</label><input type="number" value={tutor.hourlyRate} onChange={e=>setTutor({...tutor, hourlyRate:e.target.value})} /></div>
          <div className="input-group"><label><input type="checkbox" checked={tutor.available} onChange={e=>setTutor({...tutor, available:e.target.checked})} /> Disponible</label></div>
        </div>
      )}
      {user.role === 'advisor' && (
        <div>
          <div className="input-group"><label>Áreas de especialización</label><input value={advisor.specializationAreas} onChange={e=>setAdvisor({...advisor, specializationAreas:e.target.value})} placeholder="Ej: Orientación académica, Vocacional" /></div>
          <div className="input-group"><label>Duración por asesoría (min)</label><input type="number" value={advisor.appointmentDuration} onChange={e=>setAdvisor({...advisor, appointmentDuration:e.target.value})} /></div>
          <div className="input-group"><label><input type="checkbox" checked={advisor.available} onChange={e=>setAdvisor({...advisor, available:e.target.checked})} /> Disponible</label></div>
          <div className="input-group"><label>Bio</label><textarea value={advisor.bio} onChange={e=>setAdvisor({...advisor, bio:e.target.value})} /></div>
        </div>
      )}
      {user.role === 'student' && (
        <div>
          <div className="input-group"><label>ID Estudiantil</label><input value={student.studentId} onChange={e=>setStudent({...student, studentId:e.target.value})} /></div>
          <div className="input-group"><label>Institución</label><input value={student.institution} onChange={e=>setStudent({...student, institution:e.target.value})} /></div>
          <div className="input-group"><label>Programa</label><input value={student.program} onChange={e=>setStudent({...student, program:e.target.value})} /></div>
          <div className="input-group"><label>Año de graduación</label><input type="number" value={student.gradYear} onChange={e=>setStudent({...student, gradYear:e.target.value})} /></div>
          <div className="input-group"><label>Semestre</label><input type="number" value={student.semester} onChange={e=>setStudent({...student, semester:e.target.value})} /></div>
        </div>
      )}
      <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
      {msg && <div style={{ marginTop: 8 }}>{msg}</div>}
      {(user.role === 'tutor' || user.role === 'advisor') && <DocumentManager />}
    </div>
  );
};

export default RoleSettings;
