/**
 * fieldMapper.js — Converts between nested Mongoose-style objects and flat SQLite columns.
 *
 * Example:
 *   flattenObject({ personalInfo: { firstName: 'Juan' } })
 *     => { personal_info_first_name: 'Juan' }
 *
 *   unflattenRow({ personal_info_first_name: 'Juan' })
 *     => { personalInfo: { firstName: 'Juan' } }
 */

/**
 * Convert camelCase key to snake_case.
 */
export const camelToSnake = (str) =>
  str.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();

/**
 * Convert snake_case key to camelCase.
 */
export const snakeToCamel = (str) =>
  str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());

/**
 * Flatten a nested object into a single-level object with snake_case keys.
 * Arrays and Dates are preserved as-is.
 *
 * @param {Object} obj - The nested object
 * @param {string} [prefix=''] - Internal prefix for recursion
 * @returns {Object} Flat object
 */
export function flattenObject(obj, prefix = '') {
  const result = {};
  if (!obj || typeof obj !== 'object') return result;

  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = camelToSnake(key);
    const fullKey = prefix ? `${prefix}_${snakeKey}` : snakeKey;

    if (
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      !(value instanceof Date)
    ) {
      Object.assign(result, flattenObject(value, fullKey));
    } else {
      result[fullKey] = value;
    }
  }
  return result;
}

/**
 * Unflatten a flat SQLite row (snake_case keys) back into a nested object
 * with camelCase keys, matching Mongoose document structure.
 *
 * Known top-level nested groups are explicitly defined so we don't break
 * simple flat columns like "email" or "role".
 *
 * @param {Object} row - The flat row from SQLite
 * @returns {Object} Nested object matching Mongoose structure
 */
export function unflattenRow(row) {
  if (!row) return null;

  const result = {};

  // Known prefixes that map to nested sub-objects
  const nestedPrefixes = [
    'personal_info',
    'academic_profile',
    'tutor_profile',
    'student_profile',
    'advisor_profile',
    'communication_settings',
    'schedule',
    'rating',
    'submission',
    'feedback',
    'extension',
    'baseline_assessment',
    'final_assessment',
    'report_data',
    'delivery'
  ];

  for (const [key, value] of Object.entries(row)) {
    // Check if this key starts with a known nested prefix
    let matched = false;
    for (const prefix of nestedPrefixes) {
      if (key.startsWith(prefix + '_')) {
        const parentKey = snakeToCamel(prefix);
        const childKey = snakeToCamel(key.slice(prefix.length + 1));
        if (!result[parentKey]) result[parentKey] = {};
        result[parentKey][childKey] = value;
        matched = true;
        break;
      }
    }

    if (!matched) {
      // Direct top-level field
      const camelKey = snakeToCamel(key);
      result[camelKey] = value;
    }
  }

  // Handle boolean fields stored as INTEGER in SQLite
  const booleanFields = [
    'emailVerified', 'isPublished', 'isGroupSession', 'read',
    'clicked', 'allowResponse', 'isActive', 'completed'
  ];
  for (const field of booleanFields) {
    if (field in result) {
      result[field] = !!result[field];
    }
  }

  // Handle nested booleans
  if (result.communicationSettings) {
    const cs = result.communicationSettings;
    if ('allowNotifications' in cs) cs.allowNotifications = !!cs.allowNotifications;
    if ('emailNotifications' in cs) cs.emailNotifications = !!cs.emailNotifications;
  }
  if (result.tutorProfile) {
    const tp = result.tutorProfile;
    if ('available' in tp) tp.available = !!tp.available;
  }

  // Map 'id' to both 'id' and '_id' for backward compatibility
  if ('id' in result) {
    result._id = result.id;
  }

  return result;
}

/**
 * Convert a Mongoose-style update object (possibly nested) into flat SQLite columns.
 * Handles $unset by setting values to null.
 *
 * @param {Object} updateData - The update data, possibly with nested objects or $unset
 * @returns {Object} Flat update object for SQLite
 */
export function flattenUpdateData(updateData) {
  const flat = {};
  const unsetFields = {};

  for (const [key, value] of Object.entries(updateData)) {
    if (key === '$unset') {
      // $unset: { 'personalInfo.avatar': 1 } => { personal_info_avatar: null }
      for (const unsetKey of Object.keys(value)) {
        const parts = unsetKey.split('.');
        const snakeKey = parts.map(camelToSnake).join('_');
        unsetFields[snakeKey] = null;
      }
    } else if (key === '$addToSet' || key === '$push' || key === '$pull') {
      // These need special handling at the model level, skip here
      flat[key] = value;
    } else if (
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      !(value instanceof Date)
    ) {
      // Nested object — flatten with prefix
      const nested = flattenObject({ [key]: value });
      Object.assign(flat, nested);
    } else {
      const snakeKey = camelToSnake(key);
      flat[snakeKey] = value;
    }
  }

  Object.assign(flat, unsetFields);
  return flat;
}

/**
 * Convert a Mongoose-style filter to SQLite-compatible filter (snake_case keys).
 * Preserves operator objects ($gt, $lt, $or, etc.) but converts field names.
 *
 * @param {Object} filter - Mongoose-style filter
 * @returns {Object} SQLite-compatible filter
 */
export function convertFilter(filter) {
  if (!filter || typeof filter !== 'object') return filter;

  const result = {};
  for (const [key, value] of Object.entries(filter)) {
    // Preserve MongoDB operators
    if (key.startsWith('$')) {
      if (Array.isArray(value)) {
        result[key] = value.map(item =>
          typeof item === 'object' && item !== null ? convertFilter(item) : item
        );
      } else {
        result[key] = value;
      }
      continue;
    }

    // Convert dot notation: 'personalInfo.firstName' => 'personal_info_first_name'
    const snakeKey = key.split('.').map(camelToSnake).join('_');

    // Convert RegExp to $like
    if (value instanceof RegExp) {
      result[snakeKey] = { $like: `%${value.source}%` };
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Operator object like { $ne: 'deleted' } — convert inner keys if needed
      const converted = {};
      for (const [opKey, opVal] of Object.entries(value)) {
        converted[opKey] = opVal;
      }
      result[snakeKey] = converted;
    } else {
      result[snakeKey] = value;
    }
  }
  return result;
}

export default {
  flattenObject,
  unflattenRow,
  flattenUpdateData,
  convertFilter,
  camelToSnake,
  snakeToCamel
};
