const APIError = require('../errors/APIError');

module.exports = function(error, req, res, next){
   if (error instanceof APIError){
    return res.status(error.status).json({message: error.message, errors: error.errors, fieldError: error.fieldError});
   }
   else {
      console.log(error);
      return res.status(500).json({message: 'Непредвиденная ошибка!'});
   }
}