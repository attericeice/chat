const jwt = require('jsonwebtoken');
const {Token} = require('../database/models');

class TokenService{
 static generateTokens(payload){
     const accessToken = jwt.sign(payload, process.env.JWT_ACCESS_KEY, {expiresIn: '30m'});
     const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_KEY, {expiresIn: '30d'});

     return {accessToken, refreshToken};
 }

 static async saveRefreshToken(userId, refreshToken){
    const tokenData = await Token.findOne({where: {userId}});

    if (tokenData){
        tokenData.refresh_token = refreshToken;
        return await tokenData.save();
    }

    const refresh_token = await Token.create({refresh_token: refreshToken, userId});

    return refresh_token;
 }

 static async removeToken(refreshToken){
    const deletedToken = await Token.destroy({where: {refresh_token: refreshToken}});
    return deletedToken;
 }
 
 static validateRefreshToken(refreshToken){
    try{
        const userPayload = jwt.verify(refreshToken, process.env.JWT_REFRESH_KEY);
        return userPayload;
    }
    catch(e){
        return null;
    }
 }

 static validateAccessToken(accessToken){
    try{
        const userPayload = jwt.verify(accessToken, process.env.JWT_ACCESS_KEY);
        return userPayload;
    }
    catch(e){
        return null;
    }
    
 }

static async findToken(token){
   const refreshToken = await Token.findOne({where: {refresh_token: token}});
   return refreshToken;
}
}

module.exports = TokenService;