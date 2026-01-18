import React, { useEffect, useMemo, useRef, useState } from 'react';
import apiClient from '../utils/axiosConfig';

const TutorAdvisorSearch = () => {
  const [tab, setTab] = useState('students'); // students | materials
  const [q, setQ] = useState('');
  const [subject, setSubject] = useState('');
  const [tags, setTags] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [students, setStudents] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [type, setType] = useState('');
  const [pageSt, setPageSt] = useState(1);
  const [pagesSt, setPagesSt] = useState(1);
  const [pageMt, setPageMt] = useState(1);
  const [pagesMt, setPagesMt] = useState(1);
  const debounceRef = useRef(null);
  const [sortSt, setSortSt] = useState('lastName_asc');
  const [sortMt, setSortMt] = useState('createdAt_desc');

  const fetchStudents = async () => {
    const params = {};
    if (q) params.q = q;
    if (subject) params.subject = subject;
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;
    params.page = pageSt; params.limit = 10;
    params.sort = sortSt;
    const res = await apiClient.get('/appointments/my/students', { params });
    return res.data || { data: [], pagination: { page: 1, pages: 1 } };
  };

  const fetchMaterials = async () => {
    const params = {};
    if (q) params.q = q;
    if (subject) params.subject = subject;
    if (tags) params.tags = tags;
    if (type) params.type = type;
    params.page = pageMt; params.limit = 10;
    params.sort = sortMt;
    const res = await apiClient.get('/materials/my/materials', { params });
    return res.data || { data: [], pagination: { page: 1, pages: 1 } };
  };

  const search = async () => {
    setLoading(true); setError('');
    try {
      const [stRes, mtRes] = await Promise.all([
        fetchStudents(),
        fetchMaterials()
      ]);
      setStudents(stRes.data || []);
      setPagesSt(stRes.pagination?.pages || 1);
      setMaterials(mtRes.data || []);
      setPagesMt(mtRes.pagination?.pages || 1);
    } catch (e) {
      setError(e.response?.data?.error || 'Error buscando');
    } finally {
      setLoading(false);
    }
  };

  // Inicial: hidratar desde querystring
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    setQ(sp.get('q') || '');
    setSubject(sp.get('subject') || '');
    setTags(sp.get('tags') || '');
    setType(sp.get('type') || '');
    setDateFrom(sp.get('from') || '');
    setDateTo(sp.get('to') || '');
    setPageSt(parseInt(sp.get('pSt') || '1'));
    setPageMt(parseInt(sp.get('pMt') || '1'));
    setSortSt(sp.get('sSt') || 'lastName_asc');
    setSortMt(sp.get('sMt') || 'createdAt_desc');
    // Disparar búsqueda al inicio
    setTimeout(() => search(), 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persistir filtros en querystring y debounce de búsqueda
  useEffect(() => {
    const sp = new URLSearchParams();
    if (q) sp.set('q', q);
    if (subject) sp.set('subject', subject);
    if (tags) sp.set('tags', tags);
    if (type) sp.set('type', type);
    if (dateFrom) sp.set('from', dateFrom);
    if (dateTo) sp.set('to', dateTo);
    sp.set('pSt', String(pageSt));
    sp.set('pMt', String(pageMt));
    sp.set('sSt', sortSt);
    sp.set('sMt', sortMt);
    const qs = sp.toString();
    const url = qs ? `?${qs}` : window.location.pathname;
    window.history.replaceState(null, '', url);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, subject, tags, type, dateFrom, dateTo, pageSt, pageMt, sortSt, sortMt]);

  const toCSV = (rows) => {
    const escape = (val) => {
      const s = String(val ?? '').replace(/"/g, '""');
      return `"${s}"`;
    };
    return rows.map(r => r.map(escape).join(',')).join('\n');
  };

  const exportStudentsCSV = () => {
    const header = ['Nombre','Apellido','Email','Materias','Citas'];
    const data = students.map(s => [s.firstName || '', s.lastName || '', s.email || '', (s.subjects||[]).join('|'), s.appointments || 0]);
    const csv = toCSV([header, ...data]);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'estudiantes.csv'; a.click(); URL.revokeObjectURL(url);
  };

  const exportMaterialsCSV = () => {
    const header = ['Título','Materia','Tipo','Dificultad','Etiquetas','Vistas','Creado'];
    const data = materials.map(m => [m.title||'', m.subject||'', m.type||'', m.difficulty||'', (m.tags||[]).join('|'), m.views||0, m.createdAt||'']);
    const csv = toCSV([header, ...data]);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'materiales.csv'; a.click(); URL.revokeObjectURL(url);
  };

  const onSubmit = (e) => { e.preventDefault(); search(); };

  const tagChips = useMemo(() => (tags ? tags.split(',').map(t=>t.trim()).filter(Boolean) : []), [tags]);

  return (
    <div className="dashboard-card">
      <h2>Búsqueda (Tutor/Asesor)</h2>
      <form onSubmit={onSubmit} style={{ display:'flex', gap:12, alignItems:'center', flexWrap:'wrap', marginBottom:12 }}>
        <input placeholder="Buscar por nombre, email, materia..." value={q} onChange={e=>setQ(e.target.value)} style={{ minWidth:260 }} />
        <div>
          <label style={{ fontSize:12, color:'#444' }}>Materia</label>
          <input value={subject} onChange={e=>setSubject(e.target.value)} style={{ marginLeft:8 }} placeholder="Ej: Matemáticas" />
        </div>
        <div>
          <label style={{ fontSize:12, color:'#444' }}>Etiquetas</label>
          <input value={tags} onChange={e=>setTags(e.target.value)} style={{ marginLeft:8 }} placeholder="Ej: álgebra, ejercicios" />
        </div>
        <div>
          <label style={{ fontSize:12, color:'#444' }}>Tipo</label>
          <select value={type} onChange={e=>setType(e.target.value)} style={{ marginLeft:8 }}>
            <option value="">Todos</option>
            <option value="document">Documento</option>
            <option value="presentation">Presentación</option>
            <option value="video">Video</option>
            <option value="link">Enlace</option>
            <option value="exercise">Ejercicio</option>
            <option value="worksheet">Hoja de trabajo</option>
            <option value="quiz">Quiz</option>
          </select>
        </div>
        <div>
          <label style={{ fontSize:12, color:'#444' }}>Desde</label>
          <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} style={{ marginLeft:8 }} />
        </div>
        <div>
          <label style={{ fontSize:12, color:'#444' }}>Hasta</label>
          <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} style={{ marginLeft:8 }} />
        </div>
        <button className="btn btn-primary" disabled={loading}>{loading ? 'Buscando...' : 'Buscar'}</button>
      </form>

      <div className="tabs" style={{ marginBottom: 12 }}>
        <button className={`tab-btn ${tab==='students'?'active':''}`} onClick={()=>setTab('students')}>Estudiantes</button>
        <button className={`tab-btn ${tab==='materials'?'active':''}`} onClick={()=>setTab('materials')}>Materiales</button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {tab==='students' && (
        <div className="list">
          <div style={{ display:'flex', gap:12, alignItems:'center', marginBottom:8 }}>
            <div>
              <label style={{ fontSize:12, color:'#444' }}>Orden</label>
              <select value={sortSt} onChange={e=>{ setSortSt(e.target.value); setPageSt(1); }} style={{ marginLeft:8 }}>
                <option value="lastName_asc">Apellido (A-Z)</option>
                <option value="lastName_desc">Apellido (Z-A)</option>
                <option value="appointments_desc">Citas (más a menos)</option>
                <option value="appointments_asc">Citas (menos a más)</option>
              </select>
            </div>
            <button className="btn btn-outline" onClick={exportStudentsCSV}>Exportar CSV</button>
          </div>
          {students.length === 0 ? (
            <p>Sin resultados.</p>
          ) : (
            students.map(s => (
              <div key={s.studentId} className="list-item" style={{ display:'flex', justifyContent:'space-between', borderBottom:'1px solid #eee', padding:'8px 0' }}>
                <div>
                  <div style={{ fontWeight:600 }}>{s.firstName} {s.lastName}</div>
                  <div style={{ color:'#666', fontSize:12 }}>{s.email}</div>
                  <div style={{ marginTop:4, display:'flex', gap:6, flexWrap:'wrap' }}>
                    {(s.subjects || []).map((sub, i) => (
                      <span key={i} className="chip">{sub}</span>
                    ))}
                  </div>
                </div>
                <div style={{ color:'#444' }}>Citas: {s.appointments}</div>
              </div>
            ))
          )}
          <div style={{ display:'flex', gap:8, marginTop:8 }}>
            <button className="btn btn-outline" disabled={pageSt<=1 || loading} onClick={()=>setPageSt(p=>Math.max(1,p-1))}>Anterior</button>
            <span style={{ alignSelf:'center' }}>Página {pageSt} de {pagesSt}</span>
            <button className="btn btn-outline" disabled={pageSt>=pagesSt || loading} onClick={()=>setPageSt(p=>p+1)}>Siguiente</button>
          </div>
        </div>
      )}

      {tab==='materials' && (
        <div className="list">
          <div style={{ display:'flex', gap:12, alignItems:'center', marginBottom:8 }}>
            <div>
              <label style={{ fontSize:12, color:'#444' }}>Orden</label>
              <select value={sortMt} onChange={e=>{ setSortMt(e.target.value); setPageMt(1); }} style={{ marginLeft:8 }}>
                <option value="createdAt_desc">Nuevos primero</option>
                <option value="createdAt_asc">Antiguos primero</option>
                <option value="views_desc">Más vistos</option>
                <option value="views_asc">Menos vistos</option>
              </select>
            </div>
            <button className="btn btn-outline" onClick={exportMaterialsCSV}>Exportar CSV</button>
          </div>
          {materials.length === 0 ? (
            <p>Sin resultados.</p>
          ) : (
            materials.map(m => (
              <div key={m._id} className="list-item" style={{ display:'flex', justifyContent:'space-between', borderBottom:'1px solid #eee', padding:'8px 0' }}>
                <div>
                  <div style={{ fontWeight:600 }}>{m.title}</div>
                  <div style={{ color:'#666', fontSize:12 }}>{m.subject} • {m.type} • {m.difficulty}</div>
                  <div style={{ marginTop:4, display:'flex', gap:6, flexWrap:'wrap' }}>
                    {(m.tags || []).map((tg, i) => (
                      <span key={i} className="chip">{tg}</span>
                    ))}
                  </div>
                </div>
                <div style={{ color:'#444' }}>Vistas: {m.views || 0}</div>
              </div>
            ))
          )}
          <div style={{ display:'flex', gap:8, marginTop:8 }}>
            <button className="btn btn-outline" disabled={pageMt<=1 || loading} onClick={()=>setPageMt(p=>Math.max(1,p-1))}>Anterior</button>
            <span style={{ alignSelf:'center' }}>Página {pageMt} de {pagesMt}</span>
            <button className="btn btn-outline" disabled={pageMt>=pagesMt || loading} onClick={()=>setPageMt(p=>p+1)}>Siguiente</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TutorAdvisorSearch;
