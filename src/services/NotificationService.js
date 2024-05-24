const { Notifications } = require('../database/models');
const { Op } = require('sequelize');

class NotificationService {
    static async getNotificationsCount(userId) {
        const notificationsCount = await Notifications.count({where: {userId}});
        return notificationsCount;
    }

    static async getNotifications(userId, page, sort) {
        
        const limit = 10;

        const notifications = await Notifications.findAndCountAll({
            where: {userId},
            limit,
            offset: limit * page,
            order: [['createdAt', sort]]
        });
        return notifications;
    }

    static async createNotification(data) {
        const newNotification = await Notifications.create({...data});
        return newNotification;
    }

    static async removeNotification(notificationsIds) {
        const removedNotification = await Notifications.destroy({where: {id: {[Op.in]: notificationsIds}}});
        return removedNotification;
    }
}

module.exports = NotificationService;