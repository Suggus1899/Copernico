/**
 * Notification model wrapper for SQLite with delivery tracking.
 */

import BaseModel from '../BaseModel.js';

class NotificationModel extends BaseModel {
    constructor(adapter) {
        super('Notification', adapter);
    }

    /**
     * Record delivery of a notification.
     */
    async recordDelivery(notificationId, channel, status) {
        const now = new Date().toISOString();
        // Update the notification directly
        const updateData = {
            [`delivery_${channel}_status`]: status,
            [`delivery_${channel}_date`]: now
        };
        return this.findByIdAndUpdate(notificationId, updateData, { new: true });
    }

    /**
     * Mark a notification as read.
     */
    async markAsRead(notificationId) {
        return this.findByIdAndUpdate(notificationId, {
            read: 1,
            read_at: new Date().toISOString()
        }, { new: true });
    }

    /**
     * Mark all notifications for a user as read.
     */
    async markAllAsRead(userId) {
        return this.updateMany(
            { user_id: userId, read: 0 },
            { read: 1, read_at: new Date().toISOString() }
        );
    }

    /**
     * Get unread count for a user.
     */
    async getUnreadCount(userId) {
        return this.countDocuments({ user_id: userId, read: 0 });
    }

    /**
     * Record a click event.
     */
    async recordClick(notificationId) {
        return this.findByIdAndUpdate(notificationId, {
            clicked: 1,
            clicked_at: new Date().toISOString()
        }, { new: true });
    }
}

export default new NotificationModel();
