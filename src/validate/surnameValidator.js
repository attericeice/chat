const { body, check } = require('express-validator');



module.exports = function validateSurname(path = "surname") {
    return body(path)
    .notEmpty()
    .withMessage('Пожалуйста, укажите фамилию')
    .isLength({min: 2})
    .withMessage('Фамилия не может быть короче 2 символов')
}

