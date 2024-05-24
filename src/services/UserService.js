const { User, UserMedia, UserInformation, UserSettings, UsersInDialogs, Dialog, UserContacts, ContactRequests, Attachments, Message, BlackList } = require('../database/models');
const TokenService = require('./TokenService');
const FileService = require('../services/FileService');
const bcrypt = require('bcrypt');
const uuid = require('uuid');
const APIError = require('../errors/APIError');
const { Op, literal, NOW } = require('sequelize');

class UserService {
    static async registration(name, surname, password, email){
        const emailOccupied = await User.findOne({where: {email}});
        
        if (emailOccupied) throw APIError.badRequest(`Пользователь с почтовым адресом ${email} уже существует`);
    
        let options = {
          last_online: new Date(),
          status: 'online'
        };
    
        const hashPassword = await bcrypt.hash(password, 3);

        const link = uuid.v4();

        const avatar_img = FileService.generateUserAvatar(name, surname);
    
        options = {...options, link, name, surname, password: hashPassword, email, avatar_img};
    
        const user = await User.create(options);

        await UserMedia.create({type: 'image', src: avatar_img, isGenerated: true, userId: user.id, isAvatar: true});

        await UserSettings.create({userId: user.id});
    
        const userPayload = {email, name, id: user.id, surname};
    
        const tokens = TokenService.generateTokens(userPayload);
    
        await TokenService.saveRefreshToken(user.id, tokens.refreshToken);
    
        return {user: {...userPayload, avatar_img: user.avatar_img, link}, ...tokens};
     }

    static async login(email, password){
        const user = await User.findOne({where: {email}});
   
        if (!user) throw APIError.badRequest('Неверный адрес электронной почты', [], 'email');
   
        const isPasswordsEqual = await bcrypt.compare(password, user.password);
   
        if (!isPasswordsEqual) throw APIError.badRequest('Неверный пароль', [], 'password');
   
        const userPayload = {email, name: user.name, id: user.id, surname: user.surname};
   
   
        const tokens = TokenService.generateTokens(userPayload);
   
        await TokenService.saveRefreshToken(user.id, tokens.refreshToken);
   
        return {user: {...userPayload, avatar_img: user.avatar_img, link: user.link}, ...tokens};
    }

    static async logout(token){
        const refreshToken = await TokenService.removeToken(token);
        return refreshToken;
     }

    static async getOne(id){
        const user = await User.findOne({where: {id}});
        return user;
      }
     
    static async refresh(refreshToken){
     
        if (!refreshToken) throw APIError.UnauthorizedError();
     
        const tokenPayload = TokenService.validateRefreshToken(refreshToken);
     
        const tokenInDB = TokenService.findToken(refreshToken);
     
        if (!tokenInDB || !tokenPayload) throw APIError.UnauthorizedError();
     
        const user = await User.findOne({where: {id: tokenPayload.id}});
     
        const newPayload = {email: user.email, name: user.name, id: user.id, surname: user.surname};
     
        const tokens = TokenService.generateTokens(newPayload);
     
        await TokenService.saveRefreshToken(user.id, tokens.refreshToken);
     
        return {user: {...newPayload, avatar_img: user.avatar_img, link: user.link}, ...tokens};
    }

