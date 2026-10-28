import React, { useEffect, useState } from 'react';
import apiClient from '../utils/axiosConfig';
import { getApiErrorMessage } from '../utils/apiError';

// Mismo límite que la API (2 MB).
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

const AvatarUploader = ({ onAvatarUpdate, currentAvatar }) => {
  const [avatarUrl, setAvatarUrl] = useState(currentAvatar || '');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    setAvatarUrl(currentAvatar || '');
  }, [currentAvatar]);

  const onFileChange = (e) => {
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
        setPreview(e.target.result);
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
      
      const res = await apiClient.post('/users/profile/avatar', formData);
      
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
        const fileInput = document.querySelector('input[type="file"]');
        if (fileInput) fileInput.value = '';
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
    
    if (!window.confirm('¿Estás seguro de que deseas eliminar tu foto de perfil?')) {
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      await apiClient.delete('/users/profile/avatar');
      setAvatarUrl('');
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
          <img 
            src={preview || avatarUrl || 'https://via.placeholder.com/150x150/e5e7eb/6b7280?text=Sin+Foto'} 
            alt="Avatar preview" 
            className="avatar-preview-image"
          />
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
            type="file" 
            accept="image/*" 
            onChange={onFileChange}
            className="file-input"
            id="avatar-file-input"
          />
          <label htmlFor="avatar-file-input" className="file-input-label">
            📁 Seleccionar imagen
          </label>
        </div>
        
        <div className="avatar-actions">
          <button 
            className="btn btn-primary" 
            onClick={onUpload} 
            disabled={!file || loading}
          >
            {loading ? '⏳ Subiendo...' : '📤 Subir imagen'}
          </button>
          
          {avatarUrl && (
            <button 
              className="btn btn-danger" 
              onClick={onRemoveAvatar}
              disabled={loading}
            >
              🗑️ Eliminar
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="alert alert-danger">
          ❌ {error}
        </div>
      )}
      
      {success && (
        <div className="alert alert-success">
          ✅ {success}
        </div>
      )}
    </div>
  );
};

export default AvatarUploader;
