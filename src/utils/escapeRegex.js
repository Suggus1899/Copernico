/** Escapa los caracteres especiales de una expresión regular para usar texto literal en `$regex`. */
export const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