    static async getProfile(link, currentUserId) {
        
       const user = await User.findOne({where: {link}, attributes: ['id']});

       if (!user) return null;

       const userSettings = await UserSettings.findOne({where: {userId: user.id}});
       
       let userExclude = ['password'];

       let userInfoExclude = [];

       const contactStatus = await UserContacts.count({
        where: {
          [Op.or]: [
            {userId: currentUserId, contactId: user.id},
            {userId: user.id, contactId: currentUserId}
          ]
        }
      });

       if (userSettings) {
           if (userSettings.show_email === 'nobody') userExclude.push('email');
           if (userSettings.show_email === 'contacts only' && !contactStatus) userExclude.push('email');
           if (userSettings.show_number === 'nobody' && user.id !== currentUserId) userInfoExclude.push('phone');
           if (userSettings.show_number === 'contacts only' && !contactStatus && user.id !== currentUserId) userInfoExclude.push('phone');
       }

       const profile = await User.findOne({where: {id: user.id}, attributes: {exclude: userExclude},
       include: [
       {model: UserInformation, attributes: {exclude: userInfoExclude}},
       {model: UserMedia, required: false, order: [['isAvatar', 'DESC']]},
       {model: ContactRequests, as: 'sentRequest', where: {userId: currentUserId}, required: false},
       {model: ContactRequests, as: 'receiverRequest', where: {senderId: currentUserId}, required: false},
       {model: BlackList, required: false, as: 'blacklist_sender', where: {bannedId: currentUserId}},
       {model: BlackList, required: false, as: 'blacklist_banned', where: {senderId: currentUserId}},
       ]
      });
       
       if (profile.id !== currentUserId) {
        const dialog = await Dialog.findOne({
          where: {
            id: {
              [Op.in]: literal(`(
                SELECT DISTINCT dialogId
                FROM users_in_dialogs
                WHERE userId IN (${profile.id}, ${currentUserId})
                GROUP BY dialogId
                HAVING COUNT(DISTINCT userId) = 2
              )`),
            },
          },
        });
          profile.dataValues.dialog = dialog;
       }

      
       profile.dataValues.isContact = contactStatus ? true : false;

       profile.dataValues.user_media.sort((a, b) => b.isAvatar - a.isAvatar);

       return profile;
    }

    static async getSelfProfile(id) {
       const selfProfile = await User.findOne({where: {id}, include: [
        {model: UserInformation}
       ]});
       return selfProfile;
    }

    static async getUserLink(userId) {
       let link = await User.findOne({where: {id: userId}, attributes: ['link']});
       return link.link;
    }

    static async updateProfile(id, user, passwordData, user_information) {
      const updatingUser = await User.findOne({where: {id}});
      
      if (user.link !== updatingUser.link) {
        const existedLink = await User.count({where: {link: user.link}});
        if (existedLink) {
            throw APIError.badRequest('Эта ссылка уже занята', [], 'user.link');
        }
      }

      if (passwordData) {
         const {currentPassword, newPassword} = passwordData;
         const passwordIsValid = await bcrypt.compare(currentPassword, user.password);
         if (!passwordIsValid) {
          throw APIError.badRequest('Неверный пароль', [], 'password');
         }
         const hashPassword = await bcrypt.hash(newPassword, 3);
         updatingUser.password = hashPassword;
      }

      for (let key of Object.keys(user)) {
        updatingUser[key] = user[key];
      }
      await updatingUser.save();
      
      if (user_information) {
        let userInformation = await UserInformation.findOne({where: {userId: id}});
        let birthday = null;
        if (user_information.birthday) {
          birthday = new Date(user_information.birthday).toISOString();
        }
        if (!userInformation) {
          userInformation = await UserInformation.create({phone: user_information.phone, birthday, userId: id});
        }
        else {
          userInformation.birthday = birthday;
          userInformation.phone = user_information.phone;
          await userInformation.save();
        }
        updatingUser.dataValues.user_information = userInformation;
     }

      return updatingUser;
    }

    static async updateAvatar(id, img, filePath) {
      let blurhash;
      let avatar_img;
      const user = await User.findOne({where: {id}});
      const prevAvatar = await UserMedia.findOne({where: {userId: id, src: user.avatar_img, isAvatar: true}});
      if (prevAvatar) {
        if (prevAvatar.isGenerated) {
          FileService.deleteAttachment(prevAvatar.src);
          await prevAvatar.destroy();
        }
        else {
          prevAvatar.isAvatar = false;
          await prevAvatar.save();
        }
      }
       if (img) {
         [avatar_img, blurhash] = await FileService.uploadBlobData(img.data);
         user.avatar_img = avatar_img;
       }
       else {
         user.avatar_img = filePath;
         const attachment = await Attachments.findOne({where: {attachSrc: filePath}, attributes: ['blurhash']});
         if (attachment) {
           blurhash = attachment.blurhash;
         }
       }
       await user.save();
       const existedMedia = await UserMedia.findOne({where: {userId: user.id, src: user.avatar_img}});
       if (existedMedia) {
        existedMedia.isAvatar = true;
        await existedMedia.save();
       }
       else {
        await UserMedia.create({
          userId: user.id, 
          type: 'image', 
          src: user.avatar_img, 
          isAvatar: true, 
          isGenerated: false,
          blurhash
        });
       }
       return user.avatar_img;
    }

