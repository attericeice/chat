const Router = require('express').Router;
const DialogController = require('../controllers/DialogController');
const AuthCheck = require('../middlewares/AuthorizeCheckMiddleware');

const dialogRouter = new Router();

dialogRouter.get('/user/:id', DialogController.getUserDialogs);
dialogRouter.post('/create/private', DialogController.createPrivateDialog);



module.exports = dialogRouter;