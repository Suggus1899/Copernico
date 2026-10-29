import type { AvatarData } from '../types/files';
import type { ApiResponse } from '../types/api';
import React, { useEffect, useRef, useState } from 'react';
import apiClient from '../utils/axiosConfig';
import { getApiErrorMessage } from '../utils/apiError';
// Mismo límite que la API (2 MB).
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

interface AvatarUploaderProps { onAvatarUpdate?: (avatar: string | null) => void; currentAvatar?: string | null }

const AvatarUploader = ({ onAvatarUpdate, currentAvatar }: AvatarUploaderProps) => {
  const [avatarUrl, setAvatarUrl] = useState(currentAvatar || '');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setAvatarUrl(currentAvatar || '');
  }, [currentAvatar]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    if (selectedFile && selectedFile.size > MAX_AVATAR_BYTES) {
      e.target.value = '';
      setFile(null);
      setPreview(null);
      setError('La imagen supera el máximo de 2 MB.');
      return;
    }
    setFile(selectedFile);
    setError('');
    setSuccess('');
    
    // Crear preview de la imagen
    if (selectedFile) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(typeof e.target?.result === 'string' ? e.target.result : null);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      setPreview(null);
    }
  };

  const onUpload = async () => {
    if (!file) {
      setError('Por favor selecciona una imagen');
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      
      const res = await apiClient.post<ApiResponse<AvatarData>>('/users/profile/avatar', formData);
      
      const newAvatarUrl = res.data?.data?.avatar;
      if (newAvatarUrl) {
        setAvatarUrl(newAvatarUrl);
        setSuccess('Avatar actualizado exitosamente');
        setFile(null);
        setPreview(null);
        
        // Notificar al componente padre
        if (onAvatarUpdate) {
          onAvatarUpdate(newAvatarUrl);
        }
        
        // Limpiar el input file
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    } catch (err) {
      console.error('Error uploading avatar:', err);
      setError(getApiErrorMessage(err, 'Error al subir la imagen'));
    } finally {
      setLoading(false);
    }
  };

  const onRemoveAvatar = async () => {
    if (!avatarUrl) return;
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      await apiClient.delete('/users/profile/avatar');
      setAvatarUrl('');
      setConfirmRemove(false);
      setSuccess('Avatar eliminado exitosamente');
      
      // Notificar al componente padre
      if (onAvatarUpdate) {
        onAvatarUpdate(null);
      }
    } catch (err) {
      console.error('Error removing avatar:', err);
      setError(getApiErrorMessage(err, 'Error al eliminar la imagen'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="avatar-uploader">
      <div className="avatar-preview-section">
        <div className="avatar-preview">
          {preview || avatarUrl ? (
            <img src={preview || avatarUrl} alt="Vista previa de la foto de perfil" className="avatar-preview-image" />
          ) : (
            <div className="avatar-preview-placeholder">Sin foto</div>
          )}
        </div>
        <div className="avatar-info">
          <h4>Foto de perfil</h4>
          <p className="help-text">
            Formatos permitidos: JPG, PNG, GIF, WEBP<br/>
            Tamaño máximo: 2 MB<br/>
            Recomendado: 256x256 píxeles
          </p>
        </div>
      </div>

      <div className="avatar-controls">
        <div className="file-input-wrapper">
          <input 
            ref={fileInputRef}
            type="file" 
            accept=".jpg,.jpeg,.png,.gif,.webp"
            onChange={onFileChange}
            className="file-input"
            id="avatar-file-input"
          />
          <label htmlFor="avatar-file-input" className="file-input-label">
            Seleccionar imagen
          </label>
        </div>
        
        <div className="avatar-actions">
          <button 
            type="button"
            className="btn btn-primary" 
            onClick={onUpload} 
            disabled={!file || loading}
          >
            {loading ? 'Subiendo…' : 'Subir imagen'}
          </button>
          
          {avatarUrl && !confirmRemove && (
            <button 
              type="button"
              className="btn btn-danger" 
              onClick={() => setConfirmRemove(true)}
              disabled={loading}
            >
              Eliminar foto
            </button>
          )}
        </div>
      </div>

      {confirmRemove && (
        <div className="avatar-remove-confirm" role="group" aria-label="Confirmar eliminación de foto">
          <span>¿Eliminar tu foto de perfil?</span>
          <button type="button" className="btn btn-danger" onClick={onRemoveAvatar} disabled={loading}>{loading ? 'Eliminando…' : 'Confirmar'}</button>
          <button type="button" className="btn btn-outline-secondary" onClick={() => setConfirmRemove(false)} disabled={loading}>Cancelar</button>
        </div>
      )}

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}
      
      {success && (
        <div className="alert alert-success" role="status">
          {success}
        </div>
      )}
    </div>
  );
};

export default AvatarUploader;