    static async updateBanner(id, bannerImage) {
      const user = await User.findOne({where: {id}});
      if (user.banner_img) {
        FileService.deleteAttachment(user.banner_img);
      }
      const [banner_img] = await FileService.uploadBlobData(bannerImage.data);
      user.banner_img = banner_img;
      await user.save();
      return banner_img;
    }

    static async getSelfSettings(id) {
      const settings = await UserSettings.findOne({where: {userId: id}});
      return settings;
    }

    static async updateSettings(id, updateData) {
      await UserSettings.update({...updateData}, {where: {id}});
      const updatedSettings = await UserSettings.findOne({where: {id}});
      return updatedSettings;
    }

    static async addMedia(media, mediaFile) {
      let mediaSource;
      let blurhash;
      let isAvatar = false;
      if (media.type === 'image') {
        [mediaSource, blurhash] = await FileService.uploadBlobData(mediaFile.data);
        const currentAvatar = await UserMedia.findOne({where: {isAvatar: true, isGenerated: true}});
        if (currentAvatar) {
          await currentAvatar.destroy();
          await User.update({avatar_img: mediaSource}, {where: {id: media.userId}});
          isAvatar = true;
        }
      }
      else {
         const videoInfo = await FileService.uploadAttachment(mediaFile.data);
         [mediaSource] = videoInfo[0];
      }
      const newMedia = await UserMedia.create({
        type: media.type, 
        src: mediaSource, 
        userId: media.userId, 
        isGenerated: false, 
        isAvatar,
        blurhash
      });
      return newMedia;
    }

    static async addFromAttachments(media) {
       const existedMedia = await UserMedia.count({where: {src: media.src, userId: media.userId}});
       if (existedMedia) {
        throw APIError.badRequest('Этот медиафайл уже есть в вашем списке');
       }
       const currentAvatar = await UserMedia.findOne({where: {isGenerated: true, isAvatar: true, userId: media.userId}});
       if (currentAvatar) {
         await currentAvatar.destroy();
         await User.update({avatar_img: media.src}, {where: {id: media.userId}})
         media.isAvatar = true;
       }
       const newMedia = await UserMedia.create({...media});
       return newMedia;
    }

    static async removeMedia(mediaId, source) {
       const attachmentCount = await Attachments.count({where: {attachSrc: source}});
       const mediaCount = await UserMedia.count({where: {src: source}});
       if (!attachmentCount && mediaCount <= 1) {
         FileService.deleteAttachment(source);
       }
       await UserMedia.destroy({where: {id: mediaId}});
    }

    static async getSelfMedia(userId) {
      const userMedia = await UserMedia.findAll({where: {userId, isAvatar: false, isGenerated: false}});
      return userMedia;
    }

    static async getProfileMedia(link, currentUserId) {
        const profileUser = await User.findOne({where: {link}, attributes: ['id']});
        const dialog = await Dialog.findOne({
          where: {
            id: {
              [Op.in]: literal(`(
                SELECT DISTINCT dialogId
                FROM users_in_dialogs
                WHERE userId IN (${currentUserId}, ${profileUser.id})
                GROUP BY dialogId
                HAVING COUNT(DISTINCT userId) = 2
              )`),
            },
          },
        });
           
        if (dialog) {
          const messages = await Message.findAll({where: {dialogId: dialog.id}, attributes: ['id'], include: [
            {model: Attachments, where: {type: {[Op.in]: ['image', 'video']}}}
            ]});
    
            const profileMedia = [];
    
            messages.forEach(message => {
              profileMedia.push(...message.attachments);
            });
    
            return profileMedia;
        }

        return [];
    }

    static async getProfileDocuments(link, currentUserId) {
      const profileUser = await User.findOne({where: {link}, attributes: ['id']});
      const dialog = await Dialog.findOne({
        where: {
          id: {
            [Op.in]: literal(`(
              SELECT DISTINCT dialogId
              FROM users_in_dialogs
              WHERE userId IN (${currentUserId}, ${profileUser.id})
              GROUP BY dialogId
              HAVING COUNT(DISTINCT userId) = 2
            )`),
          },
        },
      });
         
      if (dialog) {
        const messages = await Message.findAll({where: {dialogId: dialog.id}, attributes: ['id'], include: [
          {model: Attachments, where: {type: {[Op.in]: ['document']}}}
          ]});
    
          const profileDocuments = [];
    
          messages.forEach(message => {
            profileDocuments.push(...message.attachments);
          });
    
          return profileDocuments;
      }

      return [];
    }

