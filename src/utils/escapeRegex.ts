/** Escapa los caracteres especiales de una expresión regular para usar texto literal en `$regex`. */
export const escapeRegex = (value: unknown) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
