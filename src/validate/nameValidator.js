const {body} = require('express-validator');

module.exports = function validateName(path = "name"){
  
    return body(path)
    .isLength({min: 2, max: 20})
    .withMessage('Имя пользователя должно находиться в пределах от 2 до 20 символов');
    
}