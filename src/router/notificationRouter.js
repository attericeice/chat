const Router = require('express').Router;
const NotificationController = require('../controllers/NotificationController');

const notificationRouter = new Router();

notificationRouter.get('/user/:id', NotificationController.getNotifications);
notificationRouter.get('/user/:id/count', NotificationController.getNotificationsCount);


module.exports = notificationRouter;