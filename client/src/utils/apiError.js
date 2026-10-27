// Mensaje legible para mostrar al usuario a partir de un error de Axios.
// La API responde { success: false, error: { code, message, details? } }.
// En errores de validación (422) el detalle concreto va en details[].message.
export function getApiErrorMessage(error, fallback = 'Ha ocurrido un error. Inténtalo de nuevo.') {
  if (!error?.response) {
    return 'No se pudo conectar con el servidor. Comprueba tu conexión.';
  }
  const apiError = error.response.data?.error;
  const detail = Array.isArray(apiError?.details)
    ? apiError.details.find((item) => typeof item?.message === 'string')?.message
    : undefined;
  return detail || apiError?.message || fallback;
}
