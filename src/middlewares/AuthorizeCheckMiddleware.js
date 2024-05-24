const APIError = require('../errors/APIError');
const TokenService = require('../services/TokenService');

module.exports = function(req, res, next){
    try{
       
        const authorizationHeader = req.headers.authorization;

        if (!authorizationHeader) return next(APIError.UnauthorizedError());

        const accessToken = authorizationHeader.split(' ')[1];

        if (!accessToken) return next(APIError.UnauthorizedError());

        const userData = TokenService.validateAccessToken(accessToken, 'jkdfldwdsk');

        if (!userData) return next(APIError.UnauthorizedError());

        req.currentUser = userData;

        next();
    }
    catch(e){
        return next(APIError.UnauthorizedError());
    }
   
}