    static async getProfileVoices(link, currentUserId) {
      const profileUser = await User.findOne({where: {link}, attributes: ['id']});
      const dialog = await Dialog.findOne({
        where: {
          id: {
            [Op.in]: literal(`(
              SELECT DISTINCT dialogId
              FROM users_in_dialogs
              WHERE userId IN (${currentUserId}, ${profileUser.id})
              GROUP BY dialogId
              HAVING COUNT(DISTINCT userId) = 2
            )`),
          },
        },
      });

      if (dialog) {
        const voiceMessages = await Message.findAll({where: {dialogId: dialog.id, type: 'voice'}, 
      include: [{model: User, attributes: ['id', 'name', 'surname', 'link', 'avatar_img']}]
      });
        return voiceMessages;
      }
      
      return [];
    }

    static async getUserStatusRecipients(userId) {
       const dialogsIds = await UsersInDialogs.findAll({where: {userId}, attributes: ['dialogId']});
       
       const dialogs = await UsersInDialogs.findAll({where: {
        dialogId: {[Op.in]: dialogsIds.map(d => d.dialogId)},
        userId: {[Op.not]: userId}
      }, include: [
      {model: User, attributes: ['link']}
      ]});
       

       const contacts = await UserContacts.findAll({where: {userId}, attributes: ['contactId']});

       return [
        dialogs.map(item => {
          const dialogId = item.dialogId;
          const link = item.user.link;
          return {dialogId, link};
        }),
        contacts.map(item => item.contactId)
      ];
    }

    static async updateUserStatus(userId, status) {
      const last_online = new Date().toISOString();
      await User.update({status, last_online}, {where: {id: userId}});
    }

    static async getBlackList(userId) {
       const blackList = await BlackList.findAll({where: {senderId: userId}, include: [
       {model: User, as: 'banned'}
       ]});
       return blackList;
    }

    static async removeFromBlackList(blackList) {
       await BlackList.destroy({where: {id: blackList.id}});
       const dialog = await Dialog.findOne({
        where: {
          id: {
            [Op.in]: literal(`(
              SELECT DISTINCT dialogId
              FROM users_in_dialogs
              WHERE userId IN (${blackList.senderId}, ${blackList.bannedId})
              GROUP BY dialogId
              HAVING COUNT(DISTINCT userId) = 2
            )`),
          },
        },
      });
       const userLinks = await User.findAll(
        {
        where: {id: {[Op.in]: [blackList.senderId, blackList.bannedId]}},
        attributes: ['id', 'link'],
      });
      
      let returnValue = [null, userLinks];
      if (dialog) {
        returnValue[0] = dialog;
      }
      return returnValue;
    }

    static async addToBlackList(senderId, bannedId) {
        await BlackList.create({senderId, bannedId});
        await UserContacts.destroy({
        where: {
        userId: {[Op.in]: [senderId, bannedId]}, 
        contactId: {[Op.in]: [senderId, bannedId]}
      }
    });
       await ContactRequests.destroy({
       where: {
       userId: {[Op.in]: [senderId, bannedId]},
       senderId: {[Op.in]: [senderId, bannedId]}
       }
       });

       const blacklist = await BlackList.findOne({where: {senderId, bannedId}, include: [
       {model: User, as: 'banned'}
       ]});

       const userLinks = await User.findAll({
        where: {id: {[Op.in]: [senderId, bannedId]}},
        attributes: ['id', 'link']
      });

       let returnValue = [null, userLinks, blacklist];

       const dialog = await Dialog.findOne({
        where: {
          id: {
            [Op.in]: literal(`(
              SELECT DISTINCT dialogId
              FROM users_in_dialogs
              WHERE userId IN (${senderId}, ${bannedId})
              GROUP BY dialogId
              HAVING COUNT(DISTINCT userId) = 2
            )`),
          },
        },
      });

      if (dialog) {
         returnValue[0] = dialog;
      }
      return returnValue;
    }
}

module.exports = UserService;