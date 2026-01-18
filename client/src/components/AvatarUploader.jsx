import React, { useEffect, useState } from 'react';
import apiClient from '../utils/axiosConfig';

const AvatarUploader = () => {
  const [avatarUrl, setAvatarUrl] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await apiClient.get('/users/profile');
        setAvatarUrl(res.data?.data?.personalInfo?.avatar || '');
      } catch (_) {}
    })();
  }, []);

  const onFileChange = (e) => {
    setFile(e.target.files?.[0] || null);
    setError('');
    setSuccess('');
  };

  const onUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const form = new FormData();
      form.append('avatar', file);
      const res = await apiClient.post('/users/profile/avatar', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      const url = res.data?.data?.avatar;
      if (url) {
        setAvatarUrl(url);
        setSuccess('Avatar actualizado');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Error subiendo avatar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="avatar-uploader">
      <h3>Foto de perfil</h3>
      <p className="help-text">Las imágenes se recortan automáticamente a 256x256 (JPG/PNG/WEBP, máx 5MB).</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <img src={avatarUrl || 'https://via.placeholder.com/128'} alt="avatar" width={128} height={128} style={{ borderRadius: '50%', objectFit: 'cover' }} />
        <div>
          <input type="file" accept="image/*" onChange={onFileChange} />
          <button className="btn btn-primary" onClick={onUpload} disabled={!file || loading}>{loading ? 'Subiendo...' : 'Subir'}</button>
        </div>
      </div>
      {error && <div className="alert alert-danger" style={{ marginTop: 8 }}>{error}</div>}
      {success && <div className="alert alert-success" style={{ marginTop: 8 }}>{success}</div>}
    </div>
  );
};

export default AvatarUploader;
