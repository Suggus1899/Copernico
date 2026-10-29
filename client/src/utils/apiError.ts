// La API responde { success: false, error: { code, message, details? } }.
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function getApiErrorMessage(error: unknown, fallback = 'Ha ocurrido un error. Inténtalo de nuevo.'): string {
  if (!isRecord(error) || !isRecord(error.response)) {
    return 'No se pudo conectar con el servidor. Comprueba tu conexión.';
  }
  const data = error.response.data;
  const apiError = isRecord(data) && isRecord(data.error) ? data.error : undefined;
  const detail = Array.isArray(apiError?.details)
    ? apiError.details.find((item: unknown) => isRecord(item) && typeof item.message === 'string')
    : undefined;
  return (isRecord(detail) && typeof detail.message === 'string' && detail.message) ||
    (typeof apiError?.message === 'string' && apiError.message) || fallback;
}
