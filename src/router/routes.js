const dialogRouter = require('./dialogRouter');
const messageRouter = require('./messageRouter');
const userRouter = require('./userRouter');
const notificationRouter = require('./notificationRouter');


const routes = [
    {url: '/users', router: userRouter},
    {url: '/dialogs', router: dialogRouter},
    {url: '/messages', router: messageRouter},
    {url: '/notifications', router: notificationRouter}
]

module.exports = routes;