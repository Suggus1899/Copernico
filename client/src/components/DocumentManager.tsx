import type { UserDocument, DocumentsData } from '../types/files';
import type { ApiResponse } from '../types/api';
import React, { useEffect, useState } from 'react';
import apiClient from '../utils/axiosConfig';
import { getApiErrorMessage } from '../utils/apiError';
const MAX_FILES_PER_UPLOAD = 5;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = '.pdf,.txt,.docx,.xlsx,.pptx,.jpg,.jpeg,.png,.webp';

const formatSize = (bytes: number) => {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
};

const canPreview = (mimeType: string | undefined) => mimeType === 'application/pdf' || Boolean(mimeType?.startsWith('image/'));

const DocumentManager = () => {
  const [docs, setDocs] = useState<UserDocument[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [inputKey, setInputKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingDocuments, setLoadingDocuments] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [preview, setPreview] = useState<UserDocument | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<UserDocument | null>(null);

  const fileUrl = (docId: string) => `${apiClient.defaults.baseURL}/users/profile/documents/${docId}/download`;

  const loadDocuments = async () => {
    setLoadingDocuments(true);
    setLoadError('');
    try {
      const res = await apiClient.get<ApiResponse<DocumentsData>>('/users/profile/documents');
      setDocs(res.data.data.documents);
    } catch (err) {
      setLoadError(getApiErrorMessage(err, 'No se pudieron cargar los documentos'));
    } finally {
      setLoadingDocuments(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  useEffect(() => {
    if (!preview) return undefined;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPreview(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [preview]);

  const resetFileInput = () => {
    setFiles([]);
    setInputKey((key) => key + 1);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      const res = await apiClient.post<ApiResponse<DocumentsData>>('/users/profile/documents', form);
      setDocs(res.data.data.documents);
      resetFileInput();
      setSuccess('Documentos subidos correctamente');
    } catch (err) {
      setError(getApiErrorMessage(err, 'No se pudieron subir los documentos'));
    } finally {
      setLoading(false);
    }
  };

  const onDelete = (doc: UserDocument) => {
    setDeleteCandidate(doc);
  };

  const confirmDelete = async () => {
    if (!deleteCandidate) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await apiClient.delete<ApiResponse<DocumentsData>>(`/users/profile/documents/${deleteCandidate._id}`);
      setDocs(res.data.data.documents);
      setDeleteCandidate(null);
      setSuccess('Documento eliminado');
    } catch (err) {
      setError(getApiErrorMessage(err, 'No se pudo eliminar el documento'));
    } finally {
      setLoading(false);
    }
  };

  const updateDocument = async (doc: UserDocument, changes: { name?: string; tags?: string[] }, successMessage: string) => {
    setError('');
    setSuccess('');
    try {
      const res = await apiClient.patch<ApiResponse<DocumentsData>>(`/users/profile/documents/${doc._id}`, changes);
      setDocs(res.data.data.documents);
      setSuccess(successMessage);
    } catch (err) {
      setError(getApiErrorMessage(err, 'No se pudo actualizar el documento'));
    }
  };

  return (
    <section className="document-manager" aria-labelledby="document-manager-title">
      <h3 id="document-manager-title">Mis documentos</h3>
      <p className="help-text">
        Formatos: PDF, TXT, DOCX, XLSX, PPTX, JPG, PNG, WEBP. Máximo 10 MB por archivo y 20 documentos en total.
      </p>
      <div className="documents-toolbar">
        <input
          key={inputKey}
          type="file"
          multiple
          accept={ACCEPTED_EXTENSIONS}
          aria-label="Seleccionar documentos"
          onChange={onFileChange}
        />
        <button type="button" className="btn btn-primary" onClick={onUpload} disabled={!files.length || loading || loadingDocuments || Boolean(loadError)}>
          {loading ? 'Procesando...' : 'Subir'}
        </button>
      </div>
      {files.length > 0 && <p className="documents-selection" role="status">{files.length} {files.length === 1 ? 'archivo seleccionado' : 'archivos seleccionados'}</p>}
      {error && <div role="alert" className="alert alert-danger">{error}</div>}
      {success && <div role="status" className="alert alert-success">{success}</div>}

      <div className="docs-list">
        {loadingDocuments ? <p role="status">Cargando documentos…</p> : loadError ? (
          <div className="alert alert-danger" role="alert">{loadError} <button type="button" onClick={loadDocuments}>Reintentar</button></div>
        ) : docs.length === 0 ? <p>No tienes documentos cargados.</p> : docs.map((doc: UserDocument) => (
          <article key={doc._id} className="doc-item">
            <div className="doc-item__top">
              <div className="doc-item__main">
                <h4>{doc.name}</h4>
                <span>{formatSize(doc.size)}</span>
              </div>
              <div className="doc-item__actions">
                {canPreview(doc.mimeType) && (
                  <button type="button" className="btn btn-secondary" onClick={() => setPreview(doc)}>Ver</button>
                )}
                <a className="btn btn-outline" href={fileUrl(doc._id)}>Descargar</a>
                {deleteCandidate?._id === doc._id ? (
                  <div className="doc-delete-confirm" role="group" aria-label={`Confirmar eliminación de ${doc.name}`}>
                    <span>¿Eliminar este documento?</span>
                    <button type="button" className="btn btn-danger" onClick={confirmDelete} disabled={loading}>{loading ? 'Eliminando…' : 'Confirmar'}</button>
                    <button type="button" className="btn btn-outline-secondary" onClick={() => setDeleteCandidate(null)} disabled={loading}>Cancelar</button>
                  </div>
                ) : (
                  <button type="button" className="btn btn-danger" onClick={() => onDelete(doc)} disabled={loading}>Eliminar</button>
                )}
              </div>
            </div>
            <div className="doc-item__fields">
              <label className="doc-item__field">
                <span>Nombre</span>
                <input
                  defaultValue={doc.name}
                  maxLength={120}
                  aria-label={`Nombre de ${doc.name}`}
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
              <label className="doc-item__field">
                <span>Etiquetas</span>
                <input
                  defaultValue={doc.tags.join(', ')}
                  placeholder="ej: CV, Título"
                  aria-label={`Etiquetas de ${doc.name}`}
                  onBlur={(e) => {
                    const tags = e.target.value.split(',').map((tag) => tag.trim()).filter(Boolean);
                    if (JSON.stringify(tags) !== JSON.stringify(doc.tags)) {
                      updateDocument(doc, { tags }, 'Etiquetas actualizadas');
                    }
                  }}
                />
              </label>
            </div>
          </article>
        ))}
      </div>

      {preview && (
        <div
          onClick={() => setPreview(null)}
          className="document-preview-overlay"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Vista previa de ${preview.name}`}
            className="document-preview"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="document-preview__header">
              <strong>{preview.name}</strong>
              <button type="button" onClick={() => setPreview(null)} className="btn btn-outline">Cerrar</button>
            </div>
            {preview.mimeType === 'application/pdf' ? (
              <iframe title={preview.name} src={fileUrl(preview._id)} className="document-preview__frame" />
            ) : (
              <img src={fileUrl(preview._id)} alt={preview.name} className="document-preview__image" />
            )}
          </div>
        </div>
      )}
    </section>
  );
};

export default DocumentManager;
