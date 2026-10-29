import axios from 'axios';
import type { ApiErrorResponse } from '../types/api';

// La API se llama en el mismo origen (/api): Vite lo reenvía en desarrollo y Vercel en producción.
// VITE_API_URL solo sirve si la API vive en otro origen (las cookies de sesión son de mismo sitio).
const apiClient = axios.create({
  baseURL: import.meta.env?.VITE_API_URL || '/api',
  withCredentials: true, // envía la cookie de sesión HttpOnly
  headers: { 'Content-Type': 'application/json' },
});

// Con FormData el navegador debe fijar el Content-Type con su boundary.
apiClient.interceptors.request.use((config) => {
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    config.headers.delete('Content-Type');
  }
  return config;
});

// Sesión caducada o revocada: volver al login. Otros 401 (p. ej. contraseña actual incorrecta)
// los muestra cada pantalla, porque el usuario sigue con sesión y debe poder corregir el formulario.
const SESSION_ERROR_CODES = ['UNAUTHENTICATED', 'SESSION_INVALID'];

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    const response = axios.isAxiosError<ApiErrorResponse>(error) ? error.response : undefined;
    const code = response?.data?.error?.code;
    const path = window.location.pathname;
    if (
      response?.status === 401 &&
      code !== undefined && SESSION_ERROR_CODES.includes(code) &&
      path !== '/login' &&
      path !== '/signup'
    ) {
      window.location.assign('/login');
    }
    return Promise.reject(error);
  }
);

export default apiClient;
