/** Secciones del perfil que el propio usuario puede modificar. */
export const PROFILE_SECTIONS = [
  'personalInfo',
  'academicProfile',
  'studentProfile',
  'tutorProfile',
  'communicationSettings',
];

/**
 * Convierte un cuerpo ya validado en un `$set` con rutas puntuales ("seccion.campo").
 * Así se actualizan solo los campos enviados, sin reemplazar el subdocumento entero.
 */
export function buildProfileSet(body: Partial<Record<typeof PROFILE_SECTIONS[number], Record<string, unknown>>> = {}) {
  const set: Record<string, unknown> = {};
  for (const section of PROFILE_SECTIONS) {
    const values = body[section];
    if (!values) continue;
    for (const [field, value] of Object.entries(values)) {
      if (value !== undefined) set[`${section}.${field}`] = value;
    }
  }
  return set;
}
