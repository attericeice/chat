const {Sequelize} = require('sequelize');

const env = process.env.NODE_ENV || 'production';

const password = env === 'production' ? 'icedogdev1308' : 'root';

const user = env === 'production' ? 'icedog' : 'root';

console.log(user, password);

const sequelize = new Sequelize(
    'chat',
    user,
    password,
    {
        dialect: 'mysql',
        host: 'localhost',
        port: '3306',
    }
);


module.exports = sequelize;