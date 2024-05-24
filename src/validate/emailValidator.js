const {body} = require('express-validator');

module.exports = function validateEmail(path = "email"){
  
    return body(path)
    .isEmail()
    .withMessage("Некорректный адрес электронной почты")
    .isLength({min: 6, max: 320})
    .withMessage("Длина пароля должна быть в пределах от 6 до 320 символов");
}