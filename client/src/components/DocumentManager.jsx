import React, { useEffect, useState } from 'react';
import apiClient from '../utils/axiosConfig';

const DocumentManager = () => {
  const [docs, setDocs] = useState([]); // [{url,name,tags}]
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [viewerUrl, setViewerUrl] = useState('');
  const [viewerOpen, setViewerOpen] = useState(false);

  const load = async () => {
    setError('');
    try {
      const res = await apiClient.get('/users/profile/documents');
      setDocs(res.data?.data?.documents || []);
    } catch (e) {
      setError(e.response?.data?.error || 'No se pudieron cargar los documentos');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onFileChange = (e) => {
    setFiles(Array.from(e.target.files || []));
    setError('');
    setSuccess('');
  };

  const onUpload = async () => {
    if (!files.length) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const form = new FormData();
      files.forEach(f => form.append('documents', f));
      await apiClient.post('/users/profile/documents', form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setSuccess('Documentos subidos correctamente');
      setFiles([]);
      await load();
    } catch (e) {
      setError(e.response?.data?.error || 'Error subiendo documentos');
    } finally {
      setLoading(false);
    }
  };

  const onView = (url) => {
    setViewerUrl(url);
    setViewerOpen(true);
  };

  const onDelete = async (url) => {
    if (!window.confirm('¿Eliminar este documento?')) return;
    setLoading(true);
    setError(''); setSuccess('');
    try {
      await apiClient.delete('/users/profile/documents', { data: { url } });
      setSuccess('Documento eliminado');
      await load();
    } catch (e) {
      setError(e.response?.data?.error || 'No se pudo eliminar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="document-manager" style={{ marginTop: 24 }}>
      <h3>Mis documentos (tutor/asesor)</h3>
      <p className="help-text">Formatos: PDF, JPG, PNG, WEBP. Máx 20MB por archivo.</p>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <input type="file" multiple onChange={onFileChange} accept="application/pdf,image/*" />
        <button className="btn btn-primary" onClick={onUpload} disabled={!files.length || loading}>
          {loading ? 'Subiendo...' : 'Subir'}
        </button>
      </div>
      {error && <div className="alert alert-danger" style={{ marginTop: 8 }}>{error}</div>}
      {success && <div className="alert alert-success" style={{ marginTop: 8 }}>{success}</div>}

      <div className="docs-list" style={{ marginTop: 16 }}>
        {docs.length === 0 && <div>No tienes documentos cargados.</div>}
        {docs.map((doc, idx) => {
          const url = doc.url || doc;
          const name = doc.name || (typeof doc === 'string' ? (doc.split('/').pop()) : '');
          const tags = Array.isArray(doc.tags) ? doc.tags : [];
          return (
            <div key={idx} className="doc-item" style={{ padding: '10px 0', borderBottom: '1px solid #eee' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:12 }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:600, marginBottom:4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{name}</div>
                  <div style={{ color:'#666', fontSize:12, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{url}</div>
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <button className="btn btn-secondary" onClick={() => onView(url)}>Ver</button>
                  <a className="btn btn-outline" href={url} download>Descargar</a>
                  <button className="btn btn-danger" onClick={() => onDelete(url)} disabled={loading}>Eliminar</button>
                </div>
              </div>
              <div style={{ marginTop:8, display:'flex', gap:12, alignItems:'center', flexWrap:'wrap' }}>
                <div>
                  <label style={{ fontSize:12, color:'#444' }}>Nombre</label>
                  <input defaultValue={name} onBlur={async (e)=>{
                    const newName = e.target.value.trim();
                    if (!newName || newName === name) return;
                    try {
                      await apiClient.patch('/users/profile/documents/rename', { url, name: newName });
                      setSuccess('Nombre actualizado');
                      await load();
                    } catch (er) { setError(er.response?.data?.error || 'No se pudo renombrar'); }
                  }} style={{ marginLeft:8 }} />
                </div>
                <div>
                  <label style={{ fontSize:12, color:'#444' }}>Etiquetas</label>
                  <input defaultValue={tags.join(', ')} onBlur={async (e)=>{
                    const newTags = e.target.value.split(',').map(s=>s.trim()).filter(Boolean);
                    try {
                      await apiClient.patch('/users/profile/documents/tags', { url, tags: newTags });
                      setSuccess('Etiquetas actualizadas');
                      await load();
                    } catch (er) { setError(er.response?.data?.error || 'No se pudieron actualizar etiquetas'); }
                  }} style={{ marginLeft:8, minWidth:260 }} placeholder="ej: CV, Título" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {viewerOpen && (
        <div className="modal-overlay" onClick={() => setViewerOpen(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
          <div className="modal-content" onClick={e=>e.stopPropagation()} style={{ background:'#fff', padding:16, borderRadius:8, maxWidth:'90vw', maxHeight:'90vh' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
              <strong>Vista previa</strong>
              <button onClick={() => setViewerOpen(false)} className="btn btn-outline">Cerrar</button>
            </div>
            {viewerUrl.toLowerCase().endsWith('.pdf') ? (
              <iframe title="preview" src={viewerUrl} style={{ width:'80vw', height:'75vh', border:'none' }} />
            ) : (
              <img src={viewerUrl} alt="preview" style={{ maxWidth:'80vw', maxHeight:'75vh', objectFit:'contain' }} />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentManager;
