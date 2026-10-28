// Paginación acotada: evita páginas negativas y listados arbitrariamente grandes.
export const parsePagination = (query, defaultLimit, maxLimit) => {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, Number.parseInt(query.limit, 10) || defaultLimit));
  return { page, limit };
};
