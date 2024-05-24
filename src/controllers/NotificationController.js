const NotificationService = require('../services/NotificationService');

class NotificationController {
    
    static async getNotificationsCount(req, res, next) {
        try {
            const { id } = req.params;
            const notificationsCount = await NotificationService.getNotificationsCount(id);
            res.status(200).json(notificationsCount);
        }
        catch(e) {
            next(e);
        }
    }

    static async getNotifications(req, res, next) {
        try {
            const { id } = req.params;
            const { page, sort } = req.query;
            const notifications = await NotificationService.getNotifications(id, page, sort);
            res.status(200).json(notifications);
        }
        catch(e) {
            next(e);
        }
    }
}

module.exports = NotificationController;