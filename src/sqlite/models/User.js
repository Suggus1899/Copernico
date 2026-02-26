/**
 * User model wrapper for SQLite with bcrypt hooks and response mapping.
 */

import bcrypt from 'bcryptjs';
import BaseModel from '../BaseModel.js';

const SALT_ROUNDS = 10;

class UserModel extends BaseModel {
    constructor(adapter) {
        super('User', adapter);
        this.defaultExclude = ['password', 'verification_token', 'password_reset_token'];
    }

    // ──────────────────────────── HOOKS ────────────────────────────

    async beforeCreate(data) {
        // Normalize email
        if (data.email) {
            data.email = data.email.trim().toLowerCase();
        }
        // Hash password
        if (data.password) {
            const salt = await bcrypt.genSalt(SALT_ROUNDS);
            data.password = await bcrypt.hash(data.password, salt);
        }
        // Set defaults
        if (!data.role) data.role = 'student';
        if (!data.status) data.status = 'active';
        if (data.login_attempts === undefined) data.login_attempts = 0;
        if (data.email_verified === undefined) data.email_verified = 0;
        return data;
    }

    async beforeUpdate(data) {
        // Re-hash password if being updated
        if (data.password && !data.password.startsWith('$2a$') && !data.password.startsWith('$2b$')) {
            const salt = await bcrypt.genSalt(SALT_ROUNDS);
            data.password = await bcrypt.hash(data.password, salt);
        }
        // Normalize email if being updated
        if (data.email) {
            data.email = data.email.trim().toLowerCase();
        }
        return data;
    }

    // ──────────────────────────── CUSTOM FINDERS ────────────────────────────

    async findByEmail(email) {
        return this.findOne({ email: email.trim().toLowerCase() });
    }

    async findByUsername(username) {
        return this.findOne({ personal_info_username: username });
    }

    /**
     * Find a user including the password field (for authentication).
     */
    async findOneWithPassword(filter) {
        const dbFilter = this.toDbFilter(filter);
        const row = await this.adapter.findOne(this.tableName, dbFilter);
        if (!row) return null;
        return this.toResponse(row);
    }

    /**
     * Find user by ID including the password field (for authentication).
     */
    async findByIdWithPassword(id) {
        const row = await this.adapter.findById(this.tableName, id);
        if (!row) return null;
        return this.toResponse(row);
    }

    /**
     * Find user by ID excluding sensitive fields.
     */
    async findByIdSafe(id) {
        const user = await this.findById(id);
        if (!user) return null;
        return this.stripSensitive(user);
    }

    // ──────────────────────────── INSTANCE METHODS ────────────────────────────

    /**
     * Compare a candidate password with a stored hash.
     */
    async comparePassword(candidatePassword, hashedPassword) {
        return bcrypt.compare(candidatePassword, hashedPassword);
    }

    // ──────────────────────────── RESPONSE HELPERS ────────────────────────────

    /**
     * Remove sensitive fields from a user response.
     */
    stripSensitive(user) {
        if (!user) return null;
        const result = { ...user };
        delete result.password;
        delete result.verificationToken;
        delete result.passwordResetToken;
        delete result.passwordResetExpires;
        delete result.verificationExpires;
        return result;
    }

    /**
     * Override findByIdAndUpdate to strip sensitive fields from response.
     */
    async findByIdAndUpdateSafe(id, data, options = {}) {
        const user = await this.findByIdAndUpdate(id, data, options);
        return this.stripSensitive(user);
    }
}

export default new UserModel();
