import axios from 'axios';

// Configurar la URL base de la API
// Preferir VITE_API_URL. En Docker: VITE_API_URL="http://api:4000/api"; en local: "http://localhost:4002/api"
const API_BASE_URL = import.meta.env?.VITE_API_URL || 'http://localhost:4002/api';

console.log('🔧 API Configuration:', {
  'import.meta.env.VITE_API_URL': import.meta.env?.VITE_API_URL,
  'API_BASE_URL': API_BASE_URL,
  'All env vars': import.meta.env,
  timestamp: new Date().toISOString()
});

// FORZAR el puerto correcto si detectamos 4000
const CORRECTED_BASE_URL = API_BASE_URL.replace(':4000/', ':4002/');
console.log('🔧 Corrected URL:', CORRECTED_BASE_URL);

// Crear instancia de axios con configuración base
const apiClient = axios.create({
  baseURL: CORRECTED_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar el token de autenticación a todas las peticiones
apiClient.interceptors.request.use(
  (config) => {
    // Si se envía FormData, permitir que el navegador establezca el Content-Type con boundary
    if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
      if (config.headers) {
        delete config.headers['Content-Type'];
        if (config.headers.common) {
          delete config.headers.common['Content-Type'];
        }
      }
    }

    // Proteger uso de localStorage en entornos no-browser
    const rawToken = typeof window !== 'undefined' && typeof localStorage !== 'undefined'
      ? localStorage.getItem('token')
      : null;
    const token = rawToken?.trim();
    if (token) {
      // Agregar token en el header Authorization (formato Bearer)
      config.headers.Authorization = `Bearer ${token}`;
      // También agregar en auth-token para compatibilidad
      config.headers['auth-token'] = token;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar respuestas y errores
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Si el token es inválido o expiró, redirigir al login
    if (error.response?.status === 401) {
      // Limpiar token inválido
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        localStorage.removeItem('token');
      }

      // Redirigir al login solo si no estamos ya en la página de login
      if (typeof window !== 'undefined') {
        const path = window.location.pathname;
        if (path !== '/login' && path !== '/signup') {
          window.location.href = '/login';
        }
      }
    }

    // Manejo de 403 (falta de permisos): no redirigir, pero informar
    if (error.response?.status === 403) {
      // Opcional: podrías mostrar una notificación UI aquí
      // console.warn('Acceso denegado: permisos insuficientes');
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;
