const UserService = require('../services/UserService');
const ContactService = require('../services/ContactService');
const APIError = require('../errors/APIError');
const { validationResult } = require('express-validator');


class UserController {
    static async registration(req, res, next) {
    try{
    const validationErrors = validationResult(req);
    if (!validationErrors.isEmpty()) {
      return next(APIError.badRequest('Некорректные данные', validationErrors.array()));
    }
    const {name, surname, email, password} = req.body;
    const userData = await UserService.registration(name, surname, password, email);
    res.cookie('refreshToken', userData.refreshToken, {maxAge: 30 * 24 * 60 * 60 * 1000, httpOnly: true});
    res.status(200).json(userData); 
    }
    catch(e){
    next(e);
    }
    }

    static async getOne(req, res, next){
        try{
         const id = req.params.id;
         const user = await UserService.getOne(id);
         res.status(200).json(user);
        }
        catch(e){
          next(e);
        }
     }
    static async login(req, res, next){
        try{
          const {email, password} = req.body;
          console.log("email: ", email);
          const userData = await UserService.login(email, password);
          res.cookie('refreshToken', userData.refreshToken, {maxAge: 30 * 24 * 60 * 60 * 1000, httpOnly: true});
          res.setHeader('Cache-Control', 'no-cache');
          res.status(200).json(userData);
        }
        catch(e){
          next(e);
        }
      }

      static async logout(req, res, next){
        try{
            const {refreshToken} = req.cookies;
            const token = await UserService.logout(refreshToken);
            res.clearCookie('refreshToken');
            res.status(200).json(token);
        }
        catch(e){
          next(e);
        }
      }

      static async refreshToken(req, res, next){
        try{
          const {refreshToken} = req.cookies;
  
          const userData = await UserService.refresh(refreshToken);
          res.cookie('refreshToken', userData.refreshToken, {maxAge: 30 * 24 * 60 * 60 * 1000, httpOnly: true})
          res.setHeader('Cache-Control', 'no-cache');
          res.status(200).json(userData);
        }
        catch(e){
          next(e);
        }
      }

      static async getProfile(req, res, next) {
        try {
           const { link } = req.params;
           const profileData = await UserService.getProfile(link, req.currentUser.id);
           res.status(200).json(profileData);
        }
        catch(e) {
          next(e);
        }
      }

      static async getProfileMedia(req, res, next) {
        try {
           const { id : currentUserId } = req.currentUser;
           const { link } = req.params;
           const profileMedia = await UserService.getProfileMedia(link, currentUserId);
           res.status(200).json(profileMedia);
        }
        catch(e) {
          next(e);
        }
      }

      static async getProfileDocuments(req, res, next) {
        try {
           const {id : currentUserId} = req.currentUser;
           const { link } = req.params;
           const profileDocuments = await UserService.getProfileDocuments(link, currentUserId);
           res.status(200).json(profileDocuments);
        }
        catch(e) {
          next(e);
        }
      }

      static async getProfileVoices(req, res, next) {
        try {
          const {id : currentUserId} = req.currentUser;
          const { link } = req.params;
          const profileVoices = await UserService.getProfileVoices(link, currentUserId);
          res.status(200).json(profileVoices);
        }
        catch(e) {
          next(e);
        }
      }

      static async getSelfRequests(req, res, next) {
        try {
          const { id } = req.params;
          const selfRequests = await ContactService.getSelfRequests(id);
          res.status(200).json(selfRequests);
        }
        catch(e) {
          next(e);
        }
      }

      static async getOtherRequests(req, res, next) {
        try {
          const {id} = req.params;
          const otherRequests = await ContactService.getOtherRequests(id);
          res.status(200).json(otherRequests);
        }
        catch(e) {
          next(e);
        }
      }

      static async getContacts(req, res, next) {
        try {
          const { id } = req.params;
          const contacts = await ContactService.getContacts(id);
          res.status(200).json(contacts);
        }
        catch(e) {
          next(e);
        }
      }

