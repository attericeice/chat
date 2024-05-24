require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const fileUploader = require('express-fileupload');
const compression = require('compression');
const models = require('./database/models');
const sequelize = require('./database/db');
const { Server } = require('socket.io');
const SocketService = require('./services/SocketService');
const errorHandler = require('./middlewares/ErrorMiddleware');
const appRouter = require('./router/index');
const path = require('path');
const app = express();

const API_URL = process.env.NODE_ENV === 'delevopment' ? 'http://localhost:3000' : 'http://79.174.92.167';


app.use(cors({
    credentials: true,
    origin: API_URL,
}));
app.use(express.json({limit: '10mb'}));
app.use(compression());
app.use(fileUploader({}));
app.use(cookieParser());
app.all('/media/*', (req, res, next) => {
  res.setHeader('Cache-Control', 'max-age=3600');
  next();
});
app.use('/media', express.static(path.resolve(__dirname, '..', 'media'), {maxAge: '1h'}));
app.use('/api', appRouter);
app.use(errorHandler);

const server = require('http').createServer(app);

const io = new Server(server, {
    cors: {
        origin: [API_URL],
        credentials: true,
    },
    maxHttpBufferSize: 1e8,
})

app.set('io', io);

async function start() {
    try{
        await sequelize.authenticate();
        await sequelize.sync();
        server.listen(7000, () => {
            console.log('Сервер работает на порту 7000');
        });
    }
    catch(e){
        console.log(e.message);
    }
} 

start();

const socket = new SocketService(io);

socket.initializeEvents();






