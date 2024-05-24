const Router = require('express').Router;
const routes = require('./routes');

const appRouter = new Router();

routes.forEach(({url, router}) => {
   appRouter.use(url, router);
});

module.exports = appRouter;