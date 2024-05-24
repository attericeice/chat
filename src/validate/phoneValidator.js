const { body } = require('express-validator');

module.exports = function validatePhone(path) {
    return body(path)
    .isLength(11)
    .withMessage('Номер телефона не должен быть короче 11 символов')
    .matches(/^((8|\+7)[\- ]?)(\(?\d{3}\)?[\- ]?)?[\d\- ]{7}$/)
    .withMessage('Некорректный номер телефона')
}