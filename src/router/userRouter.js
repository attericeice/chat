const Router = require('express').Router;
const UserController = require('../controllers/UserController');
const checkEmail = require('../validate/emailValidator');
const checkSurname = require('../validate/surnameValidator');
const checkPassword = require('../validate/PasswordValidator');
const checkName = require('../validate/nameValidator');
const checkPhone = require('../validate/phoneValidator');
const authCheck = require('../middlewares/AuthorizeCheckMiddleware');

const userRouter = new Router();

userRouter.get('/profile/:link', authCheck, UserController.getProfile);
userRouter.get('/profile/:link/media', authCheck, UserController.getProfileMedia);
userRouter.get('/profile/:link/documents', authCheck, UserController.getProfileDocuments);
userRouter.get('/profile/:link/voices', authCheck, UserController.getProfileVoices);
userRouter.get('/settings/profile', authCheck, UserController.getSelfProfile);
userRouter.get('/settings/self', authCheck, UserController.getSelfSettings);
userRouter.get('/media/self', authCheck, UserController.getSelfMedia);
userRouter.get('/blacklist/self', authCheck, UserController.getBlackList);
userRouter.get('/token/refresh', UserController.refreshToken);
userRouter.get('/:id/contacts', UserController.getContacts);
userRouter.get('/:id/contact_requests/self', UserController.getSelfRequests);
userRouter.get('/:id/contact_requests/other', UserController.getOtherRequests);
userRouter.get('/:id/contacts/search/:search', UserController.getContactsSearch);
userRouter.post('/logout', UserController.logout);
userRouter.post('/login', UserController.login);
userRouter.post('/registration', checkEmail(), checkPassword(), checkName(), checkSurname(), UserController.registration);
userRouter.post('/media/add', authCheck, UserController.addMedia);
userRouter.post('/media/add-from-attachments', authCheck, UserController.addMediaFromAttachments);
userRouter.put('/settings/profile/update', 
authCheck, 
checkEmail('user.email'), 
checkPassword("passwordData.newPassword"), 
checkName("user.name"), 
checkSurname("user.surname"), 
checkPhone("user_information.phone"), 
UserController.updateProfile);
userRouter.put('/avatar/update', authCheck, UserController.updateAvatar);
userRouter.put('/banner/update', authCheck, UserController.updateBanner);
userRouter.put('/settings/update', authCheck, UserController.updateSettings);
userRouter.delete('/media/delete', authCheck, UserController.deleteMedia);




module.exports = userRouter;
