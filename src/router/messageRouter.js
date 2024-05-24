const Router = require('express').Router;
const MessageController = require('../controllers/MessageController');
const authCheck = require('../middlewares/AuthorizeCheckMiddleware');

const messageRouter = new Router();

messageRouter.get('/dialog/all', authCheck, MessageController.getDialogMessages);
messageRouter.get('/all', MessageController.getAll);

module.exports = messageRouter;