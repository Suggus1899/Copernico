import React, { useEffect, useState } from 'react';
import apiClient from '../utils/axiosConfig';
import { getApiErrorMessage } from '../utils/apiError';

const MAX_FILES_PER_UPLOAD = 5;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = '.pdf,.txt,.docx,.xlsx,.pptx,.jpg,.jpeg,.png,.webp';

const formatSize = (bytes) => {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
};

const canPreview = (mimeType) => mimeType === 'application/pdf' || Boolean(mimeType?.startsWith('image/'));

const DocumentManager = () => {
  const [docs, setDocs] = useState([]);
  const [files, setFiles] = useState([]);
  const [inputKey, setInputKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [preview, setPreview] = useState(null);

  const fileUrl = (docId) => `${apiClient.defaults.baseURL}/users/profile/documents/${docId}/download`;

  const loadDocuments = async () => {
    try {
      const res = await apiClient.get('/users/profile/documents');
      setDocs(res.data.data.documents);
    } catch (err) {
      setError(getApiErrorMessage(err, 'No se pudieron cargar los documentos'));
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  useEffect(() => {
    if (!preview) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setPreview(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [preview]);

  const resetFileInput = () => {
    setFiles([]);
    setInputKey((key) => key + 1);
  };

  const onFileChange = (e) => {
    const selected = Array.from(e.target.files || []);
    const oversized = selected.find((file) => file.size > MAX_FILE_BYTES);
    setError('');
    setSuccess('');
    if (selected.length > MAX_FILES_PER_UPLOAD) {
      resetFileInput();
      setError(`Puedes subir hasta ${MAX_FILES_PER_UPLOAD} archivos a la vez.`);
    } else if (oversized) {
      resetFileInput();
      setError(`"${oversized.name}" supera el máximo de 10 MB.`);
    } else {
      setFiles(selected);
    }
  };

  const onUpload = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const form = new FormData();
      files.forEach((file) => form.append('documents', file));
      const res = await apiClient.post('/users/profile/documents', form);
      setDocs(res.data.data.documents);
      resetFileInput();
      setSuccess('Documentos subidos correctamente');
    } catch (err) {
      setError(getApiErrorMessage(err, 'No se pudieron subir los documentos'));
    } finally {
      setLoading(false);
    }
  };

  const onDelete = async (doc) => {
    if (!window.confirm(`¿Eliminar "${doc.name}"?`)) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await apiClient.delete(`/users/profile/documents/${doc._id}`);
      setDocs(res.data.data.documents);
      setSuccess('Documento eliminado');
    } catch (err) {
      setError(getApiErrorMessage(err, 'No se pudo eliminar el documento'));
    } finally {
      setLoading(false);
    }
  };

  const updateDocument = async (doc, changes, successMessage) => {
    setError('');
    setSuccess('');
    try {
      const res = await apiClient.patch(`/users/profile/documents/${doc._id}`, changes);
      setDocs(res.data.data.documents);
      setSuccess(successMessage);
    } catch (err) {
      setError(getApiErrorMessage(err, 'No se pudo actualizar el documento'));
    }
  };

  return (
    <section className="document-manager" style={{ marginTop: 24 }} aria-labelledby="document-manager-title">
      <h3 id="document-manager-title">Mis documentos</h3>
      <p className="help-text">
        Formatos: PDF, TXT, DOCX, XLSX, PPTX, JPG, PNG, WEBP. Máximo 10 MB por archivo y 20 documentos en total.
      </p>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          key={inputKey}
          type="file"
          multiple
          accept={ACCEPTED_EXTENSIONS}
          aria-label="Seleccionar documentos"
          onChange={onFileChange}
        />
        <button type="button" className="btn btn-primary" onClick={onUpload} disabled={!files.length || loading}>
          {loading ? 'Procesando...' : 'Subir'}
        </button>
      </div>
      {error && <div role="alert" className="alert alert-danger" style={{ marginTop: 8 }}>{error}</div>}
      {success && <div role="status" className="alert alert-success" style={{ marginTop: 8 }}>{success}</div>}

      <div className="docs-list" style={{ marginTop: 16 }}>
        {docs.length === 0 && <p>No tienes documentos cargados.</p>}
        {docs.map((doc) => (
          <div key={doc._id} className="doc-item" style={{ padding: '10px 0', borderBottom: '1px solid #eee' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.name}</div>
                <div style={{ color: '#666', fontSize: 12 }}>{formatSize(doc.size)}</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {canPreview(doc.mimeType) && (
                  <button type="button" className="btn btn-secondary" onClick={() => setPreview(doc)}>Ver</button>
                )}
                <a className="btn btn-outline" href={fileUrl(doc._id)}>Descargar</a>
                <button type="button" className="btn btn-danger" onClick={() => onDelete(doc)} disabled={loading}>Eliminar</button>
              </div>
            </div>
            <div style={{ marginTop: 8, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, color: '#444' }}>Nombre</span>
                <input
                  defaultValue={doc.name}
                  maxLength={120}
                  onBlur={(e) => {
                    const name = e.target.value.trim();
                    if (name && name !== doc.name) {
                      updateDocument(doc, { name }, 'Nombre actualizado');
                    } else {
                      e.target.value = doc.name;
                    }
                  }}
                />
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, color: '#444' }}>Etiquetas</span>
                <input
                  defaultValue={doc.tags.join(', ')}
                  placeholder="ej: CV, Título"
                  style={{ minWidth: 260 }}
                  onBlur={(e) => {
                    const tags = e.target.value.split(',').map((tag) => tag.trim()).filter(Boolean);
                    if (JSON.stringify(tags) !== JSON.stringify(doc.tags)) {
                      updateDocument(doc, { tags }, 'Etiquetas actualizadas');
                    }
                  }}
                />
              </label>
            </div>
          </div>
        ))}
      </div>

      {preview && (
        <div
          className="modal-overlay"
          onClick={() => setPreview(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Vista previa de ${preview.name}`}
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ background: '#fff', padding: 16, borderRadius: 8, maxWidth: '90vw', maxHeight: '90vh' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 12 }}>
              <strong>{preview.name}</strong>
              <button type="button" onClick={() => setPreview(null)} className="btn btn-outline">Cerrar</button>
            </div>
            {preview.mimeType === 'application/pdf' ? (
              <iframe title={preview.name} src={fileUrl(preview._id)} style={{ width: '80vw', height: '75vh', border: 'none' }} />
            ) : (
              <img src={fileUrl(preview._id)} alt={preview.name} style={{ maxWidth: '80vw', maxHeight: '75vh', objectFit: 'contain' }} />
            )}
          </div>
        </div>
      )}
    </section>
  );
};

export default DocumentManager;
