const {body} = require('express-validator');

module.exports = function validateLogin(path = "password"){
  
        return body(path)
          .notEmpty()
          .withMessage("Пароль не может быть пустым")
          .isLength({ min: 6 })
          .withMessage("Пароль не должен быть короче 6 символов")
          .isLength({ max: 128 })
          .withMessage("Пароль не должен быть длиннее 128 символов")
          .matches(/[A-Z]/g)
          .withMessage("Пароль должен содержать хотя бы один заглавный символ")
          .matches(/[a-z]/g)
          .withMessage("Пароль должен содержать хотя бы один строчный символ")
          .matches(/[0-9]/g)
          .withMessage("Пароль должен содержать хотя бы одну цифру")
          .not()
          .matches(/\s/g)
          .withMessage("Пароль не должен содержать символов пробела и пропуска строки")
          
    
}