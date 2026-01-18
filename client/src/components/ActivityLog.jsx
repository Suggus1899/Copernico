import React, { useEffect, useState } from 'react';
import apiClient from '../utils/axiosConfig';

const ActivityLog = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiClient.get('/users/profile/activity', { params: { limit: 50 } });
        setItems(res.data?.data || []);
      } catch (_) {}
      setLoading(false);
    })();
  }, []);

  if (loading) return <div>Cargando actividad...</div>;

  return (
    <div>
      <h2>Actividad reciente</h2>
      {items.length === 0 && <div>No hay actividad registrada.</div>}
      {items.length > 0 && (
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Acción</th>
                <th>IP</th>
                <th>Agente</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i._id}>
                  <td>{new Date(i.createdAt).toLocaleString('es-ES')}</td>
                  <td>{i.action}</td>
                  <td>{i.ip || '-'}</td>
                  <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>{i.userAgent || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ActivityLog;