      static async getContactsSearch(req, res, next) {
        try {
           const { id, search } = req.params;
           const { page } = req.query;
           const searchUsers = await ContactService.getSearchUsers(id, search, page);
           res.status(200).json(searchUsers);
        }
        catch(e) {
          next(e);
        }
      }

      static async getSelfProfile(req, res, next) {
        try {
          const { id } = req.currentUser;
          const selfProfile = await UserService.getSelfProfile(id);
          res.status(200).json(selfProfile);
        }
        catch(e) {
          next(e);
        }
      }

      static async updateProfile(req, res, next) {
        try {
           const validationErrors = validationResult(req);
           if (!validationErrors.isEmpty()) {
             let errors = validationErrors.array();
             if (!req.body.passwordData && errors.some(error => error.path === 'passwordData.newPassword')) {
                errors = errors.filter(error => error.path !== 'passwordData.newPassword');
             } 
             if (req.body.user_information.phone === '' && errors.some(error => error.path === 'user_information.phone')) {
               errors = errors.filter(error => error.path !== 'user_information.phone');
             }
             if (errors.length > 0) throw APIError.badRequest('Некорректные данные', errors);
           }
           const { id } = req.currentUser;
           const { user, passwordData, user_information } = req.body;
           const newProfileData = await UserService.updateProfile(id, user, passwordData, user_information);
           res.status(200).json(newProfileData);
        }
        catch (e) {
          next(e);
        }
      }

      static async updateAvatar(req, res, next) {
        try {
         let img;
         const { id } = req.currentUser;
         const { imagePath } = req.body;
         if (req.files) {
          img = req.files.img;
         }
         const newAvatar = await UserService.updateAvatar(id, img, imagePath);
         res.status(200).json(newAvatar);
        }
        catch(e) {
          next(e);
        }
      }

      static async updateBanner(req, res, next) {
        try {
           const { id } = req.currentUser;
           const { bannerImage } = req.files;
           const newBanner = await UserService.updateBanner(id, bannerImage);
           res.status(200).json(newBanner);
        }
        catch(e) {
          next(e);
        }
      }

      static async getSelfSettings(req, res, next) {
        try {
           const { id } = req.currentUser;
           const settings = await UserService.getSelfSettings(id);
           res.status(200).json(settings);
        }
        catch(e) {
          next(e);
        }
      }

      static async updateSettings(req, res, next) {
        try {
          const { id } = req.currentUser;
          const updateData = req.body;
          const updatedSettings = await UserService.updateSettings(id, updateData);
          res.status(200).json(updatedSettings);
        }
        catch(e) {
          next(e);
        }
      }

      static async addMedia(req, res, next) {
        try {
          const media = req.body;
          const {media : mediaFile} = req.files;
          const newMedia = await UserService.addMedia(media, mediaFile);
          res.status(200).json(newMedia);
        }
        catch(e) {
          next(e);
        }
      }

      static async addMediaFromAttachments(req, res, next) {
        try {
          const media = req.body;
          const newMedia = await UserService.addFromAttachments(media);
          res.status(200).json(newMedia);
        }
        catch(e) {
          next(e);
        }
      }

      static async deleteMedia(req, res, next) {
        try {
           const { mediaId, userId, source } = req.query;
           await UserService.removeMedia(mediaId, source);
           res.status(200).json(mediaId);
        }
        catch(e) {
          next(e);
        }
      }

      static async getSelfMedia(req, res, next) {
        try {
          const { id } = req.currentUser;
          const userMedia = await UserService.getSelfMedia(id);
          res.status(200).json(userMedia);
        }
        catch(e) {
          next(e);
        }
      }

      static async getBlackList(req, res, next) {
        try {
          const { id } = req.currentUser;
          const blackList = await UserService.getBlackList(id);
          res.status(200).json(blackList);
        }
        catch(e) {
          next(e);
        }
      }
}

module.exports = UserController;