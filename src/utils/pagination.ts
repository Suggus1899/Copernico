// Paginación acotada: evita páginas negativas y listados arbitrariamente grandes.
export const parsePagination = (query: { page?: unknown; limit?: unknown }, defaultLimit: number, maxLimit: number) => {
  const page = Math.max(1, Number.parseInt(String(query.page), 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, Number.parseInt(String(query.limit), 10) || defaultLimit));
  return { page, limit };
};
