/** bcrypt solo considera los primeros 72 bytes de la contraseña. */
export const PASSWORD_MAX_BYTES = 72;
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_POLICY_MESSAGE =
  'La contraseña debe tener entre 8 y 72 caracteres e incluir una minúscula, una mayúscula y un número.';

/** Devuelve true si la contraseña cumple la política mínima de la plataforma. */
export function isStrongPassword(password) {
  if (typeof password !== 'string') return false;
  if (password.length < PASSWORD_MIN_LENGTH) return false;
  if (Buffer.byteLength(password, 'utf8') > PASSWORD_MAX_BYTES) return false;
  return /[a-z]/.test(password) && /[A-Z]/.test(password) && /\d/.test(password);
}